# Prepared trial resources

Read this only when the user explicitly asks for one of these prepared resources (or asks for a knowledge-connected Agent and agrees to use a prepared one); do not suggest them for ordinary requests such as "create a sample agent".

Run `foundryx access project list`:
- **If `foundryx-poc` is in the user's accessible projects**: `foundryx-poc` is pre-provisioned for private-preview users with these trial Toolboxes and Contoso knowledge resources already set up—recommend selecting `foundryx-poc` and do not create duplicate connections or Toolboxes.
- **If the user does not have `foundryx-poc`**: Tell the user that an admin needs to set up a new project, connection, or Toolbox in their own environment (any project/resource name works; it does not need to be named `foundryx-poc`) following [RemoteTool MCP connections](connection-create.md) and [Hosted Agent Toolbox](hosted-agent-toolbox.md).

- **Contoso enterprise documents**: Read [Contoso enterprise knowledge](contoso-knowledge.md).
- **Dedicated custom Toolbox**: Read [Hosted Agent Toolbox](hosted-agent-toolbox.md).

Before configuring an Agent, confirm the selected resource through `toolbox show`
in the selected project. Use the returned endpoint and inspect safe auth/tool
summaries. Do not create a duplicate if the resource is missing; ask its administrator.

## Prepared Hosted Agent Toolboxes

Initialize with `foundryx agent init [directory] --sample toolbox`, set `project`
to the selected project's UUID in `foundryx.yaml`, and use the exact `endpoint`
returned by `toolbox show` as `TOOLBOX_ENDPOINT` in `main.py`. Preserve an explicit
`--version` pin; do not reconstruct a consumer URL that would discard it. The
endpoint patterns below identify the prepared resources, not an override of an
inspected endpoint. Deploy and invoke remotely (skip local `agent run` / `--local`):

| Resource | Purpose & Auth | `TOOLBOX_ENDPOINT` (`https://<account>.services.ai.azure.com/api/projects/<project>/toolboxes/<Toolbox>/mcp?api-version=v1`) | Runtime behavior & guardrails |
|---|---|---|---|
| `GitHubToolbox` | Read-only GitHub MCP using a shared credential | `.../toolboxes/GitHubToolbox/mcp?api-version=v1` | Verify through deployed invocation; the administrator-managed PAT must remain valid. Rotate expired credentials through its administrator, not by switching the invoking user's login. |
| `GitHubOAuthToolbox` | Read-only GitHub MCP acting as each invoking user's own GitHub account | `.../toolboxes/GitHubOAuthToolbox/mcp?api-version=v1` | Require `agent-framework-foundry-hosting>=1.0.0b260910` in `requirements.txt` and keep default user identity delegation (never pass `--no-delegate-user-identity`). First invoke per user returns `oauth_consent_required` (per-user consent, not shared); follow [Hosted Agent Toolbox](hosted-agent-toolbox.md). |
| `WorkIQToolbox` | Preview Microsoft 365 email, meetings, files, and chats for the invoking user | `.../toolboxes/WorkIQToolbox/mcp?api-version=v1` | Same `requirements.txt`, delegation, and per-user Entra `oauth_consent_required` flow as `GitHubOAuthToolbox`. New mailboxes/calendars return empty results until indexed. After consent: `response_incomplete` means no M365 license/mailbox or a guest account; `"Error: Function failed."` means M365 licensed without Copilot license or Copilot Credits policy. Report that a member account with M365 + Copilot entitlement is required—do not retry repeatedly, disable delegation, or change the Toolbox. |

