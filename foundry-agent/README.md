# Foundry Agent (preview)

GitHub Copilot plugin for FoundryX-managed Microsoft Foundry projects. It includes
the `foundry-agent` skill and the `foundry-canvas` Agent canvas. It does not change
the existing `microsoft-foundry` plugin or provide the native `azd ai` workflow.

## Prerequisites

- Install the matching FoundryX CLI separately. The executable is `foundry` and
  requires Node.js 20 or later.
- Retain the CLI service profile for the FoundryX environment you intend to use.
  This plugin contains no service profile and does not select an environment.
- Use GitHub Copilot App with canvas extension support for the graphical view.
  The skill can also be used in a compatible Copilot CLI session.

The plugin never installs the CLI, signs in or grants permissions automatically.
Verify the installed CLI and complete sign-in when needed:

```text
foundry --version
foundry auth status
foundry auth login
```

## Install

After this directory is published on the repository's default branch:

```text
copilot plugin install microsoft/foundry-dev-tools:foundry-agent
```

For a local checkout, replace the placeholder with the path of its `foundry-agent`
directory:

```text
copilot plugin install <path-to-foundry-agent>
```

Start a new Copilot session after installation. Use `copilot plugin list` to
confirm the `foundry-agent` plugin is enabled. A local install is cached; reinstall
it after changing the local package.

Do not load duplicate copies of the same skill/canvas. Before activating this
plugin, remove or disable a separately installed `foundry-agent` skill and the
standalone `foundry-canvas` extension. Inspect their locations first and remove
only those exact components; do not delete shared Copilot configuration or the
CLI credential cache. The native `microsoft-foundry` plugin can remain installed:
its builder canvas uses a different canvas ID.

## Use

Invoke `/foundry-agent` for FoundryX workflows. In clients that qualify plugin
components, select the `foundry-agent` skill from this plugin in the skill picker.
It discovers projects and tools, builds and operates Agents, and uses the hosted
FoundryX API through the installed CLI.

For a graphical list of deployed Agents, ask Copilot to open the FoundryX Agent
canvas. The skill opens it directly; no separate open command is needed.
The canvas shares the CLI account and OS credential cache. Sign-out in either also
signs out the other. Opening the canvas does not publish or modify an Agent.

Project Users and Managers discover and reuse configured connections/Toolboxes.
All connection/Toolbox writes require effective Project Owner membership, even
for subscription administrators. Per-user tool consent remains a manual action.
Deployment, invocation, evaluation and publishing can incur costs; ordinary
deployment does not automatically publish an Agent to Microsoft 365 or Teams.

## Package layout

```text
foundry-agent/
  plugin.json
  skills/foundry-agent/SKILL.md
  skills/foundry-agent/references/
  com.github.copilot/extensions/foundry-canvas/
    extension.mjs
    cli-bridge.mjs
    public/
```

This is an Agent Plugins 1.0 package, matching the format used by
`microsoft-foundry@awesome-copilot`. The existing canvas runtime and UI are
packaged without replacing their transport or authentication.

Plugin updates distribute the skill and canvas together. They do not update the
separate CLI. The manifest version matches the packaged skill/CLI source version;
verify that the installed CLI is a matching build before using the plugin.

This is a test plugin for later integration into `microsoft-foundry`, not a
separate marketplace listing. Its generated contents come from the FoundryX
source repository; update the source and re-export rather than editing this copy.
Review public changes before committing or pushing. No credentials, tenant
inventory, native connection definitions or CLI installation packages are included.
