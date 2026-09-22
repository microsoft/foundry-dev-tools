# Microsoft Foundry Canvas Changelog

Notable changes to the Microsoft Foundry Canvas plugin for GitHub Copilot App.

## Version 1.0.14

This release keeps Canvas alongside ongoing Copilot Chat work, adds a command to open Canvas directly, and refreshes setup and agent creation while improving local inspection and approval continuations.

### Added

- **Open Canvas command**: Open Canvas directly with `/open-foundry-canvas`.

### Changed

- **Chat and Canvas workflows**: Canvas opens alongside supported agent workflows without interrupting Chat.
- **Setup experience**: Clearer sign-in and project controls, improved theme readability, and **Create new agent** in the agent dropdown.
- **Agent creation**: Progress appears below the starting prompt, sections expand to match the request, and actions stay locked until the agent is ready.
- **Preview branding**: Canvas and browser-tab titles now include **(Preview)**.
- **Project context**: Appended prompts omit subscription and tenant IDs.
- **Plugin packaging**: Adopt Agent Plugins 1.0 with the runtime, Inspector, skills, and commands in one package. Related: [#676](https://github.com/microsoft/foundry-dev-tools/issues/676).

### Fixed

- **Startup**: Prevent sign-in flicker while restoring the account and project; offer **Retry** on failure.
- **Background activity**: Background synchronization and refresh logs no longer clutter Chat.
- **Local inspection**: Launch `azd` directly without shell probes or `AI_AGENT` setup.
- **Agent Inspector approvals**: Preserve continuation replies and keep tool outputs attached to their original Chat cards.
- **Agent Inspector responses**: Preserve output and failure details when responses include `error: null`.

## Version 1.0.13

This release simplifies project selection across Chat and Canvas, adds directory switching and feedback surveys, and improves Hosted Agent validation and Agent Inspector details.

### Added

- **Directory selection**: Use **Switch directory** to choose a Microsoft Entra directory or enter a Tenant ID. Canvas remembers the selection and uses it for sign-in, resource discovery, and project context. Related: [#755](https://github.com/microsoft/foundry-dev-tools/issues/755).
- **Saved projects**: Copilot can offer the Canvas-selected Foundry project during agent creation, so you can reuse it without manually copying its endpoint. Related: [#751](https://github.com/microsoft/foundry-dev-tools/issues/751).
- **Local agent port**: Set `AGENTDEV_PORT` before loading the extension to use a different local agent port for startup, readiness checks, and Inspector connections. The default remains `8088`.
- **Feedback survey**: Share your experience through a Canvas feedback dialog with **Take survey**, **Not now**, and **Don't show again**. Reminder and opt-out choices persist across sessions. Related: [#761](https://github.com/microsoft/foundry-dev-tools/issues/761).
- **Agent Inspector filters**: Filter Responses Events and Tools by run. Event counts, Copilot actions, copy, and download use the same filtered event selection.

### Changed

- **Chat and Canvas workflows**: Configuration and deployment stay in Chat by default unless you explicitly request Canvas. The remembered **Continue in Chat** or **Open Foundry Canvas** choice now applies only to interactive inspection and testing.
- **Hosted Agent validation**: Validate one agent per run using `agentPath` or the current folder. Reports support titled guidance links and multiline source locations, with status tabs ordered as **Feedbacks**, **Passed checks**, **Inconclusive**, and **Not applicable**. Existing reports remain supported.
- **Agent Inspector details**: Responses Preview mode hides unsupported Visualization and Input & Output views, keeps Tokens, Events, and Tools available with consistent empty states, and improves control accessibility.
- **Agent Inspector failures**: The Overview run timeline now shows client- and server-reported failure details.

### Fixed

- **Project synchronization**: Choosing a Foundry project in Copilot Chat now updates the saved selection and live Canvas without reopening it or requiring a second selection. Stale deployment results no longer overwrite the new project's state. Related: [#752](https://github.com/microsoft/foundry-dev-tools/issues/752).
- **Agent creation status**: The creation-progress message clears when Chat stops or becomes idle, even if an event is missed. Older responses no longer restore a completed creation state.
- **Default view**: Opening or refocusing Canvas without an explicit intent or agent now shows creation for an empty workspace and management for an existing agent.
- **Validation fixes**: Remediation reruns stay targeted to the original report's agent directory.
- **Agent Inspector connections**: Late discovery results from a previous runtime no longer display stale data, select the wrong scenario, or trigger duplicate replacement requests.

## Version 1.0.12

This release gives you more control over Chat and Canvas workflows, refines Hosted Agent validation, and improves sign-in, project selection, and Agent Inspector reliability.

### Added

- **Hosted Agent validation**: The plugin now includes the validation adapter skill and a welcome screen for validation reports.

### Changed

- **Chat and Canvas workflows**: Choose Chat/CLI or Canvas for supported existing-agent operations when no preference is set. Your explicit choice stays active throughout the conversation until you change it.
- **Foundry skill**: Skill synchronization now runs in the background without delaying Canvas prompts or agent creation.
- **Hosted Agent validation**: Successful reports are easier to identify, and **Fix with Copilot** requests include only findings that require action.

### Fixed

- **Project selection**: The selected Foundry project remains unchanged during discovery refreshes, and stale selection updates are ignored.
- **Sign-in**: Subscriptions and projects load only after sign-in is confirmed. Subscriptions refresh after sign-in, and stale discovery responses no longer overwrite the current state.
- **Agent Inspector input**: The message input remains usable on macOS when native scrollbars are enabled. Related: [#740](https://github.com/microsoft/foundry-dev-tools/issues/740).
- **Agent Inspector connections**: Connection health checks and recovery are more reliable, and startup timeout messages clear after the agent reconnects. Related: [#741](https://github.com/microsoft/foundry-dev-tools/issues/741).
- **Agent Inspector theme**: The embedded Inspector now follows the host's light or dark theme. Related: [#743](https://github.com/microsoft/foundry-dev-tools/issues/743).

## Version 1.0.11

This release adds clearer validation reports and Copilot fix actions, keeps troubleshooting in Chat, and improves local inspection.

### Changed

- **Hosted Agent validation**: Reports now have status tabs, expandable findings, responsive layouts, and individual or bulk **Fix with Copilot** actions.
- **Chat and Canvas workflows**: Troubleshooting, code reviews, planning, informational questions, and mixed fix-and-deploy requests stay in Chat instead of opening Canvas unexpectedly.
- **Local inspection**: The integrated terminal stays visible while the agent starts so launch errors remain accessible.

### Fixed

- **Agent Inspector**: Copy and download actions now work in the embedded Inspector, and the back icon is correctly aligned.

## Version 1.0.10

This release introduces Hosted Agent best-practice validation and shows agent-creation progress in Canvas.

### Added

- **Hosted Agent validation**: Review Hosted Agent best-practice findings in a dedicated validation report Canvas.
- **Agent creation**: Canvas now opens while Copilot creates an agent from a concrete request and shows creation progress. Editing stays unavailable while Copilot is working, while sign-in remains accessible.

### Fixed

- **Foundry skill**: Skill updates now run one at a time to prevent overlapping installations.
- **Plugin updates**: Update guidance now points to **Customize > Installed > Plugins**.

## Version 1.0.9

This release improves Azure Developer CLI detection after installation.

### Fixed

- **Azure Developer CLI**: Canvas now refreshes `azd` detection after installation instead of continuing to report that the CLI is unavailable. Related: [#708](https://github.com/microsoft/foundry-dev-tools/issues/708).

## Version 1.0.8

This release streamlines agent creation and management, adds Azure Developer CLI installation guidance, and improves theme readability and skill updates.

### Added

- **Azure Developer CLI**: Use **Install azd** guidance when the CLI is unavailable.

### Changed

- **Agent creation**: Concrete creation requests no longer require a second submission through **Start**. Guided creation remains available for requests without a concrete purpose. Related: [#694](https://github.com/microsoft/foundry-dev-tools/issues/694).
- **Agent management**: Supported existing-agent configuration and redeployment workflows now open Canvas in management mode. Related: [#695](https://github.com/microsoft/foundry-dev-tools/issues/695).
- **Themes**: Controls have clearer contrast, selected states, and readability in light and dark themes. Related: [#717](https://github.com/microsoft/foundry-dev-tools/issues/717).
- **Foundry skill**: Installation and updates now use stable Azure Skills releases instead of the moving source branch. Related: [#703](https://github.com/microsoft/foundry-dev-tools/issues/703).
- **Canvas client**: The client now uses React and TypeScript.
- **Repository links**: References now point to Foundry Dev Tools.

### Fixed

- **Canvas actions**: Canvas-generated actions no longer loop back through Canvas routing or stay blocked after Copilot becomes idle.
- **Azure Developer CLI**: **Install azd** is available before a Foundry project is selected.

## Version 1.0.7

This release makes sign-in and action availability more consistent, refreshes automatically deployed agents, and improves Agent Inspector conversations.

### Changed

- **Sign-in**: Canvas now consistently uses Azure Developer CLI authentication.
- **Canvas actions**: Actions remain disabled until their prerequisites are met, with contextual explanations of their availability. Related: [#603](https://github.com/microsoft/foundry-dev-tools/issues/603) and [#604](https://github.com/microsoft/foundry-dev-tools/issues/604).
- **Packaging**: Canvas is now packaged from Skylight with its canonical Agent Inspector.
- **Telemetry**: Device identity, action, and operation-outcome tracking are more accurate.

### Fixed

- **Hosted Agent deployment**: **Test in Foundry Portal** now appears after Copilot creates and automatically deploys an agent. Related: [#678](https://github.com/microsoft/foundry-dev-tools/issues/678).
- **Agent Inspector**: The message input stays visible during long conversations. Related: [#679](https://github.com/microsoft/foundry-dev-tools/issues/679).
- **Authentication terminal**: Opening the sign-in terminal no longer produces confusing log messages.
- **Session startup**: Canvas no longer uses privileged session hooks that caused repeated `register hooks` messages. Related: [#682](https://github.com/microsoft/foundry-dev-tools/issues/682).

## Version 1.0.6

This release refines multi-agent workflows and improves agent selection, skill loading, and local inspection.

### Added

- **Telemetry**: Canvas now records usage telemetry.

### Changed

- **Agent selection**: Select the current Hosted Agent from the **Working on** bar or choose **New Agent** to start another agent. Related: [#595](https://github.com/microsoft/foundry-dev-tools/issues/595).
- **Deployment details**: Details stay hidden when the deployment section is collapsed.
- **Local execution**: `azd` commands now identify their execution environment as GitHub Copilot App. Related: [#610](https://github.com/microsoft/foundry-dev-tools/issues/610).
- **Packaging**: The browser client is now bundled for release.

### Fixed

- **Agent context**: New-agent state stays separate from the previously selected agent. The agent list refreshes after creation, Canvas actions retain the selected-agent context, and empty workspaces no longer receive irrelevant agent context.
- **Foundry skill**: Newly installed skills reload for agent creation. Related: [#644](https://github.com/microsoft/foundry-dev-tools/issues/644).
- **Local inspection**: Inspector operations now target the correct Canvas instance. The provider is released after inspection, and Inspector logging errors no longer crash it.

## Version 1.0.5

This release adds issue reporting, plugin-update notices, and multi-agent selection, while improving local startup and Foundry Portal navigation.

### Added

- **Issue reporting**: Report an issue directly from Canvas. Related: [#597](https://github.com/microsoft/foundry-dev-tools/issues/597).
- **Plugin updates**: A dismissible notice shows when a newer plugin version is available. Installation and updates remain managed by the host. Related: [#596](https://github.com/microsoft/foundry-dev-tools/issues/596).
- **Agent selection**: Choose which Hosted Agent to inspect locally or test in the Portal when a workspace contains multiple agents.

### Changed

- **Canvas tab**: The tab now includes a preview label. Related: [#606](https://github.com/microsoft/foundry-dev-tools/issues/606).

### Fixed

- **Local inspection**: The integrated terminal is activated before the agent starts so launch commands are not silently dropped. Related: [#594](https://github.com/microsoft/foundry-dev-tools/issues/594).
- **Skills navigation**: The Skills link now opens the correct Foundry Portal destination. Related: [#601](https://github.com/microsoft/foundry-dev-tools/issues/601).
- **Hosted Agent regions**: Region checks now match the documented supported regions and provide clearer unsupported-region feedback. Related: [#600](https://github.com/microsoft/foundry-dev-tools/issues/600).
- **Canvas handoffs**: Action handoffs no longer reopen Canvas.
- **Agent selection**: The local Hosted Agent picker now loads correctly.

## Version 1.0.4

This release clarifies Canvas handoffs and makes deployed-agent details easier to access.

### Changed

- **Chat and Canvas workflows**: Requests use Canvas only when its capabilities are available and honor explicit instructions to use the CLI or skip Canvas.
- **Agent creation**: Canvas handoffs now provide clearer guidance for the **Start** workflow.
- **Hosted Agent deployment**: Deployed-agent details include an explicit Foundry Portal action.

## Version 1.0.3

This release aligns the plugin's name and description with the Microsoft Foundry Canvas experience.

### Changed

- **Plugin metadata**: The description and README title now use Microsoft Foundry Canvas branding and describe its skills and interactive Canvas experience.

## Version 1.0.2

This release improves agent creation and workspace refreshes, adds a Portal playground handoff, and introduces the Microsoft Foundry plugin name.

### Added

- **Hosted Agent deployment**: Open deployed Hosted Agents in the Foundry Portal playground.

### Changed

- **Agent creation**: Concrete creation prompts are preserved when Canvas opens and remain distinct from generated inspiration ideas. Creation-section transitions, feedback, and region warnings are clearer.
- **Plugin name**: The plugin is now named `microsoft-foundry`, replacing `foundry-agent-canvas`.

### Fixed

- **Workspace state**: Workspace detection is more reliable, and Canvas refreshes after agent creation and deployment.
- **Local inspection**: Agents now run from their discovered `azd` project directories.

## Version 1.0.1

This release corrects extension discovery in Copilot.

### Fixed

- **Plugin installation**: The directory layout now allows Copilot to discover and load the bundled extension.

## Version 1.0.0

This release introduces Foundry Agent Canvas as an external plugin for GitHub Copilot App.

### Added

- **Project selection**: Choose a Foundry project and browse its models, toolboxes, skills, and guardrails.
- **Copilot handoffs**: Send project-aware requests from Canvas to Chat.
- **Agent Inspector**: Inspect local agents in the embedded Inspector.
