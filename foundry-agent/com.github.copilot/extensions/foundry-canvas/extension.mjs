import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, joinSession } from "@github/copilot-sdk/extension";
import { startCliBridge } from "./cli-bridge.mjs";

const extensionRoot = dirname(fileURLToPath(import.meta.url));
const assetRoot = join(extensionRoot, "public");
const indexPath = join(assetRoot, "index.html");
const maxRequestBodyBytes = 2 * 1024 * 1024;
const contentTypes = new Map([
    [".css", "text/css; charset=utf-8"],
    [".html", "text/html; charset=utf-8"],
    [".ico", "image/x-icon"],
    [".js", "text/javascript; charset=utf-8"],
    [".json", "application/json; charset=utf-8"],
    [".svg", "image/svg+xml"],
    [".woff", "font/woff"],
    [".woff2", "font/woff2"],
    [".ttf", "font/ttf"],
]);

let serverState;
let serverPromise;

function setCommonHeaders(response) {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Content-Type-Options", "nosniff");
}

function sendJson(response, status, value) {
    const body = Buffer.from(JSON.stringify(value));
    response.statusCode = status;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Content-Length", body.length);
    setCommonHeaders(response);
    response.end(body);
}

async function readRequestBody(request) {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
        size += chunk.length;
        if (size > maxRequestBodyBytes) {
            throw new Error("The request body is too large.");
        }
        chunks.push(chunk);
    }
    return chunks.length ? Buffer.concat(chunks) : undefined;
}

function safeAssetPath(pathname) {
    const decoded = decodeURIComponent(pathname);
    const requested = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
    const candidate = resolve(assetRoot, requested);
    const assetRelativePath = relative(assetRoot, candidate);
    if (
        assetRelativePath === ".."
        || assetRelativePath.startsWith(`..${sep}`)
        || resolve(candidate) === resolve(assetRoot)
    ) {
        throw new Error("Invalid asset path.");
    }
    return candidate;
}

async function serveAsset(request, response, requestUrl) {
    if (request.method !== "GET" && request.method !== "HEAD") {
        sendJson(response, 405, {
            error: { code: "method_not_allowed", message: "Method not allowed." },
        });
        return;
    }
    let path;
    try {
        path = safeAssetPath(requestUrl.pathname);
    } catch (error) {
        sendJson(response, 400, {
            error: { code: "invalid_asset_path", message: error.message },
        });
        return;
    }
    try {
        const info = await stat(path);
        if (info.isDirectory()) {
            path = join(path, "index.html");
        }
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
        if (extname(requestUrl.pathname)) {
            sendJson(response, 404, {
                error: { code: "asset_not_found", message: "Asset not found." },
            });
            return;
        }
        path = indexPath;
    }
    let body = await readFile(path);
    const styleNonce = extname(path).toLowerCase() === ".html"
        ? randomBytes(16).toString("base64") : undefined;
    if (styleNonce) {
        const html = body.toString("utf8");
        if (!html.includes("</head>")) {
            throw new Error("Canvas HTML is missing its document head.");
        }
        body = Buffer.from(html.replace(
            "</head>",
            `<meta name="foundryx-style-nonce" content="${styleNonce}"></head>`,
        ));
    }
    response.statusCode = 200;
    response.setHeader(
        "Content-Type",
        contentTypes.get(extname(path).toLowerCase()) || "application/octet-stream",
    );
    response.setHeader("Content-Length", body.length);
    response.setHeader(
        "Content-Security-Policy",
        `default-src 'self'; script-src 'self'; style-src 'self'${styleNonce ? ` 'nonce-${styleNonce}'` : ""}; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'`,
    );
    setCommonHeaders(response);
    response.end(request.method === "HEAD" ? undefined : body);
}

