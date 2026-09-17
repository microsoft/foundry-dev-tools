// @ts-check
/**
 * Generate samples/hosted-agent/sample-catalog.json from the foundry-samples repository.
 *
 * Walks the hosted-agents tree in microsoft-foundry/foundry-samples once via
 * the git-tree API, parses each sample's azure.yaml (the azd service
 * manifest) for protocol and model requirements, derives displayName from the
 * directory name, and — when AZURE_OPENAI_* secrets are set — fills the
 * description with a short LLM-generated sentence sourced from the sample's
 * README.md.
 *
 * Usage:
 *   node generate_sample_catalog.mjs <commitSha>
 *   node generate_sample_catalog.mjs --from-existing
 *
 * Environment variables:
 *   GITHUB_TOKEN        Optional GitHub token for API authentication.
 *   REPO_ROOT           Repository root (defaults to two levels up from this script).
 *   SAMPLES_REPO_URL    Source repo URL (defaults to https://github.com/microsoft-foundry/foundry-samples/).
 *   AZURE_OPENAI_*      Optional; when set, descriptions are LLM-generated.
 */

import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeCatalogWithCards } from './sample_catalog_cards.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REPO_ROOT = process.env.REPO_ROOT || resolve(__dirname, '..', '..');
const SAMPLES_REPO_URL = process.env.SAMPLES_REPO_URL || 'https://github.com/microsoft-foundry/foundry-samples/';
const SAMPLES_REPO_API = 'https://api.github.com/repos/microsoft-foundry/foundry-samples';
const OUTPUT_PATH = join(REPO_ROOT, 'samples', 'hosted-agent', 'sample-catalog.json');
const OVERRIDES_PATH = join(REPO_ROOT, 'samples', 'hosted-agent', 'sample-overrides.json');
const CARDS_PATH = join(REPO_ROOT, 'samples', 'hosted-agent', 'sample-cards.json');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

// Languages, frameworks, and protocols are discovered dynamically from the
// samples repo tree (see discoverLanguagesAndFrameworks / parseAzureYaml)
// instead of being restricted by an allowlist. These blacklists are the
// explicit escape hatch to exclude a specific discovered value; empty by
// default means "no restriction" — everything discovered is kept.
/** @type {string[]} */
const BLOCKED_LANGUAGES = [];
/** @type {string[]} */
const BLOCKED_FRAMEWORKS = [];
/** @type {string[]} */
const BLOCKED_PROTOCOLS = [];

/** @type {Record<string, {title: string, placeholder: string, options: Record<string, string>}>} */
const DIMENSION_DEFAULTS = {
    language: {
        title: 'Select a Language',
        placeholder: 'Choose the language for your agent',
        options: {
            python: 'Python',
            csharp: 'C# (.NET)',
        },
    },
    framework: {
        title: 'Select a Framework',
        placeholder: 'Choose the framework for your agent',
        // Insertion order here drives the option order in the generated catalog
        // (see buildDimensions). Keep the most actively promoted framework first.
        options: {
            'copilot-sdk': 'Copilot SDK',
            'agent-framework': 'Agent Framework',
            'bring-your-own': 'Bring Your Own',
            'langgraph': 'LangGraph',
        },
    },
    protocol: {
        title: 'Select a Protocol',
        placeholder: 'Choose the protocol for your agent',
        // Only special-cased ids need an entry here (ordering + custom label);
        // any other id is auto-formatted by titleCaseId (e.g. `activity` ->
        // `Activity`), so a newly declared protocol needs no code change.
        options: {
            responses: 'Responses',
            invocations: 'Invocations',
            invocations_ws: 'Invocations (WebSocket)',
        },
    },
};

const TEMPLATE_SELECTION = {
    title: 'Select a Template',
    placeholder: 'Choose a template for your agent',
};

// Sample paths pinned to the top of the gallery, in display order. Curated by
// PM — the framework-level "hello world" and most-requested samples. These are
// moved to the front of the generated `templates` array by reorderPinnedFirst
// (a pin with no matching scanned template is skipped with a warning). The
// generated `templates` order IS the gallery order — the VS Code webview renders
// it as-is, with no client-side pinning.
/** @type {string[]} */
const PINNED_TEMPLATE_PATHS = [
    // Framework-level hello world samples
    'samples/python/hosted-agents/agent-framework/responses/01-basic', // MAF Hello World (Python, Responses)
    'samples/python/hosted-agents/bring-your-own/invocations/github-copilot', // Copilot SDK
    'samples/python/hosted-agents/langgraph/responses/01-langgraph-chat', // LangGraph Chat (Responses)
    // Most requested: Toolbox, MCP, Workflow, BYO samples
    'samples/python/hosted-agents/langgraph/responses/02-langgraph-toolbox', // LG Foundry Toolbox (Responses)
    'samples/python/hosted-agents/agent-framework/responses/04-foundry-toolbox', // MAF Foundry Toolbox
    'samples/python/hosted-agents/agent-framework/responses/05-workflows', // MAF Workflows
    'samples/python/hosted-agents/langgraph/responses/05-workflows', // LG Workflows
    'samples/python/hosted-agents/agent-framework/responses/11-azure-search-rag', // MAF Azure Search RAG
    'samples/python/hosted-agents/bring-your-own/invocations/claude-agent-sdk', // BYO Claude Agent SDK
    'samples/python/hosted-agents/bring-your-own/responses/openai-agents-sdk', // BYO OpenAI Agent SDK
];

// Path segments must be alphanumeric, hyphens, underscores, or dots
const SAFE_PATH_SEGMENT = /^[a-zA-Z0-9._-]+$/;

// Category segments to EXCLUDE at the position immediately under a framework
// (`<framework>/<category>/...`). This is a BLACK-LIST: empty by default means
// every discovered category is surfaced; add a segment here to drop an upstream
// grouping you don't want in the picker yet. Flat templates that sit directly
// under a framework (e.g. csharp `agent-framework/hello-world`) have no category
// segment and are always surfaced (see findTemplateDirsUnder).
/** @type {Set<string>} */
const BLOCKED_CATEGORY_SEGMENTS = new Set();

// De-dupes the per-category "skipped" log line so an excluded category that
// spans many templates is reported once, not once per template.
/** @type {Set<string>} */
const skippedCategoriesLogged = new Set();

/**
 * Collected anomaly messages surfaced in CI step summary so reviewers do not
 * silently merge a catalog with missing/derived data. Always populated, even
 * when running locally without a step-summary file.
 * @type {string[]}
 */
const warnings = [];

/**
 * Record a warning that should appear in the CI step summary, and mirror it
 * to stderr for live log visibility.
 * @param {string} message
 */
function warn(message) {
    warnings.push(message);
    console.warn(`WARN: ${message}`);
}

/**
 * HTTP error carrying the response status so callers can distinguish a
 * genuine 404 (resource does not exist) from a transient failure
 * (429 rate-limit / 5xx) that is worth retrying and must NOT be silently
 * treated as "missing".
 */
class HttpError extends Error {
    /**
     * @param {number} status
     * @param {string} url
     */
    constructor(status, url) {
        super(`HTTP ${status} for ${url}`);
        this.name = 'HttpError';
        this.status = status;
    }
}

