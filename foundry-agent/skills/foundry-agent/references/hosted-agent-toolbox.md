# Hosted Agent with a Foundry Toolbox

Wire a Python Hosted Agent (`--sample toolbox`) to a Foundry Toolbox via Microsoft Agent Framework `FoundryToolbox`.

- **Runtime contract**: Hosted deployments inject `FOUNDRY_PROJECT_ENDPOINT` and `AZURE_AI_MODEL_DEPLOYMENT_NAME`. The `toolbox` sample defines a non-secret `TOOLBOX_ENDPOINT` constant in `main.py` and copies it into `os.environ` at startup; `FoundryToolbox` shares `DefaultAzureCredential` with `FoundryChatClient`.
- **Schema boundary**: Hosted `foundryx.yaml` supports `kind`, `name`, `description`, `model`, `tool_resources`, `source`, `runtime`, `resources`, `local`, and `deployment` (`agent.tools` is for Prompt Agents; custom env var fields are not supported). Keep `toolbox.yaml` and credentials out of the deployed package.

## Step 1: Discover an existing Toolbox

For normal Agent building, resources are already configured by an administrator.
Follow [Discover and reuse tools](tool-discovery.md):

```text
foundryx toolbox list --project <project-id>
foundryx toolbox show <toolbox-name> --project <project-id>
```

## Step 2: Review version, authentication and tool requirements

Inspect configured tool summaries and connection authentication/compatibility.
Missing resources or credentials require administrator action, not automatic
creation. Configuration discovery does not prove tool enumeration or execution.

```text
foundryx toolbox version list <toolbox-name> --project <project-id>
foundryx toolbox show <toolbox-name> --version <version> --project <project-id>
```

Default inspection selects the published version; `--version` selects a pinned
endpoint. Creating/publishing Toolboxes remains a separate explicitly requested
[administration workflow](toolbox.md).

## Step 3: Initialize the sample and set `TOOLBOX_ENDPOINT`

Only after the selected Toolbox exists in `<project-id>` (connectionless built-ins
do not require a connection):

```text
foundryx agent init [directory] --sample toolbox
```

Use the exact `endpoint` from `toolbox show` as `TOOLBOX_ENDPOINT` in `main.py`;
do not ask for a value already discovered, set `TOOLBOX_NAME`, or substitute a
FoundryX UUID/service URL. Set `project: <project-id>`, unique `agent.name` and
ready deployment `agent.model` in `foundryx.yaml`. Declare the selected resource as
`agent.tool_resources: ["toolbox:<toolbox-name>"]` so deployment can check the
project's allowed tools. Use `connection:<name>` or `builtin:<type>` for other
resources used by the source; use `[]` for none. These declarations support policy
checks and do not isolate arbitrary source code at runtime.

## Step 4: Deploy, invoke remotely, and handle OAuth consent

Skip local `agent run` / `--local` (the local gateway proxies model Responses, not Toolbox MCP routes; do not work around this with personal Azure credentials).

```text
foundryx agent deploy
foundryx agent invoke "List the tools available to you."
```

If tool enumeration fails, report the actual Toolbox or MCP error rather than falling back to a tool-free answer.

- **User identity delegation**: Deployed Hosted invocations delegate the signed-in user's identity by default (`--delegate-user-identity` explicitly enables; `--no-delegate-user-identity` opts out for app-only calls; Prompt and `--local` calls are never delegated). Do not fabricate `x-ms-user-identity` or retry without delegation when `AgentEndpointUserIdentityImpersonation` permission is missing.
- **OAuth consent (`oauth_consent_required`)**: Emitted as native `oauth_consent_request` items by `agent-framework-foundry-hosting>=1.0.0b260910` (exits nonzero even with `--json`; no custom handler in `main.py` is needed, and do not scrape URLs from logs):
  1. Print the exact consent URL for the user to open and approve manually (do not rewrite, auto-open, or repeat invocation before the user completes consent).
  2. Once the user approves, rerun `foundryx agent invoke` with the reported `--conversation-id`, the same account and delegation option—even if the browser page showed a post-login error such as `"Code ... not found"`, since consent is often saved anyway.
  3. Only if a new consent link is returned, have the user open that fresh link in a private browser window signed in solely as the invoking account (links expire after a few minutes; invoke again for a fresh link rather than reusing an expired one).
- **Administrator updates later**: An Agent using the unversioned Toolbox endpoint follows newly published defaults without redeployment. A pinned endpoint requires an explicit Agent update to select another version. Do not create or publish Toolbox versions during normal Agent building.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Toolbox not found | Verify `TOOLBOX_ENDPOINT` uses `<foundry-account>` and `<foundry-project>` from `arm_id` in the same project. |
| `401` from Toolbox | Keep shared `DefaultAzureCredential` in `FoundryChatClient` and `FoundryToolbox`. |
| Tool enumeration fails | Check `foundryx agent hosted logs <agent-id> --type console`; one failing MCP server fails enumeration for the Toolbox. |
| New Toolbox version ignored | Inspect `toolbox show`: a new version does not change the default, and pinned endpoints stay pinned. Ask the administrator about an intended default change; never publish automatically during Agent building. |
