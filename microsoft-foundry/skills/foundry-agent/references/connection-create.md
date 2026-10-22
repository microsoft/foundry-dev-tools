# RemoteTool MCP connections

This guide is resource administration, not the normal Agent builder path. For
admin-created resources, use `connection list` / `connection show` and follow
[Discover and reuse tools](tool-discovery.md). Never create/replace a connection
automatically because discovery or invocation failed.

Requires Project Owner membership, including for subscription administrators,
and a customer Foundry account onboarded with built-in Foundry Project Manager
assigned to the backend app. Project Users and Managers can discover/reuse existing configured
connections but cannot create or change them. For an MCP-backed Hosted Agent,
complete `connection create` before `toolbox create`.

Hosted Toolbox connections can use private/query-bearing HTTPS endpoints and
custom HTTPS ports, subject to native network support. These are not necessarily
valid direct Prompt MCP targets; inspect compatibility before choosing that path.

```text
foundryx connection create <name> \
  --kind remote-tool \
  --target https://example.com/mcp \
  --auth-type none|custom-keys|project-managed-identity|agentic-identity \
  [--audience <audience>] \
  [--custom-key <key=value>...] \
  [--credentials-stdin] \
  [--metadata <key=value>...] \
  [--force] \
  [--output table|json] \
  --project <project-id>
```

| `--auth-type` | Required options | Consumer / Agent support & rules |
|---|---|---|
| `none` | `--target` | Public unauthenticated HTTPS MCP endpoint. Supported by both Prompt `agent.tools` (`type: mcp`) and Toolboxes. |
| `custom-keys` | `--target`, complete keys via `--credentials-stdin` (preferred) or legacy `--custom-key <name=value>` | Static headers/keys. Legacy flags split on the first `=` and the last duplicate wins. Sent to FoundryX/Azure, never stored or returned. Avoid placing real secrets in docs, logs, transcripts or command arguments. Supported by Prompt `agent.tools` and Toolboxes. |
| `project-managed-identity` | `--target`, `--audience <audience>` | App-only Entra token using the project managed identity (all consumers act with that shared identity, not their own). Supported by Hosted Agents via a Toolbox only (never direct Prompt MCP). |
| `agentic-identity` | `--target`, `--audience <audience>` | App-only Entra token using the Agent identity (unpublished project Agents may share one identity; all consumers act with that shared identity). Supported by Hosted Agents via a Toolbox only. |

- **Identity authorization**: Authorizing the project or Agent identity on the target MCP server is handled separately by its owner; do not assign Azure/Entra roles as part of this workflow. Configure only trusted targets, as Foundry sends an Entra token for `--audience` to `--target`.
- **Overwrite**: Pass `--force` only when the user intends to replace an existing named connection. It does not bypass permissions, supported schemas or safe preservation of native properties.

## Update, replace credentials and delete

These direct API operations use the existing backend identity. Every write
requires Project Owner membership; Azure subscription authority is not a
substitute and no delegated ARM token is needed. Owners can update any supported
project connection or replace its credentials regardless of its creator.
There are no preview plans, dry-run or force-delete.

```text
foundryx connection update <name> --from-file connection.yaml --project <project-id>
foundryx connection update <name> --from-file connection.yaml --credentials-stdin --project <project-id>
foundryx connection credentials set <name> --credentials-stdin --project <project-id>
foundryx connection delete <name> --project <project-id>
```

The update file contains only `target`, `metadata` and/or `audience`, never
credentials. Metadata replaces the complete map; target/auth changes may affect
every consumer. Use explicit `create --force` for a supported auth-family
replacement. The API rejects native fields/auth modes it cannot safely preserve.

For CustomKeys, pipe a JSON map of header/key names to values from a protected
secret source using `--credentials-stdin`. Both configuration updates and
credential-only replacement require the complete fresh set; no hidden credentials
are read or merged. Do not put secrets in chat, source/configuration files, shell
history or process arguments. Prefer stdin over legacy `--custom-key`.

Deletion blocks known native Toolbox/Agent references and failed scans. Hosted
code and external references are not exhaustively discoverable; explain that
limitation, do not claim definitely unused, and never cascade or force deletion.
An already absent connection is reported as absent without submitting deletion.

Writes require metadata readback but never claim valid external credentials or
execution. On `unknown`, inspect state before another explicit recovery attempt.
OAuth configuration, external consent/identity grants and provider registrations
remain outside this administration release.