// Retry knobs for the raw.githubusercontent.com / GitHub API fetches. These
// endpoints rate-limit (429) and occasionally 5xx under the ~90-request
// serial scan, which previously surfaced as random "missing" templates when
// the error was swallowed. Retry transient failures with exponential backoff
// (plus jitter, and honoring a server `Retry-After`) before giving up.
// Overridable via env for local debugging.
const FETCH_MAX_ATTEMPTS = Number(process.env.FETCH_MAX_ATTEMPTS) || 4;
const FETCH_BASE_DELAY_MS = Number(process.env.FETCH_BASE_DELAY_MS) || 500;
// Cap a single wait so a large server `Retry-After` (GitHub can return tens of
// seconds) cannot stall one request indefinitely.
const FETCH_MAX_DELAY_MS = Number(process.env.FETCH_MAX_DELAY_MS) || 20_000;
// Cap the cumulative time spent sleeping across ALL requests. Without this,
// many requests each hitting the rate limit could sum to more than the job
// timeout; once exceeded, retries stop and the run fails fast (and loudly)
// rather than hanging.
const FETCH_TOTAL_BACKOFF_BUDGET_MS = Number(process.env.FETCH_TOTAL_BACKOFF_BUDGET_MS) || 120_000;

// Running total of time spent in backoff sleeps, enforced against
// FETCH_TOTAL_BACKOFF_BUDGET_MS.
let totalBackoffMs = 0;

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A failure is transient (worth retrying) when it is a network-level error
 * (no HttpError status, e.g. ECONNRESET / socket timeout) or an HTTP 429 /
 * 5xx. A 4xx other than 429 (notably 404) is permanent and not retried.
 * @param {unknown} error
 * @returns {boolean}
 */
function isTransientError(error) {
    if (error instanceof HttpError) {
        return error.status === 429 || error.status >= 500;
    }
    return true;
}

/**
 * Parse a `Retry-After` header (RFC 7231): either delay-seconds or an HTTP
 * date. Returns the delay in milliseconds, or `undefined` when absent or
 * unparseable. When a server tells us how long to wait, we honor it instead
 * of our own exponential backoff — but still clamp it to FETCH_MAX_DELAY_MS.
 * @param {Response} response
 * @returns {number | undefined}
 */
function parseRetryAfterMs(response) {
    const value = response.headers.get('retry-after');
    if (!value) {
        return undefined;
    }
    const seconds = Number(value);
    if (Number.isFinite(seconds)) {
        return Math.max(0, seconds * 1000);
    }
    const dateMs = Date.parse(value);
    if (!Number.isNaN(dateMs)) {
        return Math.max(0, dateMs - Date.now());
    }
    return undefined;
}

/**
 * Compute the backoff for a given attempt: prefer the server's `Retry-After`
 * when present, otherwise exponential backoff with full jitter
 * (`random * base * 2^(n-1)`), which AWS recommends to avoid synchronized
 * retry storms. Either way the result is clamped to FETCH_MAX_DELAY_MS.
 * @param {number} attempt 1-based attempt number that just failed.
 * @param {number | undefined} retryAfterMs
 * @returns {number}
 */
function computeBackoffMs(attempt, retryAfterMs) {
    if (retryAfterMs !== undefined) {
        return Math.min(retryAfterMs, FETCH_MAX_DELAY_MS);
    }
    const ceiling = FETCH_BASE_DELAY_MS * 2 ** (attempt - 1);
    const jittered = Math.random() * ceiling;
    return Math.min(jittered, FETCH_MAX_DELAY_MS);
}

/**
 * Fetch a URL, retrying transient failures with jittered exponential backoff
 * (honoring a server `Retry-After`). Throws the last error once attempts are
 * exhausted OR the global backoff budget is spent, so the caller can decide
 * whether a 404 is acceptable while a transient error becomes fatal.
 * @param {string} url
 * @param {Record<string, string>} headers
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, headers) {
    /** @type {unknown} */
    let lastError;
    for (let attempt = 1; attempt <= FETCH_MAX_ATTEMPTS; attempt++) {
        /** @type {number | undefined} */
        let retryAfterMs;
        try {
            const response = await fetch(url, { headers });
            if (!response.ok) {
                if (response.status === 429 || response.status >= 500) {
                    retryAfterMs = parseRetryAfterMs(response);
                }
                throw new HttpError(response.status, url);
            }
            return response;
        } catch (error) {
            lastError = error;
            if (!isTransientError(error) || attempt === FETCH_MAX_ATTEMPTS) {
                throw error;
            }
            const message = error instanceof Error ? error.message : String(error);
            const backoff = computeBackoffMs(attempt, retryAfterMs);
            if (totalBackoffMs + backoff > FETCH_TOTAL_BACKOFF_BUDGET_MS) {
                throw new Error(
                    `Exhausted total backoff budget (${FETCH_TOTAL_BACKOFF_BUDGET_MS}ms) while retrying ${url}; last error: ${message}`
                );
            }
            totalBackoffMs += backoff;
            const source = retryAfterMs !== undefined ? 'server Retry-After' : 'jittered backoff';
            console.warn(`Transient fetch failure (attempt ${attempt}/${FETCH_MAX_ATTEMPTS}) for ${url}: ${message}; retrying in ${Math.round(backoff)}ms (${source}).`);
            await delay(backoff);
        }
    }
    // Unreachable — the loop either returns or throws — but satisfies the type checker.
    throw lastError;
}

/**
 * @param {string} url
 * @returns {Promise<any>}
 */
async function fetchJson(url) {
    /** @type {Record<string, string>} */
    const headers = {
        'User-Agent': 'microsoft-foundry-for-vscode-sync',
        Accept: 'application/vnd.github+json',
    };
    if (GITHUB_TOKEN) {
        headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
    }
    const response = await fetchWithRetry(url, headers);
    return response.json();
}

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchText(url) {
    /** @type {Record<string, string>} */
    const headers = { 'User-Agent': 'microsoft-foundry-for-vscode-sync' };
    if (GITHUB_TOKEN) {
        headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
    }
    const response = await fetchWithRetry(url, headers);
    return response.text();
}

/**
 * Validate that a path segment is safe: no traversal, no special chars, no
 * leading-dot directories (e.g. `.claude`, `.github`) which are tooling
 * metadata, not sample templates.
 * @param {string} segment
 * @returns {boolean}
 */
function isSafePathSegment(segment) {
    if (segment === '.' || segment === '..' || segment.startsWith('.')) {
        return false;
    }
    return SAFE_PATH_SEGMENT.test(segment);
}

/**
 * Parse the commit SHA from the CLI argument.
 * @returns {string}
 */
function parseCommitShaArg() {
    const sha = process.argv[2] || '';
    if (!sha) {
        console.error('Usage: node generate_sample_catalog.mjs <commitSha>');
        process.exit(1);
    }
    if (!/^[0-9a-f]{7,40}$/i.test(sha)) {
        throw new Error(`Invalid commit SHA: "${sha}"`);
    }
    return sha;
}

