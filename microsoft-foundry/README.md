# Microsoft Foundry Canvas

A GitHub Copilot App canvas extension for designing Microsoft Foundry hosted
agents from a side panel. It combines live Foundry project discovery with
project-aware prompts to Copilot, portal handoffs, and an embedded local Agent
Inspector.

## Features

- **Project picker** - sign in, search subscriptions and Foundry projects, switch projects, and retain the
  selection across canvas reopens.
- **Live project resources** - browse deployed models, Foundry Toolboxes and
  their tools, project skills, and account guardrails.
- **Project-aware chat handoff** - model, toolbox, skill, guardrail,
  initialization, and deployment choices send a ready-to-run prompt to the
  current Copilot session with the selected project, subscription, and endpoint
  attached.
- **Embedded Agent Inspector** - **Inspect Locally** launches or reuses
  `azd ai agent run --no-inspector` in the Copilot integrated terminal, waits
  for the agent on port `8088`, and embeds the bundled inspector. Inspector
  errors can be sent back to Copilot as fix requests.

## Install

Open GitHub Copilot App, go to the **Customize** tab, select **Plugin**, and search for `microsoft-foundry`. Install the plugin from the [awesome-copilot marketplace](https://awesome-copilot.github.com/plugin/microsoft-foundry/).

## Usage

1. Ask Copilot to *create a Foundry hosted agent*, then the Canvas will be opened in the right panel automatically.
2. Open the canvas project menu, sign in if needed, and choose a subscription and Foundry project.
3. Create a hosted agent with random idea via **Inspire me**, or start from a **Hello world** sample prompt.
4. Switch to other deployed models, connect existing toolboxes, skills, or guardrails for the created agent.
5. Click **Deploy to Foundry** when the agent is ready.
6. Click **Inspect Locally** after the workspace contains a runnable Foundry hosted agent.