async function handleRequest(request, response, runtimeConfig) {
    const origin = `http://localhost:${request.socket.localPort}`;
    const requestUrl = new URL(request.url || "/", origin);
    const isPrivatePath = requestUrl.pathname === "/config.json"
        || requestUrl.pathname === "/health"
        || requestUrl.pathname === "/publish"
        || /^\/(?:api|auth)(?:\/|$)/.test(requestUrl.pathname);
    // The app embeds a cross-site document; that document's fetches stay same-origin.
    const isPageNavigation = !isPrivatePath && request.method === "GET"
        && request.headers["sec-fetch-mode"] === "navigate"
        && ["document", "iframe", "frame"].includes(request.headers["sec-fetch-dest"]);
    if (request.headers.host !== new URL(origin).host || requestUrl.origin !== origin
        || (request.headers.origin && request.headers.origin !== origin)
        || (request.headers["sec-fetch-site"] === "cross-site" && !isPageNavigation)) {
        sendJson(response, 403, { error: { code: "invalid_origin", message: "Canvas requests must come from this local portal." } });
        return;
    }
    if (requestUrl.pathname === "/health") {
        if (request.method !== "GET") {
            sendJson(response, 405, { error: { code: "method_not_allowed", message: "Method not allowed." } });
            return;
        }
        sendJson(response, 200, { status: "ok" });
        return;
    }
    if (requestUrl.pathname === "/config.json") {
        if (request.method !== "GET") {
            sendJson(response, 405, { error: { code: "method_not_allowed", message: "Method not allowed." } });
            return;
        }
        const config = await runtimeConfig.bridge.request({ action: "config" });
        sendJson(response, config.status, config.status === 200
            ? { ...config.data, canvasToken: runtimeConfig.canvasToken } : config.data);
        return;
    }
    if (requestUrl.pathname.startsWith("/api/") || requestUrl.pathname.startsWith("/auth/")
        || requestUrl.pathname === "/publish") {
        const token = request.headers["x-foundryx-canvas"];
        if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)
            || !timingSafeEqual(Buffer.from(token), Buffer.from(runtimeConfig.canvasToken))) {
            sendJson(response, 403, { error: { code: "invalid_canvas_token", message: "Reload the canvas before continuing." } });
            return;
        }
        const action = requestUrl.pathname === "/publish" ? "publish" : new Map([
            ["/auth/status", "status"], ["/auth/login", "login"], ["/auth/logout", "logout"],
        ]).get(requestUrl.pathname);
        if ((requestUrl.pathname.startsWith("/auth/") || action === "publish")
            && (!action || request.method !== "POST")) {
            sendJson(response, 405, { error: { code: "method_not_allowed", message: "Method not allowed." } });
            return;
        }
        const raw = request.method === "GET" ? undefined : await readRequestBody(request);
        let body;
        if (raw?.length) {
            if (!request.headers["content-type"]?.startsWith("application/json")) {
                sendJson(response, 415, { error: { code: "invalid_content_type", message: "JSON is required." } });
                return;
            }
            try { body = JSON.parse(raw.toString("utf8")); }
            catch {
                sendJson(response, 400, { error: { code: "invalid_json", message: "Invalid JSON request." } });
                return;
            }
        }
        const result = await runtimeConfig.bridge.request({
            action: action || "request",
            session: request.headers["x-foundryx-session"],
            path: `${requestUrl.pathname}${requestUrl.search}`,
            method: request.method,
            body,
        });
        sendJson(response, result.status, result.data);
        return;
    }
    await serveAsset(request, response, requestUrl);
}

function preferredPort() {
    const digest = createHash("sha256").update(extensionRoot).digest();
    return 43000 + (digest.readUInt16BE(0) % 1000);
}

async function listen(server) {
    const firstPort = preferredPort();
    for (let offset = 0; offset < 20; offset += 1) {
        const port = 43000 + ((firstPort - 43000 + offset) % 1000);
        try {
            await new Promise((resolveListen, rejectListen) => {
                const onError = (error) => {
                    server.off("listening", onListening);
                    rejectListen(error);
                };
                const onListening = () => {
                    server.off("error", onError);
                    resolveListen();
                };
                server.once("error", onError);
                server.once("listening", onListening);
                server.listen(port, "127.0.0.1");
            });
            return port;
        } catch (error) {
            if (error.code !== "EADDRINUSE") {
                throw error;
            }
        }
    }
    throw new Error("No FoundryX canvas loopback port is available.");
}

async function ensureServer() {
    if (serverState) {
        return serverState;
    }
    if (!serverPromise) {
        serverPromise = (async () => {
            await stat(indexPath);
            const bridge = await startCliBridge();
            const runtimeConfig = { bridge, canvasToken: randomBytes(32).toString("hex") };
            const server = createServer((request, response) => {
                handleRequest(request, response, runtimeConfig).catch((error) => {
                    if (!response.headersSent) {
                        sendJson(response, 500, {
                            error: {
                                code: "canvas_server_error",
                                message: `The FoundryX canvas server failed: ${error.message}`,
                            },
                        });
                    } else {
                        response.destroy(error);
                    }
                });
            });
            let port;
            try { port = await listen(server); }
            catch (error) { bridge.close(); throw error; }
            server.on("close", () => bridge.close());
            serverState = {
                server,
                url: `http://localhost:${port}/`,
            };
            return serverState;
        })().catch((error) => {
            serverPromise = undefined;
            throw error;
        });
    }
    return serverPromise;
}

await joinSession({
    canvases: [
        createCanvas({
            id: "foundryx-canvas",
            displayName: "FoundryX Canvas (Preview)",
            description:
                "List and publish Agents managed through FoundryX using the installed foundryx CLI. Use only for an explicit FoundryX canvas or Agent request, or an established /foundry-agent workflow. Do not select for generic Microsoft Foundry or azd Agent workflows.",
            open: async () => {
                const entry = await ensureServer();
                return {
                    title: "FoundryX Agents",
                    status: "Shared CLI account; sign-in opens in your system browser",
                    url: `${entry.url}?open=${randomBytes(8).toString("hex")}`,
                };
            },
        }),
    ],
});