/**
 * Fetch the full recursive git tree for a ref. One API call covers the entire
 * `samples/` hierarchy, which is much cheaper (and more accurate) than walking
 * the `/contents/` endpoint level-by-level — and it lets us discover samples
 * at arbitrary nesting depths (e.g. `bring-your-own/voicelive/<template>`)
 * without hard-coding the layout.
 *
 * @param {string} ref
 * @returns {Promise<{tree: Array<{path: string, type: string}>, truncated: boolean}>}
 */
async function fetchRepoTree(ref) {
    const data = await fetchJson(`${SAMPLES_REPO_API}/git/trees/${ref}?recursive=1`);
    const tree = Array.isArray(data?.tree) ? data.tree : [];
    return { tree, truncated: Boolean(data?.truncated) };
}

/**
 * Discover the languages and frameworks present in the samples repo tree,
 * then drop any listed in the (empty by default) BLOCKED_LANGUAGES /
 * BLOCKED_FRAMEWORKS blacklists. A "language" is the path segment directly
 * under `samples/` that owns a `hosted-agents/` folder; a "framework" is the
 * segment directly under `hosted-agents/`. Discovering these dynamically —
 * instead of hard-coding an allowlist — means new upstream languages or
 * frameworks are picked up automatically, while the blacklists remain an
 * explicit way to exclude a specific value. Hidden or unsafe segments (those
 * failing isSafePathSegment, e.g. `.github`) are ignored.
 *
 * @param {Array<{path: string, type: string}>} tree
 * @returns {{ languages: string[], frameworks: string[] }}
 */
function discoverLanguagesAndFrameworks(tree) {
    /** @type {Set<string>} */
    const languages = new Set();
    /** @type {Set<string>} */
    const frameworks = new Set();
    const pattern = /^samples\/([^/]+)\/hosted-agents\/([^/]+)(?:\/|$)/;

    for (const entry of tree) {
        const match = entry.path.match(pattern);
        if (!match) {
            continue;
        }
        const [, language, framework] = match;
        if (isSafePathSegment(language) && !BLOCKED_LANGUAGES.includes(language)) {
            languages.add(language);
        }
        if (isSafePathSegment(framework) && !BLOCKED_FRAMEWORKS.includes(framework)) {
            frameworks.add(framework);
        }
    }

    return {
        languages: [...languages].sort(),
        frameworks: [...frameworks].sort(),
    };
}

/**
 * Find sample template directories under a `hosted-agents/<framework>/` prefix.
 * A template is identified by the presence of an `azure.yaml` (the azd service
 * manifest). When nested azure.yaml files exist (e.g. a sub-agent declared
 * inside a parent sample), only the OUTERMOST one is treated as a catalog
 * template — the inner files are part of the parent sample. Hidden directories
 * (segments beginning with `.`, e.g. `.claude/skills`) are skipped, as are
 * segments that fail the `SAFE_PATH_SEGMENT` check.
 *
 * Nested templates are kept unless their category segment is listed in
 * `BLOCKED_CATEGORY_SEGMENTS` (empty by default, so everything is surfaced);
 * flat templates directly under the framework (csharp's
 * `agent-framework/<template>` layout) have no category and are always kept.
 * Add a segment to the blacklist to drop an unwanted upstream grouping.
 *
 * @param {Array<{path: string, type: string}>} tree
 * @param {string} prefix Path prefix ending in `/`, e.g. `samples/python/hosted-agents/agent-framework/`.
 * @returns {string[]} Repo-relative template directory paths, outermost only.
 */
function findTemplateDirsUnder(tree, prefix) {
    const candidates = tree
        .filter((entry) => entry.type === 'blob' && entry.path.startsWith(prefix) && entry.path.endsWith('/azure.yaml'))
        .map((entry) => entry.path.slice(0, -'/azure.yaml'.length))
        .filter((dir) => {
            const rel = dir.slice(prefix.length);
            if (!rel) {
                return false;
            }
            const segments = rel.split('/');
            if (!segments.every((seg) => isSafePathSegment(seg))) {
                return false;
            }
            // Flat templates sit directly under the framework
            // (`<framework>/<template>`, e.g. csharp `agent-framework/hello-world`)
            // and have no category segment — always surface them.
            if (segments.length === 1) {
                return true;
            }
            // Nested templates (`<framework>/<category>/...`) are kept unless the
            // category is explicitly blacklisted. Empty blacklist => everything is
            // surfaced (fail-open), matching the language/framework/protocol lists.
            const category = segments[0];
            if (!BLOCKED_CATEGORY_SEGMENTS.has(category)) {
                return true;
            }
            if (!skippedCategoriesLogged.has(category)) {
                skippedCategoriesLogged.add(category);
                console.log(`Skipping category "${category}" (in BLOCKED_CATEGORY_SEGMENTS); e.g. ${dir}`);
            }
            return false;
        })
        // Lexicographic sort serves two purposes: (1) a parent path always
        // sorts before its descendants, so the `startsWith` check below
        // correctly keeps only the outermost azure.yaml; (2) it preserves
        // upstream's `NN-` numeric prefix ordering in the picker.
        .sort();

    /** @type {string[]} */
    const outermost = [];
    for (const dir of candidates) {
        if (!outermost.some((existing) => dir.startsWith(`${existing}/`))) {
            outermost.push(dir);
        }
    }
    return outermost;
}

/**
 * Infer protocol when `azure.yaml` does not declare one explicitly. Looks for
 * a `responses` or `invocations` segment in the path, then for the substring
 * in the leaf directory name (common for samples like
 * `hello-world-invocations-voicelive`). Falls back to `responses` and emits a
 * warning so the catalog reviewer can verify the choice.
 *
 * @param {string} templatePath
 * @returns {'responses' | 'invocations'}
 */
function inferProtocolFromPath(templatePath) {
    const segments = templatePath.split('/');
    if (segments.includes('responses')) {
        return 'responses';
    }
    if (segments.includes('invocations')) {
        return 'invocations';
    }
    const leaf = segments[segments.length - 1].toLowerCase();
    if (leaf.includes('invocations')) {
        return 'invocations';
    }
    if (leaf.includes('responses')) {
        return 'responses';
    }
    warn(`Could not infer protocol for "${templatePath}"; defaulting to "responses". Add a "- protocol:" entry to azure.yaml or a sample-overrides.json entry to silence this.`);
    return 'responses';
}

/**
 * Minimal parser for a sample's azure.yaml (the azd service manifest).
 * Extracts the declared protocol(s) from the hosted-agent service's
 * `protocols:` list and whether the sample requires a Foundry model. A sample
 * requires a model when it either consumes one (an
 * AZURE_AI_MODEL_DEPLOYMENT_NAME env var) or provisions one (an `ai-project`
 * `deployments:` block — which replaced the model resource that used to live
 * in agent.manifest.yaml). Does NOT use eval or a real YAML library — a line
 * scan is sufficient for these fields. Any declared protocol is accepted
 * except those listed in BLOCKED_PROTOCOLS (empty by default).
 * @param {string} content
 * @returns {{ protocols: string[], requiresModel: boolean }}
 */
