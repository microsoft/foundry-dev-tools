# What's New in Foundry Toolkit for VS Code

## Version 1.6.14 - 23 September, 2026

This release of Microsoft Foundry Toolkit for VS Code adds solution templates, skill-only toolboxes, and controls for active hosted-agent responses. It also updates model choices and Agent-to-Agent connections, and improves sign-in recovery, deployment guidance, and Agent Inspector.

### Added

- **Solution templates**: Browse reference solutions from **Create Agent**, compare their descriptions and capability tags, and create a local project with its README ready to use.
- **Skill-only toolboxes**: Create and save toolboxes that contain skills without requiring a separate tool.
- **Hosted agent playground**: Send follow-up instructions while a Responses run is active, stop active work, and reconnect to unfinished background responses.

### Changed

- **Agent-to-Agent (A2A) connections**: Added support for the generally available A2A format while retaining compatibility with existing preview connections. Connection names and endpoint settings are preserved when loading and saving prompt agents.
- **Model choices**: Added newer Anthropic and Google models, with warnings for retired model selections in Playground, Agent Builder, and model comparison.

### Fixed

- **Model compatibility**: Updated thinking requests for newer Claude models and web search requests for Gemini models.
- **Foundry models in VS Code Chat**: Use the Responses API when the model supports it, while respecting an explicit Chat Completions default. Responses requests now support Microsoft Entra ID authentication.
- **Agent Inspector**: Function results remain on the original Chat tool card after an approval continuation.
- **Foundry sign-in**: Improved recovery when authentication fails while loading models or agents. Sign-in recovery avoids duplicate prompts, and background operations do not open sign-in dialogs.
- **Open in VS Code**: Fixed Foundry links that failed to open while the extension was starting.
- **Hosted agent deployment**: ZIP deployment fetch failures now show network guidance instead of a generic error or an unrelated recommendation to change packaging methods.

## Version 1.6.13 - 16 September, 2026

This release of Microsoft Foundry Toolkit for VS Code adds private container registry connections, Fara model support for AMD NPUs, and Aion fine-tuning adapter support. It also updates Windows ML tooling and improves model search, hosted agent validation, and Agent Inspector.

### Added

- **Private container registries**: Deploy hosted agents from prebuilt images, including private non-ACR registries, using a matching registry connection in your Foundry project.
- **Fara on AMD NPUs**: Added the Fara 7B VitisAI INT4 model with image inputs for Windows x64 AMD NPU users.
- **Aion fine-tuning adapters**: Added support for downloading Aion's `quantized_adapter.safetensors` output while retaining support for `adapter_model.safetensors`. The Aion workflow requires the companion template to be included in the packaged resources ([microsoft/windows-ai-studio-templates#397](https://github.com/microsoft/windows-ai-studio-templates/pull/397)).

### Changed

