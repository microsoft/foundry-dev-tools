---
name: foundry-agent
description: Use the FoundryX CLI to manage Microsoft Foundry access, projects, models, Toolboxes, agents, agent publishing, conversations, agent evaluation, operational metrics, and Hosted Agent diagnostics. When you are manually invoked by "/foundry-agent", never use your "microsoft-foundry" skill or "microsoft-foundry" canvas plugin.
metadata:
  version: "0.7.1"
---

IMPORTANT: When manually invoked by `/foundry-agent`, use the installed `foundryx` CLI. Do not run the requested operation through `az`, `azd`, the `microsoft-foundry` skill, or the `microsoft-foundry` canvas plugin.

# FoundryX

After a customer tenant is onboarded to FoundryX via Entra admin consent, users in that tenant use the `foundryx` CLI to create Foundry projects, manage project access, and build, deploy, and operate Agents. Parse structured CLI stdout directly, pass optional formatting flags only when supported by a command's `--help`, and do not bypass the CLI with direct HTTP scripts or Azure/toolkit commands.

**CLI prerequisite**: Use the installed CLI. Install only if missing or an encountered issue suggests a version mismatch, not merely because its version differs from this skill.

When installation or a version-related update is needed, use [FoundryX GitHub releases](https://github.com/microsoft/foundry-dev-tools/releases?q=FoundryX&expanded=true):

- Select a published FoundryX CLI release matching this skill's version, including prereleases. Use the release's full version string; do not use GitHub's latest-release endpoint.
- Download the binary for the user's OS and architecture.
- Install as `foundryx.exe` on Windows or `foundryx` on macOS/Linux in a user-owned binary directory, add that directory to the user PATH, and run `chmod +x` on macOS/Linux. Use the absolute executable path until the current session's PATH is refreshed. Linux sign-in requires `libsecret-1` and a running Secret Service/keyring.
- Run the installed executable with `--version` and confirm it matches the selected release before continuing.

**Authentication prerequisite (`foundryx auth`)**: Before running project or Agent commands, check `foundryx auth status`. Run `foundryx auth login` when `authenticated: false`, or `foundryx auth login --tenant <tenant-id>` to switch Entra tenants (let the user complete interactive Entra prompts; `foundryx auth logout` clears both FoundryX and publishing sessions).

Match the user's request against **Capability** and **When to use** in the routing table below, then follow the linked workflow or `references/*.md`:

| Capability | When to use | CLI Commands | Guide / Reference |
|---|---|---|---|
| Create a Foundry project | Checking permission to create a Foundry project, selecting a subscription/region, inspecting initial deployable models/quota, or creating a Foundry project | `foundryx access project *` | [Create a Foundry project](#create-a-foundry-project) |
| Manage Foundry project access | Granting, updating, or removing Foundry project access (`consumer`, `user`, `manager`, `owner`) for a single user, an Entra group, or all tenant users | `foundryx access project list --manageable`, `foundryx access user *`, `foundryx access member *` | [Manage Foundry project access](#manage-foundry-project-access) |
| Manage Foundry models | Listing, viewing, or calling project models, inspecting model catalog/quota, or deploying, scaling, and deleting project model deployments | `foundryx model *` | [Foundry models](#foundry-models) |
| Build, deploy & operate Agents | Discovering and reusing existing project tools/Toolboxes, scaffolding, locally testing, deploying, invoking, or debugging Prompt and Hosted Agents | `foundryx access project list`, `foundryx connection list\|show`, `foundryx toolbox list\|show`, `foundryx agent *` | [Foundry Agents](#foundry-agents)<br>[Discover and reuse tools](references/tool-discovery.md)<br>[Prompt Agent tools](references/prompt-agent-tools.md)<br>[Hosted Agent Toolbox](references/hosted-agent-toolbox.md) |
| Administer tool resources | Explicitly requested connection configuration/credential lifecycle or Toolbox version/default/deletion administration; never an automatic builder fallback | `foundryx connection create\|update\|credentials set\|delete`, `foundryx toolbox create\|version create\|publish\|delete\|version delete` | [RemoteTool MCP connections](references/connection-create.md)<br>[Toolboxes & versions](references/toolbox.md) |
| Prepared trial resources | User explicitly asks for `GitHubToolbox`, `GitHubOAuthToolbox`, `WorkIQToolbox`, or Contoso enterprise documents/policies | `foundryx access project list`, `foundryx agent *` | [Prepared trial resources](references/prepared-resources.md)<br>[Contoso enterprise knowledge](references/contoso-knowledge.md) |
| Trace and diagnose Agents | Searching conversations, reconstructing traces, diagnosing failures or latency, or correlating response-level evaluation events | `foundryx agent trace query` | [Agent tracing](references/tracing.md) |
| Evaluate, monitor & publish Agents | Running Agent evaluations (`eval.yaml`), querying Application Insights operational metrics, or publishing a deployed Agent to M365/Teams | `foundryx agent eval *`, `foundryx agent metrics`, `foundryx auth publish *`, `foundryx agent publish\|publish-status` | [Inspect, diagnose, evaluate, monitor & publish](#step-6-inspect-diagnose-evaluate-monitor-and-publish)<br>[Agent evaluation](references/evaluation.md)<br>[Operational metrics](references/metrics.md)<br>[M365 / Teams publishing](references/publishing.md) |
| Open FoundryX canvas | User explicitly asks to list or view deployed Agents | `foundryx-canvas` canvas | [FoundryX Canvas](references/canvas.md) |

---

## Create a Foundry project

### Step 1: Check project creation permission & select subscription/region (`foundryx access project options`)

Run `foundryx access project options` first to check whether the signed-in user has permission to create a Foundry project and list eligible subscriptions and regions:

```text
foundryx access project options
```

- If `project options` fails (for example, `subscription_not_accessible`), stop and report the CLI permission error and hint directly.
- If multiple subscriptions are returned, ask the user to select a `--subscription <subscription-id>` and a `--region <region>` from that subscription's supported `regions`.

### Step 2: Inspect initial deployable models & quota (`foundryx access project models`)

When creating a Foundry project with an initial model deployment, list token-rate language models that have remaining regional quota in the selected subscription and region:

```text
foundryx access project models --subscription <subscription-id> --region <region>
```

Pick `--model-name`, `--model-version`, `--model-format`, and `--sku` from `project models`, with integer `--capacity` (thousands of TPM) `<= max_deployable_capacity`. If assigning an initial project Owner (`--owner <object-id>`), resolve a registered tenant user first via `foundryx access user list` or `foundryx access user find <name-or-upn>`.

### Step 3: Create the Foundry project (`foundryx access project create`)

- **Create a Foundry project**:
  ```text
  foundryx access project create <project-name> --subscription <subscription-id> --region <region> [--display-name <name>] [--description <text>] [--owner <object-id>] [--model-name <model> --model-version <version> --model-format <format> --sku <sku> --capacity <capacity> [--deployment-name <deployment>]]
  ```
  When including an initial model, pass all five model flags (`--model-name`, `--model-version`, `--model-format`, `--sku`, `--capacity`). Surface `model_error` (Foundry project created, initial model deployment failed) or `monitoring_error` (Foundry project created, Application Insights setup failed; recover with `observability setup`) if returned.
- **Enable/disable a Foundry project or recover Application Insights observability**:
  ```text
  foundryx access project list --manageable
  foundryx access project enable|disable <project-id>
  foundryx access project observability show|setup --project <project-id>
  ```

---

## Manage Foundry project access

Any user with management authority on a Foundry project (`can_manage: true` in `foundryx access project list --manageable`) can grant, update, or remove access on that Foundry project for a **single user**, an **Entra group**, or **all tenant users**.

### Step 1: Check manageable Foundry projects and inspect current access (`foundryx access member list`)

Run `foundryx access project list --manageable` to check which Foundry projects the signed-in user can manage and resolve `<project-id>` (pass the Foundry project UUID via `--project <project-id>`, never Azure ARM IDs or display names), then inspect current user, group, and tenant grants (`principal_type: "user" | "group" | "tenant"`) before changing or removing access:

```text
foundryx access project list --manageable
foundryx access member list --project <project-id>
```

### Step 2: Grant, update, or remove access by target type

- **Single user (`user`)**: If a target user is missing from `user list` or `member candidates`, run `foundryx access user find <name-or-upn>` first (searches Entra via delegated Graph access and registers matched users in FoundryX):
  ```text
  foundryx access user list
  foundryx access user find <name-or-upn>
  foundryx access member candidates --project <project-id>
  foundryx access member set <object-id> --role consumer|user|manager|owner --project <project-id>
  foundryx access member remove <object-id> --project <project-id>
  ```
- **Entra group (`group`)**: Search tenant groups in Entra (via delegated Graph access), grant or update a group's project role, list group members, or remove the group:
  ```text
  foundryx access member group find [query] --project <project-id>
  foundryx access member group set <group-id> --role consumer|user|manager|owner --project <project-id>
  foundryx access member group users <group-id> --project <project-id>
  foundryx access member group remove <group-id> --project <project-id>
  ```
- **All tenant users (`tenant`)**: Enable or update project access (`consumer` or `user` only) for every authenticated user in the tenant, or remove tenant-wide access:
  ```text
  foundryx access member tenant set --role consumer|user --project <project-id>
  foundryx access member tenant remove --project <project-id>
  ```

| Project Role | Who Can Assign / Remove | Capabilities |
|---|---|---|
| `consumer` | Project `owner` or project-creation / subscription manager | Lists, views, and calls project-owned models; invokes deployed Agents (supported for single user, group, or all tenant users). |
| `user` | Project `manager` (users & groups), `owner`, or project-creation / subscription manager | `consumer` + reads live `model catalog`; develops, deploys, evaluates, and publishes Agents; reads metrics and Hosted logs; configures `hosted-settings`; discovers/uses existing configured connections and Toolboxes but cannot change them (supported for single user, group, or all tenant users). |
| `manager` | Project `owner` or project-creation / subscription manager | `user` + assigns/removes project `user` role for users and groups; connection/Toolbox access remains discovery and reuse only. |
| `owner` | Project `owner` or project-creation / subscription manager | `manager` + assigns/removes all user and group roles (`consumer\|user\|manager\|owner`) and tenant-wide access (`consumer\|user`); administers connections, credentials and Toolbox versions/defaults; deletes connections, Toolboxes and Toolbox versions. |

---

## Foundry models

Project `consumer`+ can list, inspect, and call existing model deployments (`model list|show|call`), and project `user`+ can read the live `model catalog`. Checking `model quota` requires Subscription Owner, or both Contributor and User Access Administrator at subscription scope. Deploying, scaling, or deleting models (`model deploy|scale|delete`) also requires that authority unless project model management is enabled, in which case project `user`+ can perform those operations. A subscription manager can change the setting with `foundryx access project model-management enable|disable <project-id>`.

### Step 1: Inspect and call project-owned models (`foundryx model list|show|call`)

```text
foundryx model list --project <project-id>
foundryx model show <deployment> --project <project-id>
foundryx model call <deployment> "Hello" --project <project-id>
```

### Step 2: Check model catalog & regional quota (`foundryx model catalog|quota`)

Pick `--model-name`, `--model-version`, `--model-format`, and `--sku` from the live `model catalog` (`user`+) and verify `deployable: true` with integer `--capacity` (thousands of TPM) `<= max_deployable_capacity` in `model quota` (`deployable: null` means quota is unknown):

```text
foundryx model catalog --project <project-id>
foundryx model quota --project <project-id> [--deployable]
```

### Step 3: Deploy, scale, or delete a model deployment (`foundryx model deploy|scale|delete`)

FoundryX scales or deletes only deployments recorded as owned by `<project-id>`. Commands return their completed result; inspect the model before retrying an ambiguous upstream failure, then smoke-test with `model call`:

```text
foundryx model deploy --name <deployment> --model-name <model> --model-version <version> --model-format <format> --sku <sku> --capacity <capacity> --project <project-id>
foundryx model scale <deployment> <capacity> --project <project-id>
foundryx model delete <deployment> --project <project-id>
```

Regional capacity can still fail despite fitting quota; report quota or capacity errors directly without switching SKU, region, or capacity.

---

## Foundry Agents

Requires effective project `user`, `manager`, or `owner` (`consumer` may invoke deployed Agents).

Project permissions also restrict allowed models and tools. If discovery, local
`agent run`, or deployment fails for lack of permission, finish the requested source
and configuration using the known requirements. Report what is ready, which checks
are blocked, and the permission error; ask the user to contact their administrator.
Report deployment and runtime verification only when they succeed.

### Step 1: Select Foundry project, verify unique Agent name, and pick a ready model

Run `foundryx access project list` to resolve `<project-id>` (pass the UUID via `--project <project-id>`, or omit it when `foundryx.yaml` sets top-level `project`; if `project list` is empty, check `foundryx access project list --manageable` and grant yourself a project role via [Manage Foundry project access](#manage-foundry-project-access); ask the user to choose when multiple valid targets remain).

Choose the simplest path that satisfies the request: for generic requests ("create a sample agent"), build a tool-free Prompt Agent or `basic` Hosted Agent and ask only for Agent kind (`Prompt` vs `Hosted`) when unclear. Do not suggest or mention tools, MCP servers, connections, Toolboxes, Azure AI Search, or prepared trial resources unless the user asks for tools, external data, or a named resource.

- **Prepared trial resources**: When the user asks for Contoso documents, `GitHubToolbox`, `GitHubOAuthToolbox`, or `WorkIQToolbox`, read [Prepared trial resources](references/prepared-resources.md) (and [Contoso enterprise knowledge](references/contoso-knowledge.md) for Contoso policies) before choosing a project or sample.

```text
foundryx access project list
foundryx agent list --project <project-id>
foundryx model list --project <project-id>
```

1. **Exact name check**: Pipe full `agent list` JSON stdout into a local parser in the same shell command and return only `items` whose `name` exactly matches the candidate name (a truncated raw-list preview is not a completed name check). Pick a name unique across Prompt and Hosted Agents in `<project-id>`; reuse an existing name only when the user intends to update that Agent.
2. **Model check**: Set `agent.model` to a ready item's `name` (deployment name) from `model list`, never its underlying `model_name`.

### Step 2: Discover and reuse existing tools (only when tools are requested)

Read [Discover and reuse tools](references/tool-discovery.md). Use project `user`+
read-only discovery before configuring an Agent:

```text
foundryx connection list --project <project-id>
foundryx toolbox list --project <project-id>
foundryx connection show <name> --project <project-id>
foundryx toolbox show <name> [--version <version>] --project <project-id>
```

Inspect the selected resource's safe auth/compatibility metadata. Use supported
connections in Prompt tools; use an existing Toolbox's returned `endpoint` with a
Hosted `toolbox` sample. `toolbox show` inspects the published default, not the newest
unpublished version; `--version` returns a pinned endpoint. Discovery is configuration
only, never proof of working credentials, consent or execution. Verify after deployment.

Keep the builder path separate from resource administration. If a resource, index,
credential or authorization is missing, report it for the administrator; do not
create, publish, replace or repair resources automatically. Existing management
commands require Project Owner membership, including for subscription administrators, and
remain available only for separately explicit requests under
[Administer tool resources](#administer-tool-resources).

### Step 3: Initialize and configure `foundryx.yaml` and source

Never infer, request, print, or store credentials, headers, tokens, virtualenvs, or caches in `foundryx.yaml` or packaged source (`.agentignore` controls Hosted ZIP packaging; the service deploys it with the customer-tenant FoundryX service principal).

- **Prompt Agent (`kind: prompt`)**: Write `foundryx.yaml` with `version: 1`, `project: <project-id>`, and `agent` (`kind: prompt`, `name: <agent-name>`, `model: <deployment-name>`, `instructions`).
  - **Prompt Agent tools**: For `web_search`, `code_interpreter`, `azure_ai_search`, or direct public `mcp` under `agent.tools`, read [Prompt Agent tools](references/prompt-agent-tools.md).
- **Hosted Agent (`kind: hosted`)**: Pick the sample matching the tool boundary (`foundryx agent sample list`):
  - `basic`: no tools.
  - `tools`: in-process local Python functions only.
  - `toolbox`: an existing project Toolbox; use its inspected `endpoint` as `TOOLBOX_ENDPOINT` in `main.py` per [Hosted Agent Toolbox](references/hosted-agent-toolbox.md). Do not ask for an endpoint already returned by discovery, set `TOOLBOX_NAME`, or add custom env/tool fields to Hosted `foundryx.yaml`. Unknown native tool types remain runtime-dependent; do not claim universal compatibility.

  When the current working directory is empty, initialize into `.` instead of creating a subdirectory; choose a new `<directory>` only when the current directory already has content (`agent init` requires an empty destination):
  ```text
  foundryx agent init .|<directory> --sample basic|tools|toolbox
  ```
  Set `project: <project-id>`, `agent.name: <agent-name>`, and `agent.model: <deployment-name>` in `foundryx.yaml`.

### Step 4: Verify locally (`basic` and `tools` Hosted Agents only)

Never run `agent run` or `--local` for Prompt Agents or for Hosted Agents using the `toolbox` sample, `FoundryToolbox`, or `TOOLBOX_ENDPOINT` (the local gateway proxies model Responses only, not Toolbox MCP routes).

`agent run` creates `.venv`, installs `requirements.txt`, and runs `main.py` against a loopback FoundryX model gateway using the cached `foundryx auth login` session (Python is required locally; keep standard Foundry SDK code and `DefaultAzureCredential`—no `az login` or caller Azure RBAC is needed):

1. Start in a persistent shell from the directory containing `foundryx.yaml` (put `cd` and `agent run` in the same shell invocation when initialized in a subdirectory):
   ```text
   cd <agent-directory>; foundryx agent run
   ```
2. Read initial output once immediately after launch.
3. Poll TCP readiness on the configured loopback host and port (default `127.0.0.1:8088`, keeping the run port and invoke endpoint aligned; allow up to 5 minutes for dependency installation). After each failed TCP probe, verify the process is still active and read new output; a process exit ends polling immediately—surface its output and fix the startup error before continuing.
4. Once TCP is open, smoke-test with default text output while keeping the run session alive:
   ```text
   foundryx agent invoke "Hello" --local
   ```

### Step 5: Deploy, invoke remotely, and hand off

After `foundryx agent deploy` reports success, follow [references/canvas.md](references/canvas.md)
and open the `foundryx-canvas` canvas, then continue with remote verification and any
remaining requested work.

```text
foundryx agent deploy
foundryx agent invoke "Hello"
```

`agent deploy` writes `deployment.agentId`, `version`, and `endpoint` to `foundryx.yaml`. Use default text output for smoke tests; reserve `--json` for diagnostics or inspecting `tool_calls`, reasoning items, and `encrypted_content`. Outside the source directory, pass `--agent-id <agent-id> --project <project-id>`.

- **Identity delegation & OAuth consent**: Deployed Hosted Agent calls delegate the signed-in user's identity by default (`--delegate-user-identity` explicitly enables; `--no-delegate-user-identity` opts out for app-only calls; Prompt and `--local` calls remain non-delegated). Hosted delegation requires the project's separate impersonation permission—report permission failures instead of retrying with delegation disabled. On `oauth_consent_required`, surface the exact consent URL and follow [Hosted Agent Toolbox](references/hosted-agent-toolbox.md).

After successfully creating or first deploying an Agent, finish with this exact structure using observed values (`Not run` for unperformed verification; omit only inapplicable fields; for a combined build-and-publish request, finish `agent publish` first and report both creation fields and the observed publishing outcome without implying admin approval):

**Agent created**

- Work completed: <what was created, deployed, and verified>
- Name: `<agent-name>`
- Kind: `<Prompt or Hosted>`
- Agent ID: `<agent-id>`
- Project: `<project-name>`
- Project ID: `<project-id>`
- Model deployment: `<model-deployment-name>`
- Tools: <tool summary or `None`>
- Verification: <result or `Not run`>

Send the prompt in current session:

```text
Invoke the deployed agent with: <one-sentence message to the Agent>
```

Or invoke it from the CLI:

```text
foundryx agent invoke "<shell-safe prompt>" --project <project-id> --agent-id <agent-id>
```

Always include the observed `--project` and `--agent-id` so the CLI command works independently of the current directory. The first code block must begin with `Invoke the deployed agent with:` and append one natural-language sentence demonstrating the Agent's intended purpose; use only that appended sentence as the CLI input, free of unnecessary shell quoting (if quoting is needed, emit a command that can be pasted into the user's current shell).

### Step 6: Inspect, diagnose, evaluate, monitor, and publish

- **Runtime inspection, logs, conversations, and lifecycle**: `agent list|show` returns the persisted `endpoints` protocol-to-URL mapping. Continue an existing conversation only when the user intends to do so; default `hosted logs` (use `--json` for raw output) selects the signed-in user's latest session for that Agent, including a failed invoke when Foundry returned a session ID. `hosted refresh|enable|disable` returns its completed result; inspect the Agent before retrying an ambiguous upstream failure:
  ```text
  foundryx agent show <agent-id> --project <project-id>
  foundryx agent hosted logs <agent-id> --type console|system [--tail <1-300>] [--conversation-id <id>] --project <project-id>
  foundryx agent hosted refresh|enable|disable <agent-id> --project <project-id>
  foundryx agent hosted-settings show|set [--cpu <cpu> --memory <memory>] --project <project-id>
  foundryx agent invoke "Continue" --conversation-id <conversation-id>
  foundryx agent conversation show|delete <conversation-id>
  foundryx agent delete <agent-id> --name <agent-name> --project <project-id>
  ```
- **Operational metrics (`foundryx agent metrics`)**: Query or chart run-state events, tokens, tool calls, error rate, dependency errors, or success rate (`foundryx agent metrics --list`, `foundryx agent metrics <agent-id> --metric <metric...>`). Read [Operational metrics](references/metrics.md).
- **Agent tracing (`foundryx agent trace query`)**: Resolve Foundry IDs with the read-only show commands, execute KQL, and analyze the returned spans, errors or latency. Read [Agent tracing](references/tracing.md).
- **Agent evaluation (`foundryx agent eval`)**: Drive the five-step evaluation flow (`eval.yaml` in the Agent directory by default, native Foundry assets/evidence, no azd/MCP/custom Python scripts). Read [Agent evaluation](references/evaluation.md).
- **M365 / Teams publishing (`foundryx agent publish`, `foundryx auth publish`)**: Never publish automatically after an ordinary deployment. Publish an existing ready Agent without rebuilding/redeploying it (or continue after deploy+invoke when both were requested), reusing known metadata and bundled icons/URL defaults. Read [M365 / Teams publishing](references/publishing.md).

## Administer tool resources

This is separate from the normal developer workflow. Only for an explicit resource
administration request, follow [RemoteTool MCP connections](references/connection-create.md)
or [Toolboxes & versions](references/toolbox.md). All non-delete connection/Toolbox
writes require Project Owner membership. This includes replacement, credential rotation, immutable version creation
and default publishing, regardless of the resource's creator. Project Users,
Managers and Agent developers can only discover and reuse existing configured
resources; an explicit creation request does not grant write authority.
Subscription administrators also need Project Owner membership for all tool
writes, including deletion. Do not request Azure credentials or change membership
to bypass this requirement.

Inspect current configuration, explain shared-consumer impact and obtain user
approval before issuing an impactful write. Commands write directly, with no
preview plans or dry-run. `connection create --force` only permits explicit
replacement; never bypass role, dependency or immutable-version checks. Pipe
credentials through protected stdin, never ask for them in chat or write them into
files. CustomKeys updates require the complete fresh set; no secret readback is
available. On `unknown`, reconcile native state rather than repeat the mutation.
Metadata success is not runtime credential verification. No OAuth/provider
provisioning, Entra grants or external access repair is implied.