function parseAzureYaml(content) {
    /** @type {{ protocols: string[], requiresModel: boolean }} */
    const result = { protocols: [], requiresModel: false };

    for (const line of content.split('\n')) {
        const stripped = line.trim();
        if (stripped.startsWith('- protocol:')) {
            const value = stripped.split(':')[1]?.trim();
            if (value && !BLOCKED_PROTOCOLS.includes(value)) {
                result.protocols.push(value);
            }
        }
        // Model consumer: the agent reads a Foundry model deployment name.
        if (stripped.startsWith('- name:') && stripped.includes('AZURE_AI_MODEL_DEPLOYMENT_NAME')) {
            result.requiresModel = true;
        }
        // Model provider: the ai-project service declares one or more model
        // deployments to provision (the azure.yaml successor to a manifest
        // `kind: model` resource).
        if (stripped === 'deployments:') {
            result.requiresModel = true;
        }
    }

    return result;
}

/**
 * Fetch and parse a sample directory's azure.yaml.
 *
 * Returns `null` ONLY when the file genuinely does not exist (HTTP 404) — a
 * legitimate signal that the directory is not a template. A transient failure
 * (429 / 5xx / network) that survives retries is re-thrown so the run fails
 * loudly instead of silently dropping a real template (which is how the same
 * upstream commit could yield 88 vs 89 templates across runs).
 *
 * @param {string} samplePath
 * @param {string} ref
 * @returns {Promise<{ protocols: string[], requiresModel: boolean } | null>}
 */
async function fetchAzureYaml(samplePath, ref) {
    const rawUrl = `https://raw.githubusercontent.com/microsoft-foundry/foundry-samples/${ref}/${samplePath}/azure.yaml`;
    try {
        const content = await fetchText(rawUrl);
        return parseAzureYaml(content);
    } catch (error) {
        if (error instanceof HttpError && error.status === 404) {
            return null;
        }
        throw error;
    }
}

// Azure OpenAI configuration (from GitHub Secrets via env vars)
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || '';
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY || '';
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';
// Must be >= 2024-09-01-preview so `max_completion_tokens` is accepted. Newer
// models (gpt-5.x / reasoning) reject the legacy `max_tokens` param and any
// non-default `temperature`; override via env if your deployment needs a
// newer api-version.
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';
// Reasoning models (gpt-5.x / o-series) spend part of the completion budget on
// hidden reasoning tokens BEFORE emitting any visible content. If the budget
// is too small the reasoning alone exhausts it and `message.content` comes
// back EMPTY (finish_reason: "length"), which is why a too-low value silently
// dropped ~1/4 of descriptions. The visible output is a single short sentence,
// so a generous budget costs little but leaves ample headroom for reasoning.
const AZURE_OPENAI_MAX_COMPLETION_TOKENS = Number(process.env.AZURE_OPENAI_MAX_COMPLETION_TOKENS) || 2000;
// Optional: cap the hidden reasoning for a trivial summarization task. Only
// sent when set, because non-reasoning deployments (and older api-versions)
// 400 on an unknown `reasoning_effort` param. For gpt-5.x use `minimal`; for
// o-series use `low`.
const AZURE_OPENAI_REASONING_EFFORT = process.env.AZURE_OPENAI_REASONING_EFFORT || '';

// When true (workflow `refine_with_ai` input), the LLM reviews EVERY template's
// existing displayName/description and rewrites them only when they no longer
// fit the sample's README. When false (default), the LLM only fills BLANK
// fields and never touches values that are already present.
const AI_REFINE = /^(true|1|yes)$/i.test(process.env.AI_REFINE || '');

// When true (workflow `ignore_existing_catalog` input), the previous catalog's
// displayName/description values are NOT carried over. Every field starts empty,
// so a fresh run — typically the first AI refine — regenerates all values instead
// of being anchored by the "keep it if it already fits" logic. Off by default,
// so normal runs keep preserving PM-curated values.
const IGNORE_EXISTING = /^(true|1|yes)$/i.test(process.env.IGNORE_EXISTING || '');


// Retry knobs for the Azure OpenAI calls. The refine path fires one request
// per template (~90 in a full run); even with ample TPM/RPM quota a burst can
// momentarily trip the rate limiter (HTTP 429) at the sliding-window edge.
// Retry those (and transient 5xx / network errors) with jittered exponential
// backoff, honoring a server `Retry-After` (reusing the shared `delay` and
// `parseRetryAfterMs` helpers), so an occasional throttle self-heals instead of
// dropping the field. Overridable via env for local debugging.
const LLM_MAX_ATTEMPTS = Number(process.env.LLM_MAX_ATTEMPTS) || 5;
const LLM_BASE_DELAY_MS = Number(process.env.LLM_BASE_DELAY_MS) || 1000;
const LLM_MAX_DELAY_MS = Number(process.env.LLM_MAX_DELAY_MS) || 30_000;


/**
 * Fetch README.md content for a sample directory.
 * @param {string} samplePath
 * @param {string} ref
 * @returns {Promise<string | null>}
 */
async function fetchReadme(samplePath, ref) {
    const rawUrl = `https://raw.githubusercontent.com/microsoft-foundry/foundry-samples/${ref}/${samplePath}/README.md`;
    try {
        return await fetchText(rawUrl);
    } catch {
        return null;
    }
}

