# Toolboxes

For normal Agent building, use read-only `toolbox list`, `show [--version]` and
`version list`; follow [Discover and reuse tools](tool-discovery.md). These return
safe JSON configuration summaries, not credentials or proof of runtime health.

The remaining guide is **resource administration**, only for an explicit mutation
request. Project Owners can create/version/publish/delete any project Toolbox.
Subscription administrators also need Project Owner membership.
Normal developers can only discover and reuse configured Toolboxes.
Creator ownership is not a separate permission check. Mutations write directly,
wait for their operation and default to `--output table` (`--output json` for JSON).
No plans, dry-run or definitions/credentials persisted by FoundryX are involved.

- **Hosted Agent integration**: Reuse an existing Toolbox for the builder path.
  When explicitly provisioning new MCP resources, create the connection before its
  Toolbox. Creating a Toolbox does not attach it to an Agent. Do not call a Toolbox
  MCP endpoint directly; verify through `foundryx agent invoke`. Read
  [Hosted Agent Toolbox](hosted-agent-toolbox.md).

## Toolbox definition schema

Write a complete snapshot to a YAML or JSON file (`description`, optional `metadata`, `tools`, optional `policies`). Foundry validates tool schemas; assign explicit `name` fields when combining multiple tools:

Native OpenAPI `spec` and tool `parameters` schemas are passed through as schema
data, not interpreted as credentials or connection references. Keep actual
authentication material in project connections.

```yaml
description: Web research and Python analysis
tools:
  - type: web_search
    name: web
  - type: code_interpreter
    name: python
    container:
      type: auto
```

- `web_search` and `code_interpreter` (`container.type: auto` provisions a Foundry sandbox container) are connectionless.
- For MCP tools, supply the native `server_label` and server address as well as the
  same-project `RemoteTool` connection name from
  [RemoteTool MCP connections](connection-create.md). `name` does not replace
  `server_label`, and a connection reference alone is not a complete native MCP
  tool definition. Use the connection's reviewed target as `server_url`; the URL
  is configuration, not a credential. Never embed headers, tokens or secrets.

```yaml
description: Microsoft Learn documentation tools
tools:
  - type: mcp
    name: docs
    server_label: docs
    server_url: https://learn.microsoft.com/api/mcp
    project_connection_id: existing-docs-connection
    require_approval: never
```

## Create a Toolbox (`foundryx toolbox create`)

```text
foundryx toolbox create <toolbox-name> --from-file <definition-file> --project <project-id> [--output json]
```

Posting the first version implicitly creates the Toolbox, sets that version as the default, and returns `<toolbox-name>`, immutable `version`, and `endpoint`.

## Version or roll back (`foundryx toolbox version create`, `foundryx toolbox publish`)

```text
foundryx toolbox version create <toolbox-name> --from-file <definition-file> --project <project-id> [--output json]
foundryx toolbox publish <toolbox-name> <version> --project <project-id> [--output json]
```

`version create` leaves the default unchanged. Run `toolbox publish` (`{ "default_version": "<version>" }`) to promote a new version or roll back to an earlier `<version>` without creating another version. On failure, inspect `error.code` and `error.message`; on `unknown`, compare the FoundryX record with Foundry state before retrying.

## Owner-only deletion

```text
foundryx toolbox version delete <toolbox-name> <version> --project <project-id>
foundryx toolbox delete <toolbox-name> --project <project-id>
```

The API rejects deleting the current default version, known native references or
an incomplete dependency scan. Select another default explicitly before deleting
that version. Whole-Toolbox deletion removes every version; no dependent Agents or
connections are deleted automatically. There is no force-delete.

Scans include available native Toolbox and Agent versions, not exhaustive Hosted
source/external consumers. Explain this boundary and the shared-consumer impact
before asking for approval. `absent` means no delete was submitted. Post-write
readback failures and ambiguous mutations are `unknown`, not automatic retries.
Referenced connections must exist in the selected project. Keep credentials and
headers in those connections, never embedded in Toolbox definitions.
