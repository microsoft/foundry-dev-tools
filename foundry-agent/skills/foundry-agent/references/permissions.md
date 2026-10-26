# Project permissions and access diagnostics

Use this workflow to inspect personal access, create or remove a project Permission,
manage its model/tool policy or members, or diagnose an authorization failure.
A Permission registers one native Foundry project and has one shared resource policy.

## Inspect your access

```text
foundryx access show
foundryx access show --project <project-id>
```

The first command lists accessible projects and whether subscription management was
verified. The project view includes the effective role, matching direct/group/tenant
grants, project state, model-management setting, resource policies and capabilities.
Any project member, including a Consumer, can inspect their own access and restrictions.
Use the project UUID for `--project`; native resource IDs are used only for discovery/import.

`null` in `allowed_models` or `allowed_tools` means unrestricted, `[]` means none,
and an array allows only the listed resources. Model entries are deployment names;
tool keys are `builtin:<type>`, `connection:<name>` or `toolbox:<name>`.
These policies apply to every member of the project. MCP function `allowed_tools`
inside an Agent definition is a separate filter within that server.

Capabilities describe project-level authority. Check the actual operation and target
before preparing a deployment or explaining a refusal:

```text
foundryx access check --project <project-id> --action agent.deploy --model <deployment> --tool toolbox:<name>
foundryx access check --project <project-id> --action agent.invoke --agent-id <agent-id>
foundryx access check --project <project-id> --action agent.delete --agent-id <agent-id>
foundryx access check --project <project-id> --action permission.delete
foundryx access check --project <project-id> --action member.set --principal-type user --principal-id <object-id> --role user
```

Use action names from `capabilities`. Include every declared tool resource for an
Agent deployment; omit `--tool` for a tool-free Agent. Checks perform no mutations.
`allowed: false` identifies a blocking rule; `allowed: null` means access
could not be verified. A denied or unverified check exits nonzero after its JSON result.
Passing authorization does not verify runtime
health, downstream consent, native credentials, dependency checks or name confirmation.
The requested operation always rechecks current access.

## Required authority

An administrator here has Subscription Owner, or both Contributor and User Access
Administrator at subscription scope. This is separate from a FoundryX project role.
The effective project role is the highest matching user, group or tenant grant.

| CLI operation | Required authority |
|---|---|
| `access show`, `project policy show/resources`, `member group users` | Any project member for their own project; subscription administrators can inspect managed projects |
| `project create`, first `project import`, `project delete` | Subscription administrator; import/delete use delegated management access |
| `project policy set` | Project Owner or subscription administrator |
| `project enable/disable`, `project model-management enable/disable`, monitoring show/setup | Subscription administrator |
| `member list/candidates`, group search | Project Manager, Owner or subscription administrator |
| User/group `set/remove` | Project Manager for User grants only; Project Owner or subscription administrator for all roles |
| Tenant `set/remove` | Project Owner or subscription administrator; only Consumer/User can be assigned |
| `model list/show/call`, deployed `agent invoke` | Project Consumer or higher, plus resource policy |
| `agent conversation show/delete`, `agent response show` | The caller's own conversation and current project membership |
| `model catalog`; Agent develop/deploy/list/show/delete/evaluate/publish/metrics/tracing/Hosted operations; connection/Toolbox discovery | Project User or higher; resource policies and operation-specific checks still apply |
| `model quota` | Subscription administrator |
| `model deploy/scale/delete` | Subscription administrator, or Project User or higher when project model management is enabled; scale/delete must also satisfy the model policy |
| Connection configuration/credentials/delete; Toolbox create/version/publish/delete | Project Owner; subscription authority alone does not grant this role |

`allowed_models` applies to existing deployments, including models deployed outside
FoundryX. Successful FoundryX deployments automatically join the Permission's explicit
allowlist.

Directory discovery additionally needs delegated Graph access. Publishing has separate
same-user sign-in and native setup; see [Publishing](publishing.md). Agent deletion
accepts registered imported Agents as well as new Agents.

## Create, update or delete a Permission

Discover native projects and resource choices using the signed-in administrator:

```text
foundryx access project options
foundryx access project discover --subscription <subscription-id>
foundryx access project resources <native-project-resource-id>
```

Build the native project resource ID from the discovered subscription, resource group,
account and project name when needed:
`/subscriptions/<subscription>/resourceGroups/<group>/providers/Microsoft.CognitiveServices/accounts/<account>/projects/<project>`.
Discovery reads existing resources; it does not register the project or grant access.

Write the intended policy to a JSON file, for example:

```json
{
  "allowed_models": ["gpt-4.1-mini"],
  "allowed_tools": ["builtin:web_search", "connection:search", "toolbox:research"]
}
```

```text
foundryx access project import --subscription <subscription-id> --resource-group <group> --account <account> --name <native-project-name> --policy-file <policy.json>
foundryx access project policy show --project <project-id>
foundryx access project resources --project <project-id>
foundryx access project policy set --project <project-id> --file <policy.json>
foundryx access project delete <project-id> --name <exact-permission-name>
```

First import requires both policy fields. Policy updates preserve omitted fields;
provide an explicit `null` or `[]` to change a field to all or none. Inspect the policy
after updating. A completed reimport preserves the saved policy and membership;
use `policy set` to change its restrictions. Failed imports retain their saved policy;
retry `project import <native-project-resource-id>` without a policy file to keep it.

After import, use the returned project UUID to grant the intended users/groups a role.
An administrator needs a project role for Agent work, even if they can manage the Permission.
Deleting a Permission removes platform registration and access while retaining the native
Foundry project, Agents, models and tools. `agent delete` separately deletes the native
Agent and requires the exact Agent display name through `--name`.

## Manage members

Inspect `access member list --project <project-id>` before making changes. When a
user is unknown to FoundryX, `access user find <name-or-upn>` searches Entra and registers
matching users. Directory lookup and group creation require delegated Graph access;
updating an existing group grant does not repeat directory discovery.

```text
foundryx access user find <name-or-upn>
foundryx access member candidates --project <project-id>
foundryx access member set <object-id> --role <role> --project <project-id>
foundryx access member remove <object-id> --project <project-id>
foundryx access member group find [query] --project <project-id>
foundryx access member group set <group-id> --role <role> --project <project-id>
foundryx access member group users <group-id> --project <project-id>
foundryx access member group remove <group-id> --project <project-id>
foundryx access member tenant set --role consumer|user --project <project-id>
foundryx access member tenant remove --project <project-id>
```

## Diagnose a refusal

Read the error code and hint, then use `access show` and the relevant `access check`.
Separate a missing project role, a disallowed model/tool, a disabled/incomplete
Permission, and missing administrator or downstream setup. Report the specific
requirement and who can resolve it. Subscription access that could not be verified
is not evidence that the user lacks the role. An inaccessible project remains
unavailable to the caller; resolve it from their accessible project list.

Choose only ready models and discovered connections/Toolboxes with `allowed: true`.
For Toolbox reuse, check the Toolbox and its referenced connections. If the user's
requested project, model, or tool is blocked by permissions (for example, `allowed: false`
or missing project/model/tool access), ask the user to confirm whether to write the
Agent code and `foundryx.yaml` first without running `foundryx agent deploy` so they
are unblocked locally. When confirmed, complete the requested source and configuration
from known requirements, skip deployment and blocked runtime verification, and report
what is ready alongside the blocked checks without claiming deployment or runtime
success. Request a role/policy change from the appropriate administrator rather than
granting yourself broader access automatically.