/**
 * Low-level Azure OpenAI chat call that expects a single JSON object back.
 * Centralizes the request shape, error handling, and JSON extraction so the
 * description-only and displayName+description prompts share one code path.
 * Returns the parsed object, or `null` when the LLM is not configured or the
 * call/parse fails (each failure mode is surfaced via `warn`).
 *
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {string} samplePath Used only for diagnostic messages.
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function callLLMForJson(systemPrompt, userPrompt, samplePath) {
    if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
        return null;
    }

    const apiUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;

    /** @type {{ messages: Array<{role: string, content: string}>, max_completion_tokens: number, reasoning_effort?: string }} */
    const body = {
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        // `max_completion_tokens` (not the legacy `max_tokens`) so newer models
        // accept the request. Kept generous because reasoning models spend part
        // of the budget on hidden reasoning tokens before emitting the answer.
        // `temperature` is intentionally omitted: several newer models only
        // support the default value and 400 on anything else.
        max_completion_tokens: AZURE_OPENAI_MAX_COMPLETION_TOKENS,
    };
    if (AZURE_OPENAI_REASONING_EFFORT) {
        body.reasoning_effort = AZURE_OPENAI_REASONING_EFFORT;
    }

    for (let attempt = 1; attempt <= LLM_MAX_ATTEMPTS; attempt++) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': AZURE_OPENAI_API_KEY,
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                // Retry rate-limit (429) and transient 5xx, honoring a server
                // `Retry-After`; give up on other 4xx (bad request, auth, etc.).
                const retryable = response.status === 429 || response.status >= 500;
                if (retryable && attempt < LLM_MAX_ATTEMPTS) {
                    const retryAfter = parseRetryAfterMs(response);
                    const backoff = retryAfter !== undefined
                        ? Math.min(retryAfter, LLM_MAX_DELAY_MS)
                        : Math.min(Math.random() * LLM_BASE_DELAY_MS * 2 ** (attempt - 1), LLM_MAX_DELAY_MS);
                    const source = retryAfter !== undefined ? 'server Retry-After' : 'jittered backoff';
                    console.warn(`LLM API returned ${response.status} for ${samplePath} (attempt ${attempt}/${LLM_MAX_ATTEMPTS}); retrying in ${Math.round(backoff)}ms (${source}).`);
                    await delay(backoff);
                    continue;
                }
                // Include a truncated response body so the exact reason (e.g. an
                // unsupported param, a missing deployment, or a wrong endpoint) is
                // visible in the CI log instead of a bare status code.
                let detail = '';
                try {
                    detail = (await response.text()).replace(/\s+/g, ' ').trim().slice(0, 400);
                } catch {
                    // ignore body read failures
                }
                warn(`LLM API returned ${response.status} for ${samplePath}.${detail ? ` Response: ${detail}` : ''}`);
                return null;
            }

            const data = await response.json();
            const choice = data.choices?.[0];
            const content = choice?.message?.content?.trim();
            if (!content) {
                // A successful (200) call with empty content is almost always a
                // reasoning model exhausting `max_completion_tokens` on hidden
                // reasoning (finish_reason: "length"). Surface it instead of
                // silently returning nothing, and hint at the knobs.
                const finishReason = choice?.finish_reason ?? 'unknown';
                const reasoningTokens = data.usage?.completion_tokens_details?.reasoning_tokens;
                const usageHint = reasoningTokens !== undefined ? ` (reasoning_tokens=${reasoningTokens})` : '';
                warn(`LLM returned empty content for ${samplePath} (finish_reason=${finishReason}${usageHint}). If finish_reason is "length", raise AZURE_OPENAI_MAX_COMPLETION_TOKENS or set AZURE_OPENAI_REASONING_EFFORT.`);
                return null;
            }

            // Parse JSON response — strip markdown code fences if present.
            const jsonStr = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            const parsed = JSON.parse(jsonStr);
            if (!parsed || typeof parsed !== 'object') {
                warn(`LLM response for ${samplePath} was not a JSON object.`);
                return null;
            }
            return /** @type {Record<string, unknown>} */ (parsed);
        } catch (/** @type {any} */ err) {
            // Network-level errors (ECONNRESET, socket timeout) are transient.
            if (attempt < LLM_MAX_ATTEMPTS) {
                const backoff = Math.min(Math.random() * LLM_BASE_DELAY_MS * 2 ** (attempt - 1), LLM_MAX_DELAY_MS);
                console.warn(`LLM call failed for ${samplePath} (attempt ${attempt}/${LLM_MAX_ATTEMPTS}): ${err.message}; retrying in ${Math.round(backoff)}ms.`);
                await delay(backoff);
                continue;
            }
            warn(`LLM call failed for ${samplePath}: ${err.message}`);
            return null;
        }
    }
    return null;
}

// Shared guidance describing what a good picker description looks like, reused
// by both the description-only prompt and the combined refine prompt so the
// two paths stay consistent.
const DESCRIPTION_GUIDANCE = `A good description:
- Is one sentence, max 100 characters, plain text (no markdown)
- Describes what the sample does, not how it is implemented
- Does NOT include language, protocol, or framework names, or words like "Sample" / "Demo"
Examples:
  "Minimal agent that echoes a response from a Foundry model."
  "Conversational agent with multi-turn session history."
  "Agent with local function tools for hotel search."
  "Agent that discovers and invokes tools from a remote MCP server."`;

// Shared guidance describing what a good picker displayName looks like, reused
// by both the generate and refine prompts so the two paths stay consistent.
// Style is taught by example (few-shot) rather than a long rule list: the
// leaf-folder -> displayName pairs — including one negative example for the
// observed failure mode where the model settles for a generic framework name —
// steer the model far more reliably than abstract instructions. The leaf folder
// name is also passed in the user prompt so the model can anchor on it.
const DISPLAY_NAME_GUIDANCE = `A good displayName is a 2-4 word Title Case name for the sample's distinctive scenario. Never restate the already-chosen language, framework, or protocol; keep known acronyms uppercased (MCP, RAG, SDK, API, UI); no leading numbers and no "Sample"/"Demo".

Examples (leaf folder -> displayName):
  "uv-pyproject"         -> "uv Project Setup"   (NOT "Bring Your Own Agent" — that only repeats the framework)
  "azure-search-rag"     -> "Azure Search RAG"
  "11-human-in-the-loop" -> "Human-in-the-Loop"
  "04-foundry-toolbox"   -> "Foundry Toolbox"
  "echo"                 -> "Echo Agent"`;

/**
 * Generate a displayName AND a one-sentence description from README content
 * (used when only BLANK fields are being filled — the default, non-refine
 * path). Both fields are produced by the LLM so newly added samples get an
 * AI-authored displayName instead of a raw folder-name derivation. The caller
 * only writes back whichever field was blank, so existing values are never
 * touched, and falls back to `displayNameFromPath` when the LLM yields no
 * usable displayName.
 *
 * @param {string} readmeContent
 * @param {string} samplePath
 * @returns {Promise<{ displayName: string, description: string } | null>}
 */
async function generateWithLLM(readmeContent, samplePath) {
    const systemPrompt = `You generate the displayName and description of a hosted-agent sample shown in a VS Code template picker.
The user has already selected language, framework, and protocol before seeing these items, so neither field should repeat those choices.

displayName rules:
${DISPLAY_NAME_GUIDANCE}

description rules:
${DESCRIPTION_GUIDANCE}

Respond ONLY with a JSON object: {"displayName": "...", "description": "..."}`;

    const userPrompt = `Path: ${samplePath}
Leaf folder name (strongest displayName hint): ${samplePath.split('/').pop()}

README.md:
${readmeContent.substring(0, 2000)}`;

    const parsed = await callLLMForJson(systemPrompt, userPrompt, samplePath);
    if (!parsed) {
        return null;
    }
    const displayName = typeof parsed.displayName === 'string' ? parsed.displayName.trim() : '';
    const description = typeof parsed.description === 'string' ? parsed.description.trim() : '';
    if (!displayName && !description) {
        warn(`LLM response for ${samplePath} had no usable "displayName"/"description" fields; values left empty.`);
        return null;
    }
    return { displayName, description };
}

/**
 * Review and (only when needed) rewrite a template's displayName AND
 * description against its README (used by the opt-in `refine_with_ai` path).
 *
 * The current displayName and description are passed to the model so it can
 * KEEP them verbatim when they already fit the sample's scenario — refinement
 * is not a forced rewrite. displayName follows the Foundry Sample Finder
 * convention: a short, human-friendly Title-Case name for the scenario
 * (e.g. "Basic Agent", "Foundry Toolbox", "Azure Search RAG") rather than the
 * raw folder name.
 *
 * @param {string} readmeContent
 * @param {string} samplePath
 * @param {string} currentDisplayName
 * @param {string} currentDescription
 * @returns {Promise<{ displayName: string, description: string } | null>}
 */