- **WinML CLI**: Updated to 0.3.1 with a refreshed model catalog and conversion recipes ([microsoft/windows-ai-studio-templates#396](https://github.com/microsoft/windows-ai-studio-templates/pull/396)).
- **Windows ML**: The Windows ML runtime now uses `windowsml` 2.3 with updated execution providers (added WebGPU), without requiring the Windows App SDK. Existing projects need to be updated ([microsoft/olive-recipes#382](https://github.com/microsoft/olive-recipes/pull/382), [microsoft/olive-recipes#401](https://github.com/microsoft/olive-recipes/pull/401)).
- **Hosted agent validation**: Target a specific hosted agent and open a single generated report in VS Code. If the required validation skill is missing, the workflow attempts installation and provides recovery steps if installation fails.
- **Fine-tuning parameters**: Display template-provided suggestions alongside range hints and validate parameters with only a minimum or maximum limit.

### Fixed

- **Agent Inspector**: Completed responses retain their output and error details. Tool approvals and sign-in steps no longer interrupt an active continuation or remove its user message.
- **Model Catalog**: Popular Models now hides during searches or narrowing filters. Custom models respect search and filters, remain available through the Custom provider filter, and no longer cause premature no-results messages while loading. Section navigation follows the visible results.
- **Fine-tuning downloads**: Retry downloads that left an empty folder, and report missing or empty adapters and output-copy failures instead of showing success.

## Version 1.6.12 - 9 September, 2026

This release adds remote image controls and more model profiling detail, makes model search easier to access, and improves Agent Inspector connection and response reliability.

### Added

- **Remote image controls**: Remote images in playground conversations, Agent Builder responses, and model license content are blocked until you choose **Load Remote Images**.
- **Model profiling**: On Windows, view TensorRT RTX GPU operator traces. Intel CPU/NPU profiling now uses OpenVINO trace data when Intel Unified Telemetry data is unavailable.

### Changed

- **Model Catalog**: Search and filters now appear above Popular Models, and recommendations hide during keyword searches. Featured models and recommendation ordering have also been refreshed.
- **Agent Inspector details**: Clearer latency labels distinguish waiting between runs from total elapsed time. Details panes have improved sizing, run labels, keyboard accessibility, and consistent event-export filenames. Unsupported panels are hidden when inspecting a generic Responses endpoint (preview).
- **Agent traces**: Removed the standalone **View Foundry Agent Trace** command from the Command Palette. Trace viewing remains available in Agent Playground.

### Fixed

- **Agent Inspector connections**: Windows localhost connections, initial connection messages, and recovery after disconnects are more reliable. Changing agents clears stale inspection state, while refreshing the same connected agent preserves it.
- **Agent Inspector responses**: Completed runs retain final diagnostics without mixing diagnostic events into the displayed response. Interrupted streams preserve partial output and keep pending continuations retryable, with failure details in the run timeline.
- **MCP tools**: Long server and tool names no longer exceed the 64-character model tool-name limit. Agent Builder continues to display the original names.
- **Local models**: Windows-only local-model providers and management commands no longer appear on macOS and Linux.

## Version 1.6.11 - 2 September, 2026

This release adds Hosted Agent best-practice validation and powerful Agent Inspector event tools, while refining model and Agent-to-Agent connection workflows and improving interactive response reliability.

### Added

- **Hosted Agent validation**: Run `/validate-microsoft-foundry-hosted-agent` in Copilot Chat to validate the current Hosted Agent project against Microsoft Foundry best practices and open the generated report in VS Code.
- **Agent Inspector**
  - Search Responses events by event type or JSON content, filter by category, and see the number of matching events.
  - Resolve visible failures with Copilot, or copy and download the filtered event snapshot as JSONL.

### Changed

- **Model selection**: The model menu now shows clearer model and source labels, loading feedback, and a direct **Browse models** action. Prompt generation and improvement dialogs also use consistent VS Code controls.
- **Agent-to-Agent (A2A) connections (preview)**: Configured, catalog, custom endpoint, authentication, and agent-card dialogs now have clearer layouts, descriptions, skills, and actions.

### Fixed

- **Agent Inspector**
  - Tool results now attach to the correct calls and remain visible when a completed result does not include an explicit status.
  - Pending MCP approvals and OAuth consent requests return after an incomplete continuation.
  - **Fix** and **Resolve with Copilot** remain available when tracing is unavailable and provide consistent error details.

## Version 1.6.10 - 26 August, 2026

This release adds Agent-to-Agent connections and toolbox workflows for prompt agents, Hosted Agent deep links, and richer Agent Inspector details, while improving accessibility and the reliability of streamed responses and model deployment guidance.

### Added

- **Agent Builder**
  - **Prompt Agent toolboxes**: Enable toolbox support with the `windowsaistudio.enableToolboxInPromptAgent` setting, which is disabled by default. Attach a toolbox from Agent Builder's **Add tools** menu or use **Add to Prompt Agent** from the Toolbox resource list. Inspect its tools and skills in a rich, collapsible card; manage versions and approval policies; configure nested tools; or replace, remove, and opt out of the toolbox.
  - **Agent-to-Agent (A2A) connections (preview)**: Add an [A2A-compatible agent](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/tool-catalog#custom-tools) from a configured connection, the Foundry account catalog, or a custom HTTPS endpoint. Add it directly to a prompt agent or through an attached toolbox.
- **Hosted Agent deep links**: Open a named Hosted Agent's Details or Optimization page in VS Code directly from a Microsoft Foundry portal link.
- **Agent Inspector**
  - **Tool details**: Inspect tool calls grouped by response run, including status, call ID, arguments, and results.
  - **Event timing**: See when each Responses event reached Agent Inspector.

### Changed

- **Agent Inspector**
  - Long streaming responses and Details views now update more smoothly.
  - The Overview waterfall and timeline use equal-height regions with independent scrolling.
- **Copilot-assisted agent creation**: Updated Foundry guidance now uses current project and model setup, the agent's managed Python environment, workspace-root debugging, and the latest local run and deployment flow.

### Fixed

- **Agent Inspector**
  - Streamed response and reasoning text now remains complete, including streams that finish without intermediate text updates.
  - The chat input remains visible during long conversations, preserves drafts while a turn runs, and handles Enter, Shift+Enter, numeric keypad Enter, and input method editors consistently.
  - Obsolete stream events no longer overwrite a replacement turn, and tool details no longer show unmatched calls or results.
- **Copilot-assisted agent creation**: When you reuse the selected Foundry project, Copilot no longer asks you to select its Azure location again.
- **Model deployment**: Quota errors now open the token quota page for the current Foundry project.
- **Accessibility**
  - Screen readers now identify Model Catalog actions, collapsible Agent Builder and Model Preference controls, and project and model setting fields with their associated labels and state.
  - Adding an evaluation variable now moves keyboard focus to the new field.
  - Prompt placeholders now meet minimum contrast requirements.

## Version 1.6.9 - 19 August, 2026

This release streamlines agent creation, brings administrator-connected Foundry models to playgrounds and Hosted Agent creation, and adds richer Agent Inspector views and controls.

### Added

- **Create Agent**: Start from a redesigned page with direct paths to Agent Framework, Copilot SDK, and LangGraph samples, Copilot-assisted coding, Agent Builder, or the full sample catalog.
- **Administrator-connected models**: Select Microsoft Foundry models configured by an administrator in playgrounds and when creating a Hosted Agent.
- **Agent Inspector**
  - **Responses Overview**: Inspect all runs or a selected run in a default Overview tab with a latency waterfall and an ordered timeline of model, reasoning, and tool activity.
  - **Reasoning**: View raw reasoning and reasoning summaries in separate collapsible sections when an agent provides them.

### Changed

- **Agent Inspector permissions**: Pending MCP approvals and OAuth consent requests stay pinned above the message input, with bulk actions and expandable request details.
- **Agent Inspector response details**: Response footers now show the model, duration, token total, and timestamp. Hover over the token total to see input and output usage. The Tokens table now uses **Response** terminology.
- **Activity Protocol agents**: Newly scaffolded Python projects now open Microsoft 365 Agents Playground inside VS Code for local debugging.

### Fixed

- **Agent Inspector**
  - Response text, reasoning, tool calls, and permission decisions now stay in their original order.
  - Human-in-the-loop pauses no longer show duplicate tool and approval cards.
  - **Clear Chat** remains available while a Responses turn is paused for approval or consent.

## Version 1.6.8 - 12 August, 2026

This release adds user-scoped Hosted Agent Playground sessions, makes Hosted Agent setup and Activity Protocol deployment more reliable, and improves resource loading, Agent Inspector continuations, Prompt Builder persistence, and MCP authorization.

### Added

- **Hosted Agent Playground**: Set a user identity for Responses conversations so conversation state and session files stay isolated for each user.

### Changed

- **Hosted Agent Create**
  - Choose **Skip for now** during model setup, even when existing model deployments cannot be loaded.
  - Selected sample cards have clearer contrast across VS Code themes.
- **Resource lists**: Evaluations, Routines, Tools, Skills, and Toolboxes now show consistent loading feedback. Direct links to Tools or Skills open the requested tab without first loading Toolboxes.

### Fixed

- **Activity Protocol deployment**: Azure Bot settings are now validated before submission, existing compatible Bots are reused, and identity conflicts offer recovery choices. The wizard remains available while Bot details load, and successful deployments no longer open an unsupported Agent Playground.
- **Agent Inspector**: Tool approvals and OAuth consent requests remain available across continuation responses until every request is resolved.
- **Agent Builder**: Reopening and saving Foundry prompt agents now preserves the selected agent version and tool configuration.
- **MCP OAuth**: Authorization callbacks now complete only the matching connection request.

## Version 1.6.7 - 5 August, 2026

This release makes Models and Tools faster, improves Agent Inspector conversations and events, adds local Activity Protocol debugging with Microsoft 365 Agents Playground, and removes retired GitHub Models support.

### Added

- **Activity Protocol agents**: Newly scaffolded Python projects now use Microsoft 365 Agents Playground for local debugging.
- **Agent Inspector**
  - **Input history**: Press **Up** and **Down** to recall, edit, and resend earlier requests while preserving your unsent draft.
  - **Clear Chat**: Start a fresh Responses or Invocations conversation while clearing the chat, Events, and Details state.

### Changed

- **Resource browsing**
  - Models and Tools open faster by loading the selected tab first and showing core rows before additional details.
  - Returning to Agents, Models, Tools, Knowledge, or Evaluations preserves rows, search, filters, and pagination while refreshing the active view in the background. A manual refresh always retrieves the latest service state.
  - Collapsed **My Resources** sections load only when opened, reducing startup work while preserving Search and Recent Agents.
- **GitHub Models**: Following the service's retirement, GitHub Models has been removed from the Model Catalog, playground, model comparison, Prompt Builder, and evaluations.
- **Agent Inspector Events**: Responses and Invocations now use a consistent newest-first Events list, with clearer error indicators and accessible controls.

### Fixed

- **Activity Protocol deployment**: Azure Bot application ID conflicts now show actionable guidance instead of a raw service error.
- **Agent Optimization (preview)**: New optimization runs are disabled for hosted agents that do not use the Responses protocol, with guidance explaining the requirement.

## Version 1.6.6 - 29 July, 2026

This release streamlines Hosted Agent creation and model deployment, adds Microsoft Teams support for Activity Protocol agents, gives Agent Inspector a complete Responses event view, and improves deployment and playground reliability.

### Added

- **Activity Protocol agents**: Deploy Hosted Agents to Microsoft Teams with the required Foundry endpoint configuration, Azure Bot and Teams channel setup, and a generated Teams app setup guide.

### Changed

- **Hosted Agent Create**: The sample gallery now uses a responsive two-column layout with filters on the right, starts with the Agent Framework Hello World sample selected, and lets you continue directly from the selected card.
- **Model deployment**: Search the model list, keep Model Catalog selections prefilled, and get inline validation before deployment while capacity details stay aligned with your latest selection.
- **Agent Inspector**: The Details **Events** tab now shows every parsed Responses event, including function calls and results, while **Tools** continues to provide a summarized view.

### Fixed

- **Hosted Agent Deploy**: Invalid environment variable names are now reported before a container build starts, with guidance to correct the agent configuration.
- **Hosted Agent Playground**: Log streaming now starts when you open the **Logs** tab instead of when the playground loads, avoiding requests before the log stream is ready.
- **Agent Inspector**: MCP approval and OAuth consent cards now appear once whether the request arrives when an output item starts or completes.

## Version 1.6.5 - 22 July, 2026

This release brings Tool Catalog access and model actions into their resource pages, improves Hosted Agent deployment guidance and permission handling, and polishes catalog and playground experiences.

### Added

- **Tools page**: Open the Tool Catalog directly from the new **Catalog** tab.
- **Models page**: Model actions are now available from each row:
  - **Foundry** models: View code, copy the API key or endpoint, edit, or delete a deployment.
  - **Others** models: Load a model in Agent Builder, copy its name, edit its API key, delete it, or view its model card when available.

### Changed

- **Hosted Agent Deploy**: Remote package mode is now recommended. If a bundled code deployment fails, you can reopen the deployment form with remote package mode selected.
- **GitHub Copilot Chat**: Foundry Local models are no longer offered as language model providers.

### Fixed

- **Hosted Agent Deploy**: Deployments no longer attempt unnecessary access setup when your existing Foundry permissions already allow deployment.
- **Hosted Agent Playground**: OAuth consent requests no longer leave an empty agent response above the consent card.
- **Model Catalog**: Restored missing logos for Gemma, Kimi, Ministral, and Nemotron models.
- **Tools page**: The webview tab now displays the Tools icon consistently.

## Version 1.6.4 - 15 July, 2026

This release introduces **Agent Optimization (preview)** and streamlines Foundry project navigation by flattening resources into **My Resources** and consolidating model deployments, connected-provider models, and the Model Catalog into one tabbed **Models** page. It also refreshes the Model Catalog and improves Hosted Agent creation and playground reliability.

### Added

- **Models page**
  - **Foundry** tab: Manage your Foundry-hosted model deployments.
  - **Others** tab: Browse models from connected GitHub, NVIDIA NIM, OpenAI, Anthropic, Google, and custom providers, with provider and status details.
  - **Catalog** tab: Open the Model Catalog directly from the Models page.
- **Agent Optimization (preview)**: Optimize a Hosted Agent from the playground, compare generated candidates against the baseline, inspect scores and configuration changes, and deploy the best candidate.
- **Project actions**: Added **Copy Azure OpenAI Endpoint** to the Foundry project settings menu.

### Changed

- **My Resources**: Models, Agents, Tools, Knowledge, Evaluations, and Classic now appear directly at the view root instead of beneath the Foundry project. Project actions are consolidated under a settings menu, and the redundant **Connected Resources** node has been removed.
- **Resource lists**: Prompt Agents, Hosted Agents, Routines, Workflows, and Models are now ordered newest-first. The Evaluations list also uses the shared resource-list layout for consistent spacing, search, tables, and pagination.
- **Model Catalog**: Refreshed the featured-model lineup and the ordering of collapsed Microsoft Foundry models.
- **Hosted Agent toolbox sample**: Updated the Agent Framework Python toolbox template to the latest sample structure and unified `azure.yaml` manifest.
- **Icons and labels**: Aligned tree and webview panel icons across Models, Knowledge, Evaluations, Agents, Routines, Workflows, Playground, and Hosted Agent create and deploy views.

### Fixed

- **My Resources**: The resource tree now keeps a stable, flat structure while Foundry loads instead of briefly nesting resources under a temporary wrapper.
- **Hosted Agent Playground**: Conversation resets and protocol switches are now latest-wins, preventing stale state or empty conversation IDs during overlapping transitions.
- **Hosted Agent Create**
  - Creating a project in a non-empty folder now opens it in a new VS Code window while preserving the existing empty-folder behavior.
  - Sample download failures now show concise, recovery-oriented messages for rate limits, missing samples, GitHub outages, and network failures.
- **Tool Catalog**: Foundry connection cards for Remote MCP, OpenAPI, and A2A now remain visible in the **Custom** tab when you're signed out; sign-in is requested when you save.
- **Agent Framework C# sample**: The Agent Skills sample no longer fails because of an invalid skill download name.
- **Startup**: Background data warm-up errors no longer open the Output panel automatically during extension activation.

## Version 1.6.3 - 8 July, 2026

This release moves the **Models** and **Knowledge** project nodes from the tree to tabbed resource webviews and adds a richer **Tool Catalog** (inline add-to-agent/toolbox, connected-tool status, and provisionable toolbox templates). It also fixes OAuth consent in the remote playground, Windows invocation of Copilot SDK templates, and several hosted-agent deploy issues.

### Added

- **Tool Catalog**
  - **Inline operations**: Add a tool to a prompt agent or a toolbox — and create a new toolbox — directly from the Tools Catalog without leaving the page.
  - **Connected-tool status**: Catalog tools now show whether they're already connected.
  - **Toolbox templates**: New **Essentials** and **WorkIQ Suite** templates appear in the Toolboxes section with a read-only preview (tools and skills grouped) and one-click provisioning that creates the required connections and skills, then pre-fills the create-toolbox form.

### Changed

- **Knowledge node**: Now opens a tabbed resource webview instead of expanding nested tree items — an **Indexes** tab (vector stores plus project-managed Azure AI Search, Managed Azure AI Search, and CosmosDB indexes) and a **Knowledge Bases** tab for Azure AI Search knowledge bases.
- **Models node**: Now opens a searchable, tabbed Models webview for your Foundry-hosted model deployments instead of expanding tree items, matching the existing Tools overview.
- **Agents view**: Each tab — **Prompt Agent**, **Hosted Agent**, **Routines**, and **Workflow** — now shows a short, Microsoft Learn–grounded description with a **Learn more** link so first-time users can tell the agent types apart.
- **Hosted Agent Create**: Added a dedicated description for the **Invocations (WebSocket)** protocol, highlighting real-time voice and bidirectional streaming over a single persistent connection.
- **Hosted Agent Deploy**: Aligned the container-deploy schema with the unified Azure Developer CLI payload (`protocol_versions` and a top-level container image).
- **Hosted Agent messages**: Clearer invoke-playground request-body placeholder (`{"input": "your message"}`) and a more actionable "package too large" (250 MB) code-deploy error.
- **Hosted Agent samples**: Upgraded the toolbox sample to the latest version.

### Fixed

- **Hosted Agent Playground**: The **Remote** (container) playground now renders the OAuth consent card, so OAuth-gated tools can run, with a resume step after you authorize access.
- **Hosted Agent (Windows)**: The Copilot SDK Python hosted-agent template now invokes correctly on Windows instead of failing on a missing `/home` path.
- **Hosted Agent Deploy**
  - ADC/vNext agents advertising protocol version `2.0.0` are no longer misclassified and blocked at deploy time.
  - Environment variables authored in the `azure.yaml` `environmentVariables` list form are no longer silently dropped.
- **Agent Inspector**: `azd ai agent run` now opens the Agent Inspector inside VS Code instead of an external browser.
- **Resource lists**: Canceling a delete no longer removes the row — lists now reflect the host's actual state after a delete.
- **MCP tools**: Playwright MCP integration no longer breaks out of the box due to the `load_prompts` default.

## Version 1.6.2 - 30 June, 2026

This incremental release improves Hosted Agent deployment reliability with unified `azure.yaml` support, safer environment-variable handling, and ACR polling that waits for terminal build status. It also restores Azure sign-in during subscription selection and strengthens the shared Agents list architecture.

### Added

- **Hosted Agent Deploy**
  - **Unified `azure.yaml` support**: Hosted-agent create and deploy flows now read the unified Azure Developer CLI `azure.yaml` (`host: azure.ai.agent`) for agent name, source, runtime, protocols, environment variables, and resource settings, while falling back to legacy `agent.yaml` with a migration warning.

### Changed

- **Hosted Agent Deploy**
  - Filter runtime-reserved environment variables (`AGENT_*` and `FOUNDRY_*`) before deploy, warn when values are dropped, and continue with the sanitized set.
  - ACR build polling now waits until the build reaches a terminal status instead of stopping after a fixed number of attempts, preventing long container builds from failing prematurely.
- **Hosted Agent samples**: Updated the Agent Framework Toolbox sample to use `TOOLBOX_ENDPOINT`, clearer Azure Developer CLI and Foundry Toolkit setup guidance, and leaner dependencies.
- **Hosted Agent disclaimers**: Updated the tracing and deploy disclaimer presentation to match the latest compliance guidance.

### Fixed

- **Authentication**: Restored the Azure sign-in prompt in the subscription picker when the user is not signed in, without reintroducing the subscription-selection loop.
- **Agent Inspector**: OAuth consent cards now remain actionable when an agent response pauses for user consent and appear in the correct order above the assistant response.
- **Model deployment**: Fixed the deployment dropdown being disabled when a default Foundry project is set.
- **Fine-tuning**: Local `.jsonl` datasets now generate an Olive config `data_name` of `json`, matching the Hugging Face dataset loader.

## Version 1.6.1 - 24 June, 2026

This hotfix resolves an issue introduced in 1.6.0 where agents could fail to appear in the Agents view.

### Fixed

- **Agents view**: Fixed agents not displaying when listing routines returned a `403 Forbidden` error. The Agents view now handles the failed routines request gracefully so prompt and hosted agents still load. ([#487](https://github.com/microsoft/foundry-toolkit/issues/487))

## Version 1.6.0 - 23 June, 2026

This release expands the agent tooling story in Foundry Toolkit with **Skills**, three new **custom tools** (Browser Automation, Agent-to-Agent, and OpenAPI), and brings **Routines** to VS Code for scheduled agent automation. It also adds **code-asset download** for code-deployed Hosted Agents and **agent deletion** from the tree.

### Added

- **Skills (preview)**
  - **Skill support in Toolbox**: Author a `SKILL.md` once, store it centrally as a [versioned skill](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/skills) in Foundry, and attach it to a toolbox so any MCP client discovers and loads it alongside tools — decoupling behavioral guidelines from agent code.
  - **Skill catalog**: New skill catalog section on the Tools Catalog page to browse available skills.
- **Agent Tools**
  - **Browser Automation tool (preview)**: Add the Playwright Workspaces–powered [Browser Automation tool](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/browser-automation) to a toolbox, enabling agents to run scalable, isolated browser sessions for navigation and form filling.
  - **OpenAPI custom tool**: Connect agents to external HTTP APIs using an [OpenAPI 3.0/3.1 specification](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/tool-catalog#custom-tools).
  - **Agent-to-Agent (A2A) custom tool (preview)**: Connect an agent to other agents through [A2A-compatible endpoints](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/tool-catalog#custom-tools) for cross-agent communication, configured directly in the toolbox.
- **Agents view**: A new standalone Agents webview brings every agent in your Foundry project into a single tabbed surface, replacing the separate sidebar tree nodes with one place to browse, open, and manage them. It lists:
  - **Prompt agents** and **hosted agents** in your project.
  - **Workflows** for multi-step orchestration.
  - **Routines** for scheduled, trigger-based automation.
- **Routines (preview)**: [Foundry Routines](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/routines) provide a project-native way to run an agent automatically when a trigger fires. A routine pairs a single trigger — a one-time timer or a recurring schedule — with an action that invokes a prompt or hosted agent, keeping the trigger, permissions, connections, and run history together with the agent in the same Foundry project. They're ideal for lightweight automation such as daily summaries, one-time reminders, or periodic checks. This release brings Routines to VS Code:
  - **Create routines** directly from the agent view, hosted-agent detail, and the routine list.
  - **Routine list**: Browse all routines in your project from a dedicated list view.
  - **Routine detail view**: Inspect a routine with full run history — inputs, outputs, status, and links to the related agent response and trace details.
  - **Manage routines**: Edit, rename, duplicate, resume, pause, and delete routines from the list and detail views.
- **Hosted Agents**
  - **Code-asset download for direct code deployment**: Download the source code asset for code-deployed Hosted Agents via a new download API and UI action.
  - **Delete agent**: Delete Hosted Agents from the tree view, the recent-agents list, and the Hosted Agent Playground.
- **Agent Builder**: Added a **Copy project endpoint** action to quickly copy your Foundry project endpoint.
- **VNet-restricted projects**: Foundry projects with public network access disabled now show a **VNet required** label in the resources tree when you're not connected to an approved Azure Virtual Network (VNet). The label explains that the project can only be reached from an approved VNet — with a link to the [private network how-to guide](https://learn.microsoft.com/en-us/azure/foundry/how-to/configure-private-link) — and reminds you to refresh the project after connecting.

### Changed

- **Hosted Agent Deploy**
  - Default the deploy method to **Code** and list it first.
  - Removed the **Preview** badge from the Code option on the deploy Basics tab.
  - Support private-ACR bring-your-own images and gate VNet-only Foundry projects.
  - Support DNL ACR login servers.
- **Agents**: Converted the agent **View Code** split button into a menu button exposing both options, and added a searchable agent combobox to the Routine detail UI.
- **Model Catalog**: Added a GitHub Models retirement banner and disabled deploy for models not supported in the selected region.
- **Model Conversion**: Added AMD op-level support and Intel GPU LLM op support.

### Fixed

- **Hosted Agent**: Prevented a subscription-selection loop in the hosted-agent flow.
- **Authentication**: Refresh the Azure token before it expires to avoid `ExpiredAuthenticationToken` errors.
- **Model Catalog**: Corrected context length and token limits for Foundry models.
- **Playground**: Fixed the Anthropic `max_tokens` issue.
- **Evaluation**: Updated Canceled/Partial status icons and colors.
- **UI**: Style fixes after the `vsc-ui-react` upgrade and improved performance when opening the Tools overview page.

## Version 1.4.3 - 10 June, 2026

This incremental release speeds up model listing with short-lived caching and polishes the Hosted Agent **Create** and **Deploy** experiences with better field alignment, clearer selected-card contrast, and per-option tooltips.

### Changed

- **Performance**
  - **Faster Model Listing**: Added short-lived caching (30s TTL) with in-flight request de-duplication for the chat model provider and the Foundry Local catalog, cutting redundant lookups during startup and model selection.
- **Hosted Agent Create**
  - Aligned field widths across the Create tab (Folder Name, Project Name, and dropdowns) so inputs line up consistently.
  - Added per-option tooltips and improved text contrast on the selected sample/option cards.
- **Hosted Agent Deploy**
  - Made ZIP code deploy fields (Language, Runtime Version, Entry Point, CPU and Memory, Package Command) and other inputs full-width, and aligned the source-browse row with the resource dropdowns.

### Fixed

- **Hosted Agent Create**: Selected sample cards now keep readable text against the active-selection background, and the field tooltip uses a standard pointer instead of the help cursor.

## Version 1.4.2 - 2 June, 2026

This incremental release adds **Toolbox Guardrails** for safer agent execution and expands Hosted Agent sample coverage with new LangGraph examples.

### Added

- **Toolbox Guardrails**: Apply guardrails to your Toolbox for safer agent execution.
- **LangGraph Hosted Agent Samples**: Added seven LangGraph samples:
  - [Responses API - Chat](https://github.com/microsoft-foundry/foundry-samples/tree/main/samples/python/hosted-agents/langgraph/responses/01-langgraph-chat)
  - [Responses API - MCP](https://github.com/microsoft-foundry/foundry-samples/tree/main/samples/python/hosted-agents/langgraph/responses/04-mcp)
  - [Responses API - Workflows](https://github.com/microsoft-foundry/foundry-samples/tree/main/samples/python/hosted-agents/langgraph/responses/05-workflows)
  - [Responses API - Files](https://github.com/microsoft-foundry/foundry-samples/tree/main/samples/python/hosted-agents/langgraph/responses/06-files)
  - [Responses API - Human-in-the-Loop](https://github.com/microsoft-foundry/foundry-samples/tree/main/samples/python/hosted-agents/langgraph/responses/07-human-in-the-loop)
  - [Responses API - Observability](https://github.com/microsoft-foundry/foundry-samples/tree/main/samples/python/hosted-agents/langgraph/responses/08-observability)
  - [Invocations API - Chat](https://github.com/microsoft-foundry/foundry-samples/tree/main/samples/python/hosted-agents/langgraph/invocations/01-langgraph-chat)

## Version 1.4.1 - 1 June, 2026

This incremental release adds model export, optimization, and quantization through WinML CLI, introduces resource usage interval updates for model profiling, aligns Windows ML with Windows App SDK 2.0, and polishes the Hosted Agent creation and deployment flow.

### Added

- **Model Conversion**
  - Support export, optimize, quantize model via [WinML CLI](https://github.com/microsoft/winml-cli).
  - Add new Olive recipes for SAM 2.1, SAM and Stable Diffusion 2.1
- **Model Profiling**
  - Support OP level data for Intel (OpenVINO) EP
  - Support updating interval for resource usage collection

### Changed

- **Hosted Agent Creation**
  - Auto-select the subscription when only one is available (or the most recently used), and refresh the subscription and project fields after a new project is created.
  - Disable the second tab until the required selection on the first tab is complete.
  - Align the search bar borders with the card borders in the selection panel.
  - Polished title and description font sizes, top and side padding, label-to-input spacing, and dropdown widths to align with the rest of the create flow.
- **Hosted Agent Deploy**
  - Setting dropdowns default to the current value with a `(Current)` suffix for quick recognition.
- **Model Conversion**
  - Update Windows ML to align with [Windows App SDK 2.0](https://learn.microsoft.com/en-us/windows/apps/windows-app-sdk/release-notes/windows-app-sdk-2-0?pivots=stable)

### Fixed

- **Hosted Agent Deploy**: Restored the **Run agent** button on the deploy page (previously only **View logs** was shown, making the page look like an error state).

## Version 1.4.0 - 28 May, 2026

This release marks a major milestone: the **[Foundry Toolkit](https://marketplace.visualstudio.com/items?itemName=ms-windows-ai-studio.windows-ai-studio) (previously AI Toolkit) and [Microsoft Foundry extension](https://marketplace.visualstudio.com/items?itemName=TeamsDevApp.vscode-ai-foundry) are now consolidated into a single Foundry Toolkit extension**. It also brings **Hosted Agent evaluation and tracing to GA**, two new **Hosted Agent deployment options** (ZIP code deploy and Bring-Your-Own-Image ACR), a **refreshed Hosted Agent scaffolding UI**, an expanded **Toolbox** with native **WorkIQ** and **Fabric IQ (OneLake)** integrations, a redesigned **Tools Catalog**, a refreshed **Prompt Builder**, and continuous evaluation settings for production agents.

### Added

- **Observability**
  - **Hosted Agent Tracing**: Inspect end-to-end traces of Hosted Agent invocations from VS Code for debugging and observability.
  - **Continuous Evaluation Settings**: New page to configure ongoing evaluation for deployed Hosted Agents.
  - **Evaluations Node**: One-click access to evaluation runs and results from the Foundry project tree.
- **Hosted Agent**
  - **Hosted Agent ZIP Code Deploy**: Deploy your agent source as a ZIP package directly to Foundry.
  - **Hosted Agent Bring-Your-Own-Image (BYOI)**: Deploy from a pre-built container image in your own Azure Container Registry.
- **Agent Tools and Toolboxes**
  - **WorkIQ as a Built-in Tool**: Native WorkIQ tool experience in the Toolbox — first-class integration powered by A2A connections, no MCP fallback required. End-to-end toolbox creation with WorkIQ works out of the box.
  - **Fabric IQ (OneLake Catalog) Integration**: Connect to Microsoft Fabric OneLake catalogs from the Toolbox.
  - **Toolbox Search Toggle**: Faster discovery across the Tool Catalog.
  - **Agent Tool Multi-Select**: Wire multiple tools into an agent in a single action.

### Changed


- **Hosted Agent**
  - **Hosted Agent Scaffolding**: Refreshed UI and workflow for clearer project setup.
  - **Dropped ACA Data-Plane Support**: Hosted Agents now target ADC exclusively.
- **Agent Tools and Toolboxes**
  - **Tools Catalog Redesign**: Improved layout, filtering, and tool metadata.
  - **"Vector Store" Renamed to "Knowledge Index"**: Terminology aligned with Microsoft Foundry.
- **Extension and UX**
  - **Single Consolidated Extension**: AI Toolkit and Foundry extensions now ship as one VSIX, eliminating the need to install both.
  - **Renamed AI Toolkit to Foundry Toolkit**: Updated across UI, commands, and documentation.
  - **Prompt Builder "Improve an Instruction"**: Dialog redesigned for faster iteration.
  - **Agent Inspector Header**: Styling aligned with the rest of the extension.

### Fixed

- Polished Remote Agent Playground UI alignment.
- Fixed MCP toolbox tool icons not rendering correctly.
- Improved ZIP deploy service error surfacing for clearer failure diagnostics.
- Fixed regressions in the Hosted Agent deployment flow.
- Fixed assorted UI regressions across Agent Builder and Playground.


## Version 1.2.1 - 18 May, 2026

This incremental release polishes the Tool Catalog UI, features **GPT-Image-2** in the Popular Models section of the Model Catalog, and fine-tunes default sidebar visibility for easier feature discovery.

### Added

- **GPT-Image-2 in Model Catalog**: GPT-Image-2 is now featured in the Popular Models section, alongside GPT-5.5, Claude Opus 4.7, and Phi-4.

### Changed

- **Tool Catalog**: New tools catalog design with refreshed layout and styling, refined toolbox editor and tool card UI, and clearer label wording across the Tools UI.
- **Foundry Model Catalog**: Updated the Foundry collapsed-view ranking to surface the latest models — GPT-5.4, Claude Opus 4.6, Grok 4.3, DeepSeek-V4-Flash, Kimi K2.6 (Fireworks), and MiniMax M2.5 (Fireworks). The popular models grid is now responsive for four cards, with breakpoints aligned to card description visibility.
- **Sidebar Defaults**: The **Discover** category is now expanded by default and the **Help and Feedback** view is collapsed by default for a cleaner first-run experience.

## Version 1.2.0 - 6 May, 2026

This release brings **Hosted Agent (public preview)** to Foundry Toolkit, upgraded **Agent Inspector**, and rounds out **Toolbox** management.

### Added

- **Hosted Agent (Public Preview)**: Build, deploy, and inspect Microsoft Foundry hosted agents from VS Code, powered by the new agent framework hosting package.
- **Toolbox in Tool Catalog**: Create and manage toolboxes from the UI using the Azure AI Project SDK, with synced sample code.
- **Test Tool — Approval & Consent**: Inspector test tool now supports approval and consent flows.

### Changed

- **Agent Inspector**: Reworked layout with toolbox support, refreshed Invocations view, and a switch to diagnostic side-stream for improved event delivery.
- **Model Catalog**: Refreshed header and filter UI, enriched Foundry cards with descriptions and feature tags, and added fuzzy search.
- **Modular Skills**: Copilot instructions converted into modular skills with progressive loading; renamed to `vscode-microsoft-foundry`.
- **MCP**: Tokens now refresh automatically.

### Fixed

- Fixed oversized layouts on the Foundry Agent Builder and Create Toolbox pages.
- Fixed prompt editor styling to match VS Code dropdowns and inputs across light, dark, and high-contrast themes.
- Polished Model Catalog button styling, hover states, deploy icons, and tag alignment.
- Fixed agent prompt textboxes disappearing in light and high-contrast modes ([vscode-ai-toolkit#366](https://github.com/microsoft/vscode-ai-toolkit/issues/366)).
- Fixed playground prompt being lost when resizing the workflow / playground divider.
- Fixed custom agent / skill generation renaming env vars and breaking Foundry deployments.
- Improved inference agent reconnect latency and Inspector invocations stream performance.
- Fixed the **Create New MCP Server** button label and page title.
- Fixed model icon resolution for Qwen, DeepSeek, Mistral, GLM, and MiniMax.
- Refreshed the **Experiment with AI Models** walkthrough images for dark and light themes.


## Version 1.0.0 - 16 April, 2026

This release marks a significant milestone as AI Toolkit becomes generally available. With this release, we are also renaming AI Toolkit to **Microsoft Foundry Toolkit for VS Code** to better reflect the deep integration and seamless experience it provides with Microsoft Foundry.

All existing features remain intact with better experience and performance. In addition, we have added nine models from [Fireworks AI hosted on Microsoft Foundry](https://azure.microsoft.com/en-us/blog/introducing-fireworks-ai-on-microsoft-foundry-bringing-high-performance-low-latency-open-model-inference-to-azure/), bringing you access to models like Kimi K2.5, MiniMax M2.5, and more.

Read more about our announcement [here](https://aka.ms/mftk-ga-blog).

## Version 0.34.0 - 26 March, 2026

This release introduces LangGraph support in Agent Inspector, a new Recent Agents section for quick navigation, a refreshed Agent Builder UI, and a broad set of improvements across MCP tooling, model compatibility, and the walkthrough experience.

### Added

- **LangGraph Support in Agent Inspector**: Agent Inspector now supports LangGraph agents. Visualize your LangGraph multi-agent workflows in real time and navigate directly to source code by double-clicking workflow nodes.

- **Recent Agents in My Resources**: A new **Recent Agents** section in the sidebar provides quick access to recently opened agents, reducing navigation time.

### Changed

- **Agent Builder UI**: Restyled to align with VS Code native components — buttons, form fields, and typography now match the VS Code design language for a more cohesive experience. The **Create Agent** panel is also responsive.

- **Model Picker**: Foundry models are now ranked above GitHub models in the model dropdown, making the recommended option easier to find.

- **Agent Switcher**: Agents in the switcher now indicate whether they are **Local** or **Foundry** agents, reducing ambiguity when working across multiple agents.

- **MCP Tool Catalog**:
  - You can now **delete MCP servers** directly from the Tool Catalog.
  - The "Add tool" dialog now correctly defaults to local configuration when adding a local MCP server.
  - Tooltips and improved wording clarify where agents and tools are saved (local vs. Foundry).

- **Walkthrough**: Refreshed with an agent-focused design and updated steps. Walkthrough images now support both VS Code **dark and light themes**.

- **"Improve" in Agent Builder**: Now falls back gracefully when a model doesn't support the optimized API, instead of silently failing or showing an error.

- **API Auto-Detection**: AI Toolkit now automatically detects whether a model requires the Responses API or Chat Completions API and switches transparently — no manual configuration needed.

- **Model Catalog**: Popular models updated to the latest versions — GPT-5.4 and Claude Opus 4.6 are now featured.

### Fixed

- Fixed MCP name conflict error ("connection with this name already exists") after deleting and re-adding an MCP server.
- Fixed Agent Builder model picker rendering issues in some configurations.
- Fixed the **Improve** button not working for certain Foundry models.
- Fixed local MCP "Add tools" section incorrectly showing Foundry tools.
- Fixed loading overlay not fully covering the Agent Builder UI during model operations.
- Fixed LangGraph agents encountering errors when agentdev endpoints are unavailable.
- Fixed conversation continuity with the standard Responses API.


## Version 0.32.1 - 17 March, 2026

This is an incremental release with bug fix and enhancements.

### Added
- Added entry point to open `Hosted Agent Playground` directly from the Tree View, providing a seamless transition to test and iterate on your hosted agents after deployment.

### Changed
- Update extension description to reflect the focus on agent development and integration with Microsoft Foundry.

### Fixed
- Fixed an issue where the developers are unable to add models via Foundry Local [#364](https://github.com/microsoft/vscode-ai-toolkit/issues/364)


## Version 0.32.0 - 16 March, 2026

This release brings a unified tree view experience, Agent Builder enhancements, and streamlined GitHub Copilot integration for agent development.

![TreeView_CreateAgent](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/2026/aitk_0316/changelog0316.png)

### Added

- **Create Agent View**: A new unified entry point for creating AI agents, offering two paths side by side:
  - **Create in Code with Full Control**: Scaffold a project from a template, or generate a single agent or multi-agent workflow using GitHub Copilot.
  - **Design an Agent Without Code**: Launch Agent Builder directly to configure a prompt agent through the UI.

- **Conversations View for Foundry Agents**: A dedicated Conversations tab is now available in Agent Builder, making it easier to review and manage conversation history when working with Foundry agents.

- **Foundry Model Licenses**: License information is now displayed for Foundry models directly in the model catalog.

- **View Code for Workspace Scaffolding**: Added View Code support to scaffold a workspace for Foundry agents, letting you quickly generate the project structure needed to get started.

### Changed

- **GitHub Copilot Agent Development**: Agent code generation, evaluation, and deployment now uses the open-source `microsoft-foundry` skill from [azure-skills](https://github.com/microsoft/azure-skills), the same source used by GitHub Copilot for Azure. AI Toolkit automatically installs and keeps this skill up to date — no manual setup required.

- **Agent Builder**:
  - Draft agents are now automatically saved before running in the playground, preventing accidental loss of unsaved changes.
  - Open Foundry prompt agents directly in Agent Builder from the Foundry extension.
  - Generate and refine agent instructions with the Foundry Prompt Optimizer.

- **MCP Tool Approval**: Configure auto or manual approval for MCP tool calls in Agent Builder, giving you control over how tool invocations are handled during agent runs.

- **Tree View**:
  - The AI Toolkit and Foundry extension sidebar panels have been unified into a single **My Resources** view. Local resources (models, agents, tools) are grouped under a **Local Resources** node, with Foundry remote resources appearing alongside them.
  - If Foundry is installed but not yet configured, a setup prompt is shown inline instead of an empty panel.
  - All nodes are collapsed by default and expand/collapse state is preserved across sessions.
  - **Developer Tools View Mode**: The Developer Tools panel now supports two switchable layouts, accessible from the panel title menu: **Group by Lifecycle** organizes entries into Discover, Build, and Monitor stages, while **Group by Resource** groups them into Agent Dev Tools and Model Tools. The active mode is indicated with a checkmark.
  - Foundry agents and Foundry models now have dedicated icons to distinguish them from local resources at a glance.

- **Evaluation**: Updated the VS Code Skill to use the `pytest-agent-evals` SDK for running agent evaluations, aligned with the latest evaluation framework.

## Version 0.30.1 - 12 February, 2026
This is an incremental release with bug fix.

- **Changed**: Consolidated Inspector templates from the Foundry extension
- **Fixed**: Fixed a skill issue for Python environment configuration
- **Added**: Support for Claude-Opus-4.6

## Version 0.30.0 - 5 February, 2026
This major milestone release introduces several new features and significant enhancements. 

### Added

- **Tool Catalog**: A centralized hub for discovering, managing, and integrating tools into AI agents. The Tool Catalog streamlines agent capability enhancement by providing unified access to a comprehensive range of tools.
  - Browse, search, and filter available tools from the public Foundry catalog and local `stdio` MCP servers.
  - Configure connection settings for each tool directly within the catalog.
  - Seamlessly integrate selected tools into AI agents via Agent Builder.
  - Manage tool lifecycles including adding, updating, and removing tools.
![Tools](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/2026/aitk_0205/Tool_Catalog.png)

- **Agent Inspector**: A comprehensive debugging and visualization environment for AI agents within VS Code. Press F5 to launch agents with full debugger support, view real-time streaming responses, and visualize multi-agent workflow execution.
![Inspector_1](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/2026/aitk_0205/Inspector_1.png)
  - **One-click F5 debugging**: Launch agents with breakpoints, variable inspection, and step-through debugging.
  - **Copilot auto-configuration**: GitHub Copilot generates agent code and configures debugging, endpoints, and environment.
  - **Production-ready code**: Generated code uses Hosted Agent SDK, ready for deployment to Microsoft Foundry.
  - **Real-time visualization**: Monitor streaming responses, tool calls, and workflow graphs between agents.
  - **Quick code navigation**: Double-click workflow nodes to navigate directly to corresponding source code.
  - **Unified experience**: Integrated interface combining chat and visualization for seamless agent development.
![Inspector_2](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/2026/aitk_0205/Inspector_2.png)

- **Evaluation as Tests**: A structured approach to defining, running, and analyzing AI agent evaluations using familiar testing frameworks.
![Eval_1](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/2026/aitk_0205/Eval_1.png)
  - **Define evaluations as test cases**: Write evaluations using pytest syntax and annotations with the Eval Runner SDK.
  - **Test Explorer integration**: Execute tests directly in VS Code Test Explorer with flexible test case combinations.
  - **Result analysis**: View and analyze evaluation results in a tabular view with [Data Wrangler](https://code.visualstudio.com/docs/datascience/data-wrangler-quick-start) integration.
  - **Run evaluations in Foundry**: Submit evaluation definitions to run in Microsoft Foundry.
![Eval_2](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/2026/aitk_0205/Eval_2.png)


### Changed
- **Agent Builder**:
  - Redesigned layout for improved usability and navigation.
  - Added quick switcher for seamless transitions between agents.
  - Added support for authoring, running, and saving prompt agents on Microsoft Foundry.
  - Added support for adding tools to Foundry prompt agents from Tool Catalog or built-in tools.
  - Added **Inspire Me** feature to assist users when drafting agent instructions.
  - Numerous performance and stability improvements.
![Agentbuilder](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/2026/aitk_0205/AgentBuilder.png)

- **Model Catalog**:
  - Added support for models using the OpenAI Response API, such as `gpt-5.2-codex`.
  - Numerous performance and stability improvements.

- **Build Agent with GitHub Copilot**:
  - Added **New Workflow** entry point to quickly generate multi-agent workflows with GitHub Copilot.
  - Added capability to orchestrate multi-agent workflows by selecting prompt agents from Foundry.
![Workflow](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/2026/aitk_0205/Workflow.png)

- **Conversion**:
  - Support generate interactive playground for history model.
  - Add Qualcomm GPU recipes.

- **Profiling**: 
  - Support show resource usage for Phi Silica in Model Playground.

## Version 0.28.2 - 19 January, 2026

This is an incremental release with bug fix

### Fixed
- Fixed local model on the QNN device is not providing an appropriate response.
- Fixed phi silica finetuning float parameter issue.

## Version 0.28.1 - 13 January, 2026

This is an incremental release improving Copilot integration by replacing instructions with [skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills).

### Changed
- Migrated from Copilot instructions to Copilot skills for better AI Toolkit Agent Development experience.
- Replaced `extendCopilotInstructions` setting with `extendCopilotSkills` for enhanced GitHub Copilot Chat integration.
- Updated `AIAgentExpert` custom agent description to include workflow code generation and evaluation planning/execution.
- Automatic cleanup of old Copilot instructions when upgrading from previous versions.

## Version 0.28.0 - 6 January, 2026

This is a major milestone release introducing significant enhancements across Model Catalog, View Code, Copilot Tools, and Local Models on Windows.

### Added
- Support for Entra Auth types and Agent Framework for Anthropic models via View Code in Playground and Agent Builder.
- Profiling features for Windows ML-based local models.

### Changed
- Improved loading performance and prioritized Foundry models in Model Catalog.
- Expanded Agent Framework code sample coverage to improve code generation quality in `Agent Code Generation Tool for GitHub Copilot`.
- Updated recommendations to prioritize Foundry models over GitHub models for agent code generation in `Agent Code Generation Tool for GitHub Copilot`.
- Removed Windows AI API tab from Linux and macOS platforms in Model Catalog.

### Fixed
- Fixed Codespaces crash when selecting images in Playground.
- Fixed delay in displaying added models in My Resources.
- Fixed an issue where non-empty content was not allowed for Claude models used in GitHub Copilot (via AI Toolkit).

## Version 0.26.5 - 12 December, 2025
This is an incremental release adding new models from Microsoft Foundry.

### Added
- Added new Azure OpenAI models from Foundry, available in Model Catalog, Playground and Agent Builder:
  - **[GPT-5.2](https://ai.azure.com/catalog/models/gpt-5.2)**: GPT‑5.2 builds on GPT‑5.1 with improvements that make interactions more reliable, flexible, and user-friendly. The focus is on delivering clearer responses, better adaptability, and enhanced control for diverse tasks. 
  - **[GPT-5.1-Codex-Max](https://ai.azure.com/catalog/models/gpt-5.1-codex-max)**: GPT‑5.1-Codex-Max is built on an update to our foundational reasoning model, which is trained on agentic tasks across software engineering, math, research, and more. 

## Version 0.26.4 - 08 December, 2025
This is an incremental release adding new models from Huggingface.

### Added
- Added [Fara-7b-int4-qnn](https://huggingface.co/microsoft/Fara-7B-onnx) model in Model Catalog

## Version 0.26.3 - 25 November, 2025
This is an incremental release adding new models from Foundry.

### Added
- Added new Claude model from Foundry, available in Model Catalog, Playground and Agent Builder:
  - **Claude Opus 4.5**: Anthropic's most intelligent model, and an industry leader across coding, agents, computer use, and enterprise workflows.

## Version 0.26.2 - 19 November, 2025
This is an incremental release adding new models from Foundry.

### Added
- Added Claude family of models from Foundry, available in Model Catalog, Playground and Agent Builder:
  - **Claude Sonnet 4.5**: Anthropic's most capable model to date for building real-world agents and handling complex, long-horizon tasks, balancing the right speed and cost for high-volume use cases.
  - **Claude Haiku 4.5**: delivers near-frontier performance for a wide range of use cases, and stands out as one of the best coding and agent models–with the right speed and cost to power free products and scaled sub-agents.
  - **Claude Opus 4.1**: industry leader for coding, delivers sustained performance on long-running tasks that require focused effort and thousands of steps, significantly expanding what AI agents can solve.

## Version 0.26.1 - 18 November, 2025
This is an incremental release adding new models from Foundry.

### Added
- Added [gpt-5.1 family of models](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/gpt%E2%80%915-1-in-foundry-a-workhorse-for-reasoning-coding-and-chat/4469067) from Foundry, available in Model Catalog, Playground and Agent Builder: 
  - **GPT-5.1**: adaptive, more efficient reasoning
  - **GPT-5.1-chat**: chat with new chain-of-thought for end-users
  - **GPT-5.1-codex**: optimized for long-running conversations with enhanced tools and agentic workflows
  - **GPT-5.1-codex-mini**: a compact variant for resource-constrained environments
- Added [Phi Silica](https://learn.microsoft.com/en-us/windows/ai/apis/phi-silica) in Model Catalog on win-x64 and win-arm64.
- Added CLI and version-tag support for AITK model conversion to enable CI/CD workflows
- Added ability to pack converted models into MSIX format for streamlined deployment

### Changed
- Updated branding name from Azure AI Foundry to Microsoft Foundry.
- Updated conversion recipes for improved compatibility and performance.
  - Shipped non-LLM recipes for AMD GPU EP support
  - Config changes for OV NPU LLM: Olive updated to version 0.10.1 with a new configuration.
  - Expanded support for additional LLM models for TRT RTX GPU EP.


## Version 0.26.0 - 12 November, 2025
This is a major milestone release introducing **AIAgentExpert** custom agent and other enhancements.

### Added
- **`AIAgentExpert` Custom Agent**: A new specialized agent that provides expert-level assistance for creating, iterating, tracing, and evaluating AI agents.
![customagent](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_1112/customagent.png)
- **Connected Agents** in Agent Builder: Build collaborative agents that can connect and interact with each other to accomplish complex tasks.
![connectedagent](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_1112/connectagent.png)
- **GPT-5 Pro Model Support**: Added support for the GPT-5 Pro model, enabling developers to leverage advanced AI capabilities in their applications.
- **`Declarative Agent To Code` Tool for GitHub Copilot**: Generates Python and .NET code using the Microsoft Agent Framework based on user-provided declarative agent specifications.
- **`Agent Code Generation` Tool for GitHub Copilot**: Extended to support C# code generation in addition to Python for building AI agents.

## Version 0.24.1 - 24 October, 2025
This is an incremental release with bug fixes and enhancements focused on agent development and evaluation workflows.

### Added
- **Lifecycle Management for Local MCP Servers**: Manage local MCP server execution directly within AI Toolkit with start, stop, and refresh operations for enhanced development workflows.
- **Local Tracing Support for Agent Framework**: Enhanced tracing visualization with support for Agent Framework: including `Invoke Agent` and `Execute Tool` tags, comprehensive input/output handling, and backend support for receiving OTLP metrics.
![tracing_agent_framework](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_1017/tracing_agent.png)

### Fixed
- Fixed missing `--pre` flag in generated code comments for proper pre-release version handling.
- Fixed `connect ECONNREFUSED` error when debugging local MCP servers.
- Fixed incorrect usage of `AzureOpenAIModelConfiguration` import in generated evaluation code.
- Fixed model configuration inconsistencies in generated evaluation code across the project.
- Fixed evaluation code generation incorrectly implementing custom code for built-in evaluators instead of using them directly.

## Version 0.24.0
This is a major milestone release introducing **GitHub Copilot Tools Integration** and other enhancements.

### GitHub Copilot Tools Integration
![copilot_tools](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_1017/copilot_tools.png)
We are excited to announce the integration of **GitHub Copilot Tools** into AI Toolkit for VS Code. This integration empowers developers to build AI-powered applications more efficiently by leveraging Copilot's capabilities enhanced by AI Toolkit. 
- **AI Agent Code Generation Tool**: This tool provides best practices, guidance, steps, and code samples on Microsoft Agent Framework for GitHub Copilot to better scaffold AI agent applications.
- **AI Agent Evaluation Planner Tool**: This tool guides users through the process of evaluating AI agents, including defining evaluation metrics, creating evaluation datasets, and analyzing results. It will invoke several other tools:
  - **Evaluation Agent Runner Tool**: This tool runs agents on provided datasets and collects results.
  - **Evaluation Code Generation Tool**: This tool provides best practices, guidance, steps, and code samples on Azure AI Foundry Evaluation Framework for GitHub Copilot to better scaffold code to evaluate AI agents.

You can directly access these tools in GitHub Copilot by entering your user prompt like: `Create an AI agent using Microsoft Agent Framework to help users plan a trip to Paris.` or `Evaluate the performance of my AI agent using Azure AI Foundry Evaluation Framework.`

Alternatively, AI Toolkit offers quick access to these tools via the Tree View UI under section `Build Agent with GitHub Copilot`.

### Additional Enhancements
- **Model Playground Improvements**: The divider between chat output and model settings is now resizable, allowing users to customize their workspace layout for better usability.
- **Model Catalog Updates**: The ONNX models section in the Model Catalog has been merged with Foundry Local Models on macOS and Windows platforms, providing a unified experience for discovering and selecting local models.

## Version 0.22.1
Incremental release with new `codex` model additions:
![codex](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0925/codex.png)
- **[GPT-5-CODEX](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/announcing-gpt%E2%80%915%E2%80%91codex-redefining-developer-experience-in-azure-ai-foundry/4455524)**: A revolutionary model that seamlessly integrates multimodal coding capabilities, enabling advanced tool utilization across diverse development environments while providing expert-level code review functionality.
- **[CODEX-MINI](https://devblogs.microsoft.com/foundry/codex-mini-fast-scalable-code-generation-for-the-cli-era/)**: An optimized variant of the o4-mini model, specifically engineered for lightning-fast, instruction-driven code generation tailored to command-line interface workflows.

## Version 0.22.0
We’re excited to announce the release of **AITK v0.22.0**, a major milestone that aligns closely with the **Windows ML GA** and brings significant enhancements across model conversion, fine-tuning, and playground experiences for local models on windows devices. 

**Model Conversion**

Model conversion now supports a broader set of **Recipes**, enabling developers to convert and optimize models across a wider range of hardware targets. This includes full support for **all supported execution providers (EPs)** that are aligned with the **Windows ML GA**.  

 - Conversion workflows now integrate seamlessly with WinML’s EP management, ensuring optimal performance across CPUs, GPUs, and NPUs. 

 - For more details, refer to the [Model Conversion Documentation](https://code.visualstudio.com/docs/intelligentapps/modelconversion).  

**Model Fine-Tuning** 

We’ve significantly improved the **end-to-end fine-tuning workflow** for the **Phi-Silica** model. 

![finetuninguri](https://raw.githubusercontent.com/microsoft/vscode-ai-toolkit/refs/heads/main/archive/Images/finetuning-new.png)

**Model Playground**  

The **Model Playground** now fully aligns with the **Windows ML GA** capabilities. 

 - Enables real-time local model inferencing across diverse hardware configurations using Windows ML, which distributes, manages, and registers AI workloads for high-performance on-device execution.  

## Version 0.20.0
This major milestone release introduces significant enhancements and powerful new capabilities:

- **Reimagined Agent Builder**: Experience a completely redesigned Agent Builder with enhanced usability and functionality:
![agentbuilderui](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0910/agentbuilernewui.png)

  - **Conversation-Centric Interface**: Navigate effortlessly through a redesigned UI that puts conversations at the center, streamlining agent interactions and management.
  - **Flexible Modular Architecture**: Create your AI agent using a modular interface for prompt editing, model selection, and tool configuration — all seamlessly integrated for maximum flexibility.
  - **Unified Agent Management**: Access all your agents from a single, centralized location in **My Resources**, making it simple to create, edit, and switch between different agent configurations.

- **Local Model Support from Foundry**: Run AI models directly on your machine with our new Foundry Local Models integration:
![agentbuilderui](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0910/foundrylocal.png)

  - **Seamless Model Discovery**: Browse and select from an extensive catalog of Foundry Local Models with just a few clicks.
  - **Integrated Local Execution**: Run models locally through the Model Playground without external dependencies.
  - **GitHub Copilot Integration**: Leverage Foundry Local Models directly within GitHub Copilot for enhanced development experiences.

- **Enhanced MCP Experience**: Enjoy a completely overhauled Model Context Protocol (MCP) experience with improved functionality:
![mcp](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0910/mcp.png)
  - **Latest Specification Support**: Full compatibility with the newest MCP specification, including streamable HTTP transport and OAuth authentication capabilities.
  - **Intuitive Configuration Interface**: Configure MCP servers effortlessly through our redesigned quick-pick UI, featuring instant access to popular servers and direct configuration file editing.
  - **Streamlined Server Management**: Manage all your MCP servers from a unified location in **My Resources**, with simplified lifecycle management and configuration options.

- **GitHub Copilot Tool Integration**: Accelerate AI-powered development with new tools designed specifically for GitHub Copilot:
![ghtools](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0910/ghtools.png)
  - **AI Model Guidance Tool**: Get intelligent recommendations for selecting and implementing AI models in your applications.
  - **Advanced Tracing Tool**: Implement comprehensive tracing instrumentation with automatic deeplink generation for seamless visualization in AI Toolkit.

## Version 0.18.3
This incremental release introduces the latest [GPT-5 family of models](https://openai.com/index/introducing-gpt-5/) and OpenAI's open source models [GPT OSS](https://azure.microsoft.com/en-us/blog/openais-open%E2%80%91source-model-gpt%E2%80%91oss-on-azure-ai-foundry-and-windows-ai-foundry/) to AI Toolkit.

- **GPT-5 Family of Models:** Now available in AI Toolkit through GitHub, Azure AI Foundry, or direct OpenAI access
![gpt-5_catalog](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0808/gpt-5_catalog.png)
  - **[gpt-5](https://github.com/marketplace/models/azure-openai/gpt-5):** Delivers advanced reasoning for analytics and code generation.
  - **[gpt-5-mini](https://github.com/marketplace/models/azure-openai/gpt-5-mini):** Optimized for low-cost, fast experiences such as real-time agents and tool orchestration for customer support.
  - **[gpt-5-nano](https://github.com/marketplace/models/azure-openai/gpt-5-nano):** Designed for speed and efficiency, offering strong reasoning for concise question answering and responses.
  - **[gpt-5-chat (preview)](https://github.com/marketplace/models/azure-openai/gpt-5-chat):** Enables natural, multimodal, multi-turn conversations with persistent context for agentic workflows.


- **GPT OSS Models:** Via Azure AI Foundry and Local ONNX Runtime
![gpt_oss_catalog](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0808/gpt_oss_catalog.png)
  - **[gpt-oss-120b](https://ai.azure.com/catalog/models/gpt-oss-120b) via Azure AI Foundry:** gpt-oss-120b is an open-weight model with the following key characteristics: Text-in/text-out only Reasoning with chain-of-thought (with ability to change reasoning effort to low, medium, or high) Support for structured outputs API compatible with Responses
  - **[gpt-oss-20b-cuda-gpu](https://ai.azure.com/catalog/models/gpt-oss-20b-cuda-gpu) via Local ONNX Runtime:** This model is an optimized version of gpt-oss-20b to enable local inference on CUDA GPUs. This model uses RTN quantization.

- **Experience GPT-5 and GPT OSS Capabilities**
  - Compare GPT-5 models with others in the catalog to evaluate their capabilities.
    ![gpt-5_comparison](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0808/gpt-5_compare.png)
  - Integrate GPT-5 models into your applications using the `View Code` feature in Model Playground, with support for Azure AI Inference SDK, OpenAI SDK, and multiple programming languages.
    ![gpt-5_integration](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0808/gpt-5_view_code.png)

## Version 0.18.0
This is a major milestone release with significant updates and new features:
- **Local Observability for AI applications and Agents**: You can trace the execution of your AI applications, including interactions with generative AI models and use AI Toolkit tracing visualization tool to gain insights into their behavior and performance.
![tracing](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0731/Tracing.gif)

- **AI-Powered Prompt Improver**: The new AI-powered prompt improver helps you refine your prompts for better results. It analyzes your prompts and suggests improvements to enhance their effectiveness.
![prompt improver](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0731/PromptImprover.gif)

- **View Code Language Expansion**: The "View Code" feature in the Agent Builder and Playground now supports multiple programming languages including Python, JavaScript, C# and Java. This allows you to see how your prompts can be implemented in different programming languages, making it easier to integrate AI capabilities into your applications.
![language expansion](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0731/LanguageExpansion.gif)

- **Enhancements and Bug Fixes**:
  - Model sections will be automatically expanded when you apply a filter, making it easier to navigate through models.
  - Added CUDA models to the model catalog, providing more options for GPU-accelerated AI applications.
  - Fixed an issue where MCP initialization in generated code does not carry headers. [#243](https://github.com/microsoft/vscode-ai-toolkit/issues/243)

## Version 0.16.0
This is a major milestone release featuring significant enhancements and exciting new capabilities:

- **Agent Builder Enhancements**:
  - **Function Calling Support**: You can now define and invoke custom functions directly within agent prompts, enabling more powerful and flexible agent interactions.
    ![Function calling](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0701/function_calling.png)
  - **Version Management**: Easily manage and compare different versions of your agents, simplifying iteration and improvement processes.
    ![Version management](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0701/compare.png)
  - **Usability Improvements**:
    - The divider between input and output panels is now resizable, allowing you to customize the workspace layout to your preference.
    - The evaluation results table has been optimized for a more compact and user-friendly viewing experience.

- **Model Catalog Enhancements**:
  ![Catalog](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0701/catalog.png)
  - **Expanded Model Selection**: Over 100 new models from Azure AI Foundry have been added, significantly broadening your options for model selection.
  - **Direct Deployment**: Deploy models directly to Azure AI Foundry from within the model catalog, streamlining your workflow.
  - **Improved Popular Models Section**: Popular models from multiple providers are now grouped together, making it easier to discover and access models from various sources.

- **Playground Enhancements**:
  - **Simplified Deployment Guidance**: AI Toolkit now proactively assists you in deploying models to Azure AI Foundry when encountering rate limits or other errors, ensuring smoother development experiences.
    ![Upsell](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0701/upsell.png)


## Version 0.14.0
This is a major milestone release with significant updates and new features:

- **Integrated Evaluation for Agent Builders**: Streamlined testing and evaluation capabilities for AI agents:
![Evaluation UI showcasing prompt and evaluation tabs](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0519/Eval_2.png)
  - Seamlessly switch between the `Prompt` and `Evaluation` tabs for single or batch agent evaluations.
  - Utilize variables within prompts and evaluations using the `{{}}` syntax.
  - Generate synthetic data using LLMs based on provided prompts and variables.
  - Customize data generation logic directly within the interface.
  - Import and export evaluation datasets in CSV or JSONL formats.
  - Access detailed and expanded views of evaluation results.
  ![Detailed view of evaluation results](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0519/Detail.png)
  - Manually add or modify evaluation data entries.
  - Provide quick feedback on evaluation outcomes with thumbs-up and thumbs-down indicators.

- **Built-in [Evaluators for AI Agents](https://learn.microsoft.com/azure/ai-foundry/concepts/evaluation-metrics-built-in?tabs=warning#key-dimensions-of-evaluation)**: Added predefined evaluators to enhance agent assessment:
![Agent evaluation metrics interface](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0519/Agent_Eval.png)
  - `Intent Resolution`: measures how well the agent identifies and clarifies user intent, including asking for clarifications and staying within scope.
  - `Tool Call Accuracy`: measures the agent’s proficiency in selecting appropriate tools, and accurately extracting and processing inputs.
  - `Task Adherence`: measures how well the agent’s final response meets the predefined goal or request specified in the task.

- **Model Conversion and Optimization Tools**: Simplified processes for model conversion, quantization, optimization, and evaluation.
![Model conversion and optimization tools interface](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0519/ModelConversion.gif)
  - **Quantization Recipes for NPUs**: Support for Intel, AMD, and Qualcomm NPU devices.
  - **Integrated Inference**: Python notebooks provided for convenient model inference within the toolkit.
  - **Workspace Management**: Customizable workflows and efficient management of model workspaces.
  - **Dedicated Python Environments**: Automatically configured standalone Python environments with all necessary dependencies for each workflow execution.

- **LoRA Adapter Training for Phi Silica**:
  - Easily initiate fine-tuning jobs on Azure directly from AI Toolkit by providing your training dataset.
  - Upon completion (typically around one hour), download your trained LoRA adapter for immediate integration into your applications via Windows AI APIs.
  - LoRA inferencing support within AI Toolkit will be available soon; meanwhile, explore LoRA capabilities through the AI Dev Gallery during Build by visiting the LoRA sample page.

- Onboarded new models from GitHub:
  - [DeepSeek-V3-0324](https://github.com/marketplace/models/azureml-deepseek/DeepSeek-V3-0324): Demonstrates notable improvements over its predecessor, DeepSeek-V3, in several key aspects, including enhanced reasoning, improved function calling, and superior code generation capabilities.
  - [Llama-4-Maverick-17B-128E-Instruct-FP8](https://github.com/marketplace/models/azureml-meta/Llama-4-Maverick-17B-128E-Instruct-FP8): Great at precise image understanding and creative writing, offering high quality at a lower price compared to Llama 3.3 70B
  - [Llama-4-Scout-17B-16E-Instruct](https://github.com/marketplace/models/azureml-meta/Llama-4-Scout-17B-16E-Instruct): Great at multi-document summarization, parsing extensive user activity for personalized tasks, and reasoning over vast codebases.
  - [MAI-DS-R1](https://github.com/marketplace/models/azureml/MAI-DS-R1): A DeepSeek-R1 reasoning model that has been post-trained by the Microsoft AI team to fill in information gaps in the previous version of the model and improve its harm protections while maintaining R1 reasoning capabilities.
  - [Phi-4-mini-reasoning](https://github.com/marketplace/models/azureml/Phi-4-mini-reasoning): Lightweight math reasoning model optimized for multi-step problem solving.
  - [Phi-4-reasoning](https://github.com/marketplace/models/azureml/Phi-4-reasoning): State-of-the-art open-weight reasoning model.
  - [cohere-command-a](https://github.com/marketplace/models/azureml-cohere/cohere-command-a): A highly efficient generative model that excels at agentic and multilingual use cases.
  - [mistral-medium-2505](https://github.com/marketplace/models/azureml-mistral/mistral-medium-2505): Mistral Medium 3 is an advanced Large Language Model (LLM) with state-of-the-art reasoning, knowledge, coding and vision capabilities.
  - [mistral-small-2503](https://github.com/marketplace/models/azureml-mistral/mistral-small-2503): Enhanced Mistral Small 3 with multimodal capabilities and a 128k context length.
  - [o3](https://github.com/marketplace/models/azure-openai/o3): o3 includes significant improvements on quality and safety while supporting the existing features of o1 and delivering comparable or better performance.
  - [o4-mini](https://github.com/marketplace/models/azure-openai/o4-mini): o4-mini includes significant improvements on quality and safety while supporting the existing features of o3-mini and delivering comparable or better performance.

## Version 0.12.0
This is a major milestone release with significant updates and new features:

- **Agent Development**: Introducing **Agent (Prompt) Builder**, evolved from the **Prompt Builder**. The new Agent (Prompt) Builder allows you to create and manage agents with a more intuitive interface. You can now easily create, edit, and test agents in a user-friendly environment. Key features include:
![Agent Builder](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0421/Agent_Builder_2.png)
  - **Refreshed User Interface**: The new Agent (Prompt) Builder offers a refreshed user interface, making it easier to create, edit, and test agents.
    - Restructured the UI to use a input and output panel design
    - Move `Structure output` from right output panel to left input panel
    - Move `Run` button to the bottom of input panel
    - Move `View Code` button to the bottom of output panel
  - **Quick Starter**: The `Web Developer` agent on quick starter can use a file system MCP tool to store assets in local disk.
  - **MCP Tool Integration**: Build an agent that can use various MCP tools. AI Toolkit enables you to:
    - Connect to an existing MCP server via `stdio` or `sse`.
    - Create your own MCP server from `Weather MCP Server` scaffold using your preferred programming language, either TypeScript or Python.
    - Test and debug your MCP server in AI Toolkit Agent Builder or using the MCP Inspector.
    - Discover and configure the featured MCP server built by MCP Reference implementations, Microsoft and communities.
    
- **Models Enhancements**: We are continuing to refresh the collections of models and the experience of using them:
  - Onboarded [GPT-4.1](https://openai.com/index/gpt-4-1/): A new series of GPT models featuring major improvements on coding, instruction following, and long context.
  - Enhanced onboarding experience for prompting to use a default model `GPT-4o` when there is no explicit model selected.
  - Refreshed the Popular Models section:
    - Added `Phi-4 (via ONNX)`
    - Added `GPT-4.1 (via GitHub)`
    - Added `GPT-o1 (via GitHub)`
    - Removed `QwQ (via Ollama)`
    - Removed `Claude 3.7 Sonnet (via Anthropic)`
    - Removed `GPT-4.5 Preview (via OpenAI)`

## Version 0.10.9
This version is an incremental release with feature improvements:
- Improved the **Tutorial** with richer user interface so that you can easily browse and start a tutorial.
  ![Tutorial](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0331/Tutorial.gif)
- Added Starter Prompts in **Prompt Builder** for quick getting started with building prompts.
  ![Starter](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0331/Starter.gif)

## Version 0.10.7

This version is an incremental release with feature improvements and bug fixes:
- Support Nvida NIM models running on Windows AI PCs.
  ![NIM](https://raw.githubusercontent.com/MuyangAmigo/MuyangAmigo/main/assets/aitk_0331/NIM.png)

## Version 0.10.5
This version is an incremental release with feature improvements and bug fixes:

- **Tutorials**: Introduce first set of tutorials for common prompt engineering practices. Start one with **CATALOG** > **Tutorials**  
  ![tutorials](https://github.com/user-attachments/assets/240d4034-7731-4975-905d-3241e97293a1)

- **Compare** model responses in Playground  
  ![compare](https://github.com/user-attachments/assets/8144c63a-3f1f-4a5a-948b-916dff07512d)

- **Think Mode** for Claude 3.7 Sonnet model in **Playground** and **Prompt Builder**  
  ![think_in_pb](https://github.com/user-attachments/assets/b42dce7d-2f12-4531-9658-0d1d0079276a)

- **Model Additions**:
  - [QwQ](https://qwenlm.github.io/blog/qwq-32b/) via Ollama: Thinking and reasoning model of the Qwen series.
  - [GPT-4.5](https://openai.com/index/introducing-gpt-4-5/) from OpenAI: A general-purpose LLM targeted at providing more natural, fluid interactions that are humanlike.
  - [DeepSeek v3](https://github.blog/changelog/2025-03-07-deepseek-v3-is-now-generally-available-in-github-models/) via GitHub: Strong performance in coding, math and reasoning tasks.

- Incremental feature enhancements:
  - **Playground** improvements:
    - Copy model response
    - Regenerate response with the same or a different model
  - **Model Catalog** improvements:
    - Quick access to `Claude 3.7 Sonnet`, `GPT-4.5` and `QwQ` model via `Popular Models`
    - Filter models by features such as Web Search, Attachment and Structured Outputs

## Version 0.10.4
This version is an incremental release with feature improvements and bug fixes:
 - Support DeepSeek-R1 Model 7B and 14B 

## Version 0.10.2
This version is an incremental release with feature improvements and bug fixes:
- More AI models are supported:
  - [Anthropic Claude 3.7 Sonnet](https://www.anthropic.com/news/claude-3-7-sonnet) model (excluding `extended thinking mode`)
  - [Phi-4-mini-instruct](https://github.com/marketplace/models/azureml/Phi-4-mini-instruct)
  - [Phi-4-multimodal-instruct](https://github.com/marketplace/models/azureml/Phi-4-multimodal-instruct)
- Playground improvements:
  - Add web search support for models that are capable doing it (e.g., Gemini 2.0)
  - Add support to extract file content (text, PDF, JSON...) for models lacking native attachment support
  - Recommend conversation starters when opening Playground
  - Add default pre-selected model when opening Playground 
- Prompt Builder improvement:
  - Improve the UI to help new user get started 

## Version 0.10.1
This is an incremental release with feature enhancements and bug fixes:
- Improved model catalog experiences:
  - Streamline Ollama lifecycle (download, load, multi quantization in one card)
  - Enable access of popular Ollama models in model catalog
  - Categorize models for easy model discovery
  - Search models
- Playground improvements:
  - Auto naming the new playground/prompt
  - New playground carries over the last model selection & preference
- UI improvements:
  - Group my models by host in tree view
  - Support streaming response in Prompt Builder

## Version 0.10.0
This is a major milestone release with new feature additions and updates:
  - More AI Models:
    - GitHub hosted o3-mini model
    - Google Gemini 2.0 models
    - Anthropic Claude 3.5 Haiku model
    - Nvidia hosted NIM models
  - Prompt Builder:
    - Allow easy prompt creating / editing / testing
    - Generate prompt using AI models
    - Support structured output
    - Generate ready code to interact prompts with AI model 
  - Playground Improvements:
    - Refined Deepseek-R1 thought UI
    - Refined Markdown and Latex rendering from model output
  - Bulk Run Improvements:
    - Generate dataset using AI models
    - Support structured output
  - Custom Evaluator:
    - Custom evaluator from Python codes
    - Custom evaluator from LLM prompt
    

## Version 0.8.6
This is a patch version to the major milestone release 0.8.0 with feature improvement:
  - Support DeepSeek R1 Distilled (qwen 1.5B) NPU Model for Copilot+ PCs
    - Supported SKU:
      - Qualcomm Snapdragon X   
      - Intel Core Ultra 200V - coming soon

## Version 0.8.5
This is a patch version to the major milestone release 0.8.0 with feature improvement:
  - Support DeepSeek-R1 Model

## Version 0.8.3
This is a patch version to the major milestone release 0.8.0 with some feature improvements and bug fixes:
   - Support chat history management in Playground.
   - Support prompt templating with variable in Bulk Run.

## Version 0.8.0
This is a milestone release with core feature additions and improvements
  - Support Bulk Run that user can run any prompts from imported datasets or run in full bulk 
  - Evaluate a dataset with a set of pre-defined popular evaluators
  - Incremental UI/UX improvements and bug fixes

## Version 0.6.2
This is a patch version to the major milestone release v0.6.0, with some highly demanded feature improvements and bug fixes:
  - Support Ollama models from more UI entries with improved doc
  - Support Intel-based Mac (ONNX models support coming next)
  - Support attachment for selected GitHub multi-modal models: (Llama-3.2-11B-Vision-Instruct / Llama-3.2-90B-Vision-Instruct / gpt-4o / gpt-4o-mini / Phi-3.5-vision-instruct)
  - Added direct entry of developer documentation from AI Toolkit treeview 
  - Support responsive UI for attachments
  - Count the total tokens used in each playground conversation
  - Multiple bug fixes

## Version 0.6.0
This is a major milestone release with significant additions of features and resources.

  - Most popular generative AI models on market are now supported:
    - GitHub models
    - ONNX optimized models that run on local CPU (including Windows optimized Small Language Models like Phi family)
    - Anthropic Claude Models
    - Google Gemini Models
    - Meta Llama Models
    - And more
  - Bring your own model as remote model.
  - Quickly discover a model by comprehensive filters and detailed model card in model catalog.
  - Inference test and chat with a model in Playground with improved experience.
  - Attachment in playground chat is now supported for multi-modal models.
  - Further improved get started guide.
    
With these features, developers can easily get start and explore any popular genAI model from a single tool. 

## Version 0.5.0
0.5.x are pre-released versions with major improvements on model selections and playground experience.

  - GitHub AI models are now supported (Requiring proper GitHub License).
  - Filters are added on model catalog.
  - Models run in AI Toolkit can now be edited and deleted.
  - In-code evaluation sample published.
  - Get started guide with a simple Small Language Model is now available for new users.

## Version 0.4.0
This version adds the key support for Mac users and AI PC users:

  - Mac-Silicon (M1, M2, etc.) is now supported, Mac-Intel is not yet supported.
  - Mac doesn't have NVidia GPUs, so we hide local finetuning entry for Mac version AI Toolkit.
  - AI PC (Copilot PC) is supported.

We are excited to announce another important feature:
    
  - Remote inference test in playground is now supported, through connecting to remote model endpoint. Both UI and Command Palette have entry for connecting to a remote model endpoint.

## Version 0.3.0
We are excited to announce that Windows AI Studio has been renamed to AI Toolkit for Visual Studio Code, to expand its support of broader range of AI models, covering major scenarios for AI Engineers or App Developers to develop intelligent app with AI models. With this preview version 0.3.0, we are introducing many new features and enhancements:

**Redesigned UI**

We have made significant UI design updates to improve the visuals and user experiences.

**Model catalog**

The new Model catalog helps developer to easily discover and download a supported text generation AI model to local environment. In this version we support:

   - Phi-2 
   - Phi-3-mini with a variety of sizes and CPU/GPU supports
   - mistral-7b

**Playground for inference**

Downloaded models are ready to test inference with newly enhanced UI on local environment, with proper CPU or GPU support.

**Fine-tune model locally**

If developer's local environment has GPU support, model fine-tuning can be performed on local machine, after passing the pre-requisite test. Current supported models for fine-tuning:

   - meta-llama/Llama-2-7b
   - microsoft/phi-2
   - mistralai/Mistral-7B
   - microsoft/phi-1_5
   - microsoft/Phi-3-mini-4k-instruct
   - HuggingFaceH4/zephyr-7b-beta

**Fine-tune model remotely**

This is a preview feature that can be enabled from Visual Studio Code settings. For developers who have access to Azure cloud resources with GPU, they can perform the fine-tune jobs on Azure Container App remotely from Visual Studio Code.

**Deploy models**

Fine-tuned models can be deployed to a provisioned Azure Container App for testing or integrating.

**Coming soon**

We are actively adding support for e2e development needs around AI app and AI models.
   - Add more models for inference and fine-tune support.
   - Enable batch test and auto-evaluation of AI models.
   - Streamlined development and test support for intelligent apps with AI models.
   - Enhacing RAG and Prompt engineering support for developing and testing AI apps with AI models.


## Version 0.2.4

The selection of Windows optimized models is now available in Windows AI Studio. You can download those models from Hugging Face and GitHub and use in your Windows applications.

## Version 0.2.3

This version adds a prerequisite check, ensuring that VS Code does not have a remote connection.

## Version 0.2.2

This version fixes a few bugs, including -

- Conda environment fails to install in certain cases.

## Version 0.2.0

We are excited to introduce Windows AI Studio Preview version 0.2.0, which brings several new features and enhancements to simplify generative AI app development and local fine-tuning. Here's what's new:

### New Features and Enhancements

1. **Model Catalog**
   - Windows AI Studio now offers an expanded model catalog powered by Azure ML and Hugging Face. In this release we offer 3 text generation AI models ready to be configured for fine-tuning and inferencing locally.

        - Meta/Llama-2-7b
        - Microsoft/phi-1.5
        - Microsoft/phi-2
        - mistralai/Mistral-7B
        - HuggingFaceH4/zephyr-7b-beta

2. **Prerequisites Check**
   - Before installing Windows AI Studio, the new Prerequisites Check ensures that your system meets the necessary requirements, such as NVIDIA GPUs with minimun 8GB VRAM and recommended 16GB+ VRAM with a compatible WSL Ubuntu distribution installed. This ensures a smooth installation process.

   - Expected times for different GPUs on default Dataset

      | GPU             | Dataset | Time    |
      |-----------------|---------|---------|
      | RTX 3080 Ti Mobile | Default | 52 mins |
      | RTX 4090 | Default |  42 mins |
      | RTX A6000 | Default | 35 mins|
      | RTX ADA5000 Mobile | Default | 49 mins |
      | RTX A6000 ADA | Default | 32 min |
      

3. **Model Fine-tuning**
   - Fine-tuning AI models has never been easier. With Windows AI Studio, you can select a model from the catalog and fine-tune it locally using QLoRA. You can get started with your GitHub account.

4. **Customizable Settings**
   - When fine-tuning a model, you have the flexibility to adjust various settings, including data types, dropout probabilities, batch sizes, and more. Customize the parameters to optimize the fine-tuning process for your specific scenario.

5. **Windows Optimized Models**
   - Discover a collection of publicly available AI models already optimized for Windows. These models are sourced from different locations, including Hugging Face and GitHub, and are ready for download and use in your Windows applications.

6. **Q&A Page**
   - To address common issues and provide resolutions, we have introduced a [FAQ page](https://aka.ms/ai-toolkit/doc-faq). You can refer to this page for solutions to frequently encountered problems.

7. Please see our [documentation](https://aka.ms/ai-toolkit/doc-overview) for more in depth information and walkthrouhgs of the tool.

### Coming Soon

While the current release brings many exciting features, we are also working on the following additions:

- **RAG Project**: Stay tuned for the upcoming RAG Project feature, which will further enhance your AI development capabilities.

- **Phi-2 Model Playground**: Explore the Phi-2 Model Playground, a new feature that will provide an opportunity of using Phi-2 locally directly from the tool.