async function refineDisplayFieldsWithLLM(readmeContent, samplePath, currentDisplayName, currentDescription) {
    const systemPrompt = `You curate the displayName and description of a hosted-agent sample shown in a VS Code template picker.
The user has already selected language, framework, and protocol before seeing these items, so neither field should repeat those choices.

You are given the CURRENT displayName and description. If they already fit the sample's README scenario, KEEP them exactly as-is. Only rewrite a field when it is empty, inaccurate, or unclear.

displayName rules:
${DISPLAY_NAME_GUIDANCE}

description rules:
${DESCRIPTION_GUIDANCE}

Respond ONLY with a JSON object: {"displayName": "...", "description": "..."}`;

    const userPrompt = `Path: ${samplePath}
Leaf folder name (strongest displayName hint): ${samplePath.split('/').pop()}
Current displayName: ${currentDisplayName || '(empty)'}
Current description: ${currentDescription || '(empty)'}

README.md:
${readmeContent.substring(0, 2000)}`;

    const parsed = await callLLMForJson(systemPrompt, userPrompt, samplePath);
    if (!parsed) {
        return null;
    }
    const displayName = typeof parsed.displayName === 'string' ? parsed.displayName.trim() : '';
    const description = typeof parsed.description === 'string' ? parsed.description.trim() : '';
    if (!displayName && !description) {
        warn(`LLM refine response for ${samplePath} had no usable "displayName"/"description" fields; leaving values unchanged.`);
        return null;
    }
    return { displayName, description };
}

/**
 * Brand and acronym casing overrides applied during displayName derivation.
 * Keys are lower-case tokens; values are the canonical user-facing rendering.
 * Add entries here when a new acronym or brand appears in a sample folder
 * name so the template picker doesn't show "Github" / "Mcp" / "Sdk".
 * @type {Record<string, string>}
 */
const DISPLAY_NAME_TOKEN_CASING = {
    ag: 'AG',
    ai: 'AI',
    api: 'API',
    aws: 'AWS',
    cli: 'CLI',
    gcp: 'GCP',
    github: 'GitHub',
    llm: 'LLM',
    mcp: 'MCP',
    openai: 'OpenAI',
    rag: 'RAG',
    sdk: 'SDK',
    sso: 'SSO',
    ui: 'UI',
};

/**
 * Title-case a dash/underscore-delimited id into a user-facing label: split on
 * `-`/`_`, capitalize each word, and apply `DISPLAY_NAME_TOKEN_CASING` for
 * known acronyms/brands. `azure-search-rag` -> `Azure Search RAG`,
 * `activity` -> `Activity`. Used both as the dimension-option label fallback
 * (buildDimensions) and by displayNameFromPath.
 *
 * @param {string} id
 * @returns {string}
 */
function titleCaseId(id) {
    return id
        .split(/[-_]/)
        .filter((w) => w.length > 0)
        .map((w) => DISPLAY_NAME_TOKEN_CASING[w.toLowerCase()] ?? (w.charAt(0).toUpperCase() + w.slice(1)))
        .join(' ');
}

/**
 * Derive a displayName from the template's directory name. Strips a leading
 * numeric ordering prefix (`09-`, `12_`) so upstream reorderings don't bleed
 * into the picker, then title-cases the remaining tokens (see titleCaseId):
 * `09-declarative-customer-support` -> `Declarative Customer Support`,
 * `azure-search-rag` -> `Azure Search RAG`.
 *
 * @param {string} samplePath
 * @returns {string}
 */
function displayNameFromPath(samplePath) {
    const dirName = samplePath.split('/').pop() || '';
    return titleCaseId(dirName.replace(/^\d+[-_]/, ''));
}

/**
 * Scan the foundry-samples repo and build the flat template list. Uses one
 * recursive git-tree call to enumerate every `azure.yaml` under each
 * `<language>/hosted-agents/<framework>/` prefix, regardless of intermediate
 * directories. Languages and frameworks are discovered dynamically from the
 * tree (see discoverLanguagesAndFrameworks) rather than hard-coded, then
 * filtered through the BLOCKED_LANGUAGES/BLOCKED_FRAMEWORKS blacklists. This
 * supports both the canonical layout (`<framework>/<protocol>/<template>`),
 * the flat layout (`<framework>/<template>`), and category-grouped layouts
 * such as `bring-your-own/voicelive/hello-world-invocations-voicelive`.
 *
 * @param {string} commitSha
 * @returns {Promise<Array<{language: string, framework: string, protocol: string, displayName: string, description: string, path: string, requiresModel: boolean}>>}
 */
async function scanTemplates(commitSha) {
    /** @type {Array<{language: string, framework: string, protocol: string, displayName: string, description: string, path: string, requiresModel: boolean}>} */
    const templates = [];

    const { tree, truncated } = await fetchRepoTree(commitSha);
    if (truncated) {
        warn(`GitHub git-tree API returned truncated=true for ${commitSha}; some samples may be missing from the catalog. Consider pinning to a smaller subtree or re-running.`);
    }

    const { languages, frameworks } = discoverLanguagesAndFrameworks(tree);

    for (const language of languages) {
        for (const framework of frameworks) {
            const prefix = `samples/${language}/hosted-agents/${framework}/`;
            const templateDirs = findTemplateDirsUnder(tree, prefix);

            for (const templatePath of templateDirs) {
                const azureInfo = await fetchAzureYaml(templatePath, commitSha);
                if (!azureInfo) {
                    // null means a genuine 404 — the directory matched the scan
                    // prefix but has no azure.yaml, so it is not a template.
                    // (Transient fetch failures are re-thrown by fetchAzureYaml
                    // and abort the run instead of silently dropping a sample.)
                    warn(`No azure.yaml found for "${templatePath}" (HTTP 404); skipping this template.`);
                    continue;
                }

                /** @type {string} */
                const protocol = azureInfo.protocols.length > 0
                    ? azureInfo.protocols[0]
                    : inferProtocolFromPath(templatePath);

                const requiresModel = azureInfo.requiresModel;

                templates.push({
                    language,
                    framework,
                    protocol,
                    displayName: '',
                    description: '',
                    path: templatePath,
                    requiresModel,
                });
            }
        }
    }

    return templates;
}

/**
 * Build the dimensions section from discovered templates and defaults.
 * Option order follows the insertion order of `DIMENSION_DEFAULTS[dim].options`
 * so we have UX control (e.g. promote `copilot-sdk` ahead of
 * `agent-framework`). Any id seen in the scanned templates but not declared in
 * the defaults is appended at the end in alphabetical order, so a new
 * framework added upstream does not break the build — just shows up last.
 *
 * @param {Array<{language: string, framework: string, protocol: string}>} templates
 */
function buildDimensions(templates) {
    /** @type {Record<string, {title: string, placeholder: string, options: Array<{id: string, displayName: string}>}>} */
    const dimensions = {};

    for (const dimKey of /** @type {const} */ (['language', 'framework', 'protocol'])) {
        const defaults = DIMENSION_DEFAULTS[dimKey];
        const seenIds = new Set(templates.map((t) => t[dimKey]));
        const declaredOrder = Object.keys(defaults.options);
        const orderedIds = [
            ...declaredOrder.filter((id) => seenIds.has(id)),
            ...[...seenIds].filter((id) => !declaredOrder.includes(id)).sort(),
        ];
        const options = orderedIds.map((id) => ({
            id,
            displayName: defaults.options[id] || titleCaseId(id),
        }));
        dimensions[dimKey] = {
            title: defaults.title,
            placeholder: defaults.placeholder,
            options,
        };
    }

    return dimensions;
}

/**
 * Preserve existing displayName and description from the current catalog.
 * Only non-empty existing values are kept — never overwritten.
 * @param {Array<{displayName: string, description: string, path: string}>} templates
 */
function mergeExistingDisplayFields(templates) {
    if (!existsSync(OUTPUT_PATH)) {
        return;
    }

    try {
        const existing = JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8'));
        /** @type {Map<string, {displayName?: string, description?: string}>} */
        const existingByPath = new Map();
        for (const t of existing.templates || []) {
            if (t.path) {
                existingByPath.set(t.path, t);
            }
        }

        const scannedPaths = new Set(templates.map((t) => t.path));
        for (const template of templates) {
            const prev = existingByPath.get(template.path);
            if (prev) {
                if (prev.displayName) {
                    template.displayName = prev.displayName;
                }
                if (prev.description) {
                    template.description = prev.description;
                }
            }
        }
        // Surface paths that exist in the prior catalog but were not produced
        // by this scan — upstream likely renamed or removed the sample, and any
        // PM-edited displayName/description on it has been dropped.
        for (const [path, prev] of existingByPath) {
            if (scannedPaths.has(path)) {
                continue;
            }
            const hadEdits = Boolean(prev.displayName || prev.description);
            const suffix = hadEdits ? ' Previously-edited displayName/description were dropped.' : '';
            warn(`Template "${path}" was in the previous catalog but no longer matches any scanned sample (upstream may have renamed or removed it).${suffix}`);
        }
    } catch (/** @type {any} */ err) {
        warn(`Could not read existing catalog at ${OUTPUT_PATH}: ${err.message}. Existing displayName/description values were NOT preserved this run.`);
    }
}

/**
 * Load source-controlled per-path overrides. Returns an empty map when the
 * file is missing or unreadable so generation never fails on it.
 *
 * @returns {Map<string, Record<string, unknown>>}
 */
function loadOverrides() {
    /** @type {Map<string, Record<string, unknown>>} */
    const byPath = new Map();
    if (!existsSync(OVERRIDES_PATH)) {
        return byPath;
    }
    try {
        const raw = JSON.parse(readFileSync(OVERRIDES_PATH, 'utf-8'));
        const entries = (raw && typeof raw === 'object' && raw.byPath) || {};
        for (const [path, fields] of Object.entries(entries)) {
            if (fields && typeof fields === 'object') {
                byPath.set(path, /** @type {Record<string, unknown>} */ (fields));
            }
        }
    } catch (/** @type {any} */ err) {
        warn(`Could not read sample-overrides.json: ${err.message}`);
    }
    return byPath;
}

/**
 * Shallow-merge per-path overrides onto scanned templates. Lets us correct
 * structural fields (e.g. `framework: "copilot-sdk"` for a sample that lives
 * under `bring-your-own/` upstream) without touching upstream or hand-editing
 * the generated catalog. Unknown override paths are logged but never fail
 * the build — upstream may have moved a sample.
 *
 * @param {Array<{path: string} & Record<string, unknown>>} templates
 * @param {Map<string, Record<string, unknown>>} overrides
 */
function applyOverrides(templates, overrides) {
    if (overrides.size === 0) {
        return;
    }
    /** @type {Set<string>} */
    const seenPaths = new Set();
    for (const template of templates) {
        seenPaths.add(template.path);
        const fields = overrides.get(template.path);
        if (fields) {
            Object.assign(template, fields);
        }
    }
    for (const path of overrides.keys()) {
        if (!seenPaths.has(path)) {
            warn(`Override for "${path}" did not match any scanned template; check sample-overrides.json (upstream may have moved or renamed the sample).`);
        }
    }
}

/**
 * Fill and (optionally) refine displayName and description fields.
 *
 * Default path (AI_REFINE off): only BLANK displayName/description fields are
 * filled — the LLM generates both from the sample's README when configured
 * (empty displayName falls back to folder-name derivation otherwise). Values
 * that already exist (PM-curated or preserved from the prior catalog) are left
 * untouched, so a normal run is strictly incremental.
 *
 * Refine path (AI_REFINE on, opt-in via the `refine_with_ai` workflow input):
 * the LLM reviews BOTH fields of every template against its README and rewrites
 * them only when they no longer fit — existing values that already match the
 * scenario are kept verbatim. Without LLM credentials this path degrades to the
 * default behavior.
 *
 * @param {Array<{displayName: string, description: string, path: string}>} templates
 * @param {string} commitSha
 */
async function autoFillDisplayFields(templates, commitSha) {
    const hasLLM = Boolean(AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_API_KEY);

    if (AI_REFINE && hasLLM) {
        await refineAllWithLLM(templates, commitSha);
    } else {
        if (AI_REFINE && !hasLLM) {
            warn('refine_with_ai was requested but no Azure OpenAI credentials are configured; falling back to filling blanks only.');
        }
        await fillBlankDisplayFields(templates, commitSha, hasLLM);
    }

    for (const template of templates) {
        if (!template.description) {
            warn(`Template "${template.path}" is missing: description. PM should fill it before merge.`);
        }
    }
}

/**
 * Default path: fill only BLANK displayName/description via the LLM, using each
 * sample's README as context. Values that already exist (PM-curated or carried
 * over from the previous catalog) are never touched, so a normal run is purely
 * incremental — only newly added samples get generated. Empty displayName falls
 * back to folder-name derivation when the LLM is unavailable or yields nothing.
 *
 * @param {Array<{displayName: string, description: string, path: string}>} templates
 * @param {string} commitSha
 * @param {boolean} hasLLM
 */
async function fillBlankDisplayFields(templates, commitSha, hasLLM) {
    const needsFill = templates.filter((t) => !t.displayName || !t.description);
    if (needsFill.length === 0) {
        console.log('All templates already have a displayName and description.');
        return;
    }

    if (hasLLM) {
        console.log(`Generating displayName/description for ${needsFill.length} templates using LLM...`);
        for (const template of needsFill) {
            const readme = await fetchReadme(template.path, commitSha);
            if (!readme) {
                continue;
            }
            const result = await generateWithLLM(readme, template.path);
            if (!result) {
                continue;
            }
            // Only write back the field that was blank — never overwrite an
            // existing value, keeping the default run strictly incremental.
            if (!template.displayName && result.displayName) {
                template.displayName = result.displayName;
            }
            if (!template.description && result.description) {
                template.description = result.description;
            }
        }
    } else {
        console.log(`${needsFill.length} templates need a displayName/description but no LLM is configured; deriving displayName from the folder name and leaving description empty.`);
    }

    // Fallback for any displayName still blank (no LLM, missing README, or the
    // LLM returned nothing) so the picker never shows an empty label.
    for (const template of templates) {
        if (!template.displayName) {
            template.displayName = displayNameFromPath(template.path);
        }
    }
}

/**
 * Refine path: ask the LLM to review displayName + description for every
 * template against its README, keeping values that already fit and rewriting
 * only those that do not. Templates whose README cannot be fetched fall back
 * to folder-name derivation for an empty displayName so nothing is left blank.
 *
 * @param {Array<{displayName: string, description: string, path: string}>} templates
 * @param {string} commitSha
 */
async function refineAllWithLLM(templates, commitSha) {
    console.log(`Refining displayName/description for ${templates.length} templates using LLM...`);
    for (const template of templates) {
        const readme = await fetchReadme(template.path, commitSha);
        if (!readme) {
            if (!template.displayName) {
                template.displayName = displayNameFromPath(template.path);
            }
            continue;
        }
        const result = await refineDisplayFieldsWithLLM(
            readme,
            template.path,
            template.displayName,
            template.description
        );
        if (result?.displayName) {
            template.displayName = result.displayName;
        } else if (!template.displayName) {
            template.displayName = displayNameFromPath(template.path);
        }
        if (result?.description) {
            template.description = result.description;
        }
    }
}


/**
 * Reorder templates so the curated pins come first, in the declared
 * PINNED_TEMPLATE_PATHS order, followed by every other template in its existing
 * scan order. A pinned path with no matching template is skipped and surfaced
 * as a warning. This makes the generated `templates` array itself the single
 * source of truth for gallery order — the VS Code webview renders it as-is,
 * with no client-side pinning.
 *
 * @template {{ path: string }} T
 * @param {T[]} templates
 * @returns {T[]}
 */
function reorderPinnedFirst(templates) {
    const byPath = new Map(templates.map((t) => [t.path, t]));
    /** @type {T[]} */
    const pinned = [];
    /** @type {Set<string>} */
    const pinnedPaths = new Set();
    for (const path of PINNED_TEMPLATE_PATHS) {
        const template = byPath.get(path);
        if (template) {
            pinned.push(template);
            pinnedPaths.add(path);
        } else {
            warn(`Pinned path "${path}" matches no scanned template; it will not be pinned (check PINNED_TEMPLATE_PATHS — upstream may have renamed or removed the sample).`);
        }
    }
    const rest = templates.filter((t) => !pinnedPaths.has(t.path));
    return [...pinned, ...rest];
}

/**
 * Warn about templates that share the same displayName WITHIN a single
 * language+framework+protocol group — i.e. the set a user actually sees at once
 * in the picker after choosing those dimensions. Duplicate names across
 * DIFFERENT groups are fine (the user never sees them side by side) and are not
 * reported. This is detection-only: the catalog is left unchanged so a PM can
 * disambiguate the flagged names when reviewing the generated PR.
 *
 * @param {Array<{displayName: string, language: string, framework: string, protocol: string, path: string}>} templates
 */
function warnDuplicateDisplayNames(templates) {
    /** @type {Map<string, Map<string, string[]>>} */
    const groups = new Map();
    for (const t of templates) {
        const groupKey = `${t.language} / ${t.framework} / ${t.protocol}`;
        const nameKey = t.displayName.trim().toLowerCase();
        if (!nameKey) {
            continue;
        }
        let byName = groups.get(groupKey);
        if (!byName) {
            byName = new Map();
            groups.set(groupKey, byName);
        }
        const paths = byName.get(nameKey) ?? [];
        paths.push(t.path);
        byName.set(nameKey, paths);
    }

    for (const [groupKey, byName] of groups) {
        for (const [, paths] of byName) {
            if (paths.length > 1) {
                warn(`Duplicate displayName within "${groupKey}" (users see these together): ${paths.join(', ')}. A PM should disambiguate these names before merge.`);
            }
        }
    }
}

async function main() {
    if (process.argv.length !== 3) {
        throw new Error('Usage: node generate_sample_catalog.mjs <commitSha> | --from-existing');
    }
    const definitions = JSON.parse(readFileSync(CARDS_PATH, 'utf-8').replace(/^\uFEFF/, ''));
    if (process.argv[2] === '--from-existing') {
        const source = JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8').replace(/^\uFEFF/, ''));
        const catalog = writeCatalogWithCards(source, definitions, OUTPUT_PATH);
        console.log(`Wrote ${OUTPUT_PATH}: ${catalog.templates.length} templates, ${catalog.cards.length} cards (existing snapshot preserved)`);
        writeSummary(catalog.templates.length);
        return;
    }

    const commitSha = parseCommitShaArg();
    if (commitSha !== definitions.sourceCommitSha) {
        throw new Error('Requested commit must match sample-cards.json sourceCommitSha; review template coverage and card content before changing the snapshot.');
    }
    console.log(`Using commit: ${commitSha}`);

    console.log('Scanning templates...');
    const templates = await scanTemplates(commitSha);
    console.log(`Found ${templates.length} templates`);

    // Step 1: Preserve existing PM-curated displayName/description values,
    // unless a fresh run was requested (ignore_existing_catalog) — then every
    // field starts empty so nothing anchors the regeneration.
    if (IGNORE_EXISTING) {
        console.log('IGNORE_EXISTING is set; not carrying over displayName/description from the previous catalog.');
    } else {
        mergeExistingDisplayFields(templates);
    }

    // Step 2: Apply source-controlled per-path overrides (structural fields like
    // `framework` that the upstream tree layout cannot express on its own).
    applyOverrides(templates, loadOverrides());

    // Step 3: Fill remaining empties — displayName from folder name (always),
    // description from the LLM when configured.
    await autoFillDisplayFields(templates, commitSha);

    // Flag same-name collisions a user would see together (detection only).
    warnDuplicateDisplayNames(templates);

    const dimensions = buildDimensions(templates);
    const orderedTemplates = reorderPinnedFirst(templates);

    const catalog = {
        commitSha,
        repo: SAMPLES_REPO_URL,
        generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
        dimensions,
        templateSelection: TEMPLATE_SELECTION,
        templates: orderedTemplates,
    };

    const output = writeCatalogWithCards(catalog, definitions, OUTPUT_PATH);
    console.log(`Wrote ${OUTPUT_PATH}: ${output.templates.length} templates, ${output.cards.length} cards`);

    writeSummary(templates.length);
}

/**
 * Append a Markdown report to `$GITHUB_STEP_SUMMARY` (when running in CI) that
 * surfaces the warnings collected during this run. Reviewers otherwise have
 * to scroll through raw job logs to notice anomalies like templates missing
 * descriptions or unmatched overrides. Locally (no env var) this is a no-op.
 *
 * @param {number} templateCount
 */
function writeSummary(templateCount) {
    const summaryPath = process.env.GITHUB_STEP_SUMMARY;
    if (!summaryPath) {
        if (warnings.length > 0) {
            console.warn(`\nCatalog generation produced ${warnings.length} warning(s) (see WARN lines above).`);
        }
        return;
    }

    const lines = [
        '',
        '## Sample Catalog Generation',
        '',
        `- Templates discovered: **${templateCount}**`,
        `- Warnings emitted: **${warnings.length}**`,
        '',
    ];

    if (warnings.length > 0) {
        lines.push('### ⚠ Anomalies');
        lines.push('');
        lines.push('These were logged during generation and may need human attention before merging:');
        lines.push('');
        for (const message of warnings) {
            lines.push(`- ${message}`);
        }
        lines.push('');
    } else {
        lines.push('No anomalies detected. ✅');
        lines.push('');
    }

    try {
        appendFileSync(summaryPath, lines.join('\n'), 'utf-8');
    } catch (/** @type {any} */ err) {
        console.warn(`Could not append to GITHUB_STEP_SUMMARY: ${err.message}`);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
