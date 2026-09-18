# Microsoft Foundry DevTools

https://github.com/user-attachments/assets/66a5dd71-5bc6-4c6b-a4db-5676e364c74f

[![Get started with Foundry](https://img.shields.io/badge/Foundry-Get_started-0078D4?style=flat-square)](https://learn.microsoft.com/en-us/azure/foundry/how-to/develop/install-cli-sdk?tabs=windows%2Cpython%2Cazd-ai)
[![Install Foundry Toolkit for VS Code](https://img.shields.io/badge/VS_Code-Install_Toolkit-0098FF?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=ms-windows-ai-studio.windows-ai-studio)
[![Join the Foundry community on Discord](https://img.shields.io/badge/Discord-Join_the_community-5865F2?style=flat-square&logo=discord&logoColor=white)](https://aka.ms/azureaifoundry/discord)

**Your idea. Your workflow. Build with Foundry.**

Build AI applications and agents with [Microsoft Foundry](https://azure.microsoft.com/products/ai-foundry/), from your first local experiment to a deployed agent. Choose tools for your terminal, coding agent, VS Code, or a guided visual workflow.

This repository is your starting point for Foundry developer tools, documentation, and community feedback. It also hosts the source code for **Foundry Canvas**.

<a id="choose-your-tools"></a>

## 🧰 Choose your tools

Start with the workflow that fits how you work. These tools work together, so you can move between your terminal, coding agent, and visual tools as your project grows.

| Tool | What you can do | Explore | Release notes |
| --- | --- | --- | --- |
| ⌨️ **Azure Developer CLI (`azd`)** | Use `azd` and its Foundry extensions (`azd ai`) to scaffold, deploy, evaluate, and automate AI applications and agents from the terminal. | [Repository and quick start](https://github.com/Azure/azure-dev) | [Release notes](https://github.com/Azure/azure-dev/blob/main/cli/azd/CHANGELOG.md) |
| 🧠 **Foundry Skills** | Give your coding agent reusable guidance for Foundry development. The Microsoft Foundry Skill helps it build, deploy, and manage agents and models with `azd`. | [Skill guide](https://learn.microsoft.com/en-us/azure/foundry/how-to/develop/use-microsoft-foundry-skill) | [Release notes](https://github.com/microsoft/GitHub-Copilot-for-Azure/releases) |
| 💻 **Foundry Toolkit for VS Code** | Discover models, build and test agents, evaluate results, and manage Foundry resources without leaving VS Code. Formerly AI Toolkit. | [Toolkit documentation](https://code.visualstudio.com/docs/intelligentapps/overview?azure-portal=true) | [Release notes](https://microsoft.github.io/foundry-dev-tools/) |
| 🎨 **Foundry Canvas (preview)** | Design, configure, test, and deploy hosted agents from a guided side panel in GitHub Copilot App, with Copilot making the code changes. | [Canvas overview](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/foundry-canvas) | [Release notes](./microsoft-foundry/changelog.md) |

<a id="get-started"></a>

## 🚀 Get started

Follow [Prepare your development environment](https://learn.microsoft.com/en-us/azure/foundry/how-to/develop/install-cli-sdk?tabs=windows%2Cpython%2Cazd-ai) for prerequisites and setup on Windows, macOS, or Linux. **Foundry DevPack** is the recommended way to install the developer tools together. The guide also covers installing each tool separately.

DevPack adds the Toolkit and Canvas extensions only when their host apps are present. It does not install VS Code or GitHub Copilot App. See the [DevPack installer releases](https://github.com/microsoft/foundry-dev-tools/releases?q=devpack-installer&expanded=true) for version history.

| Your starting point | Next step |
| --- | --- |
| **Terminal** | [Install `azd` and the Foundry extensions](https://learn.microsoft.com/en-us/azure/foundry/how-to/develop/install-cli-sdk?tabs=windows%2Cpython%2Cazd-ai#install-developer-tools-separately). |
| **Coding agent** | [Install the Microsoft Foundry Skill](https://learn.microsoft.com/en-us/azure/foundry/how-to/develop/use-microsoft-foundry-skill) for your coding-agent host. |
| **VS Code** | [Install Foundry Toolkit](https://marketplace.visualstudio.com/items?itemName=ms-windows-ai-studio.windows-ai-studio), then follow the [Toolkit setup guide](https://code.visualstudio.com/docs/intelligentapps/overview#_install-and-setup). |
| **GitHub Copilot App** | Open the **Customize** tab, select **Plugin**, search for `microsoft-foundry`, and install it from the [awesome-copilot marketplace](https://awesome-copilot.github.com/plugin/microsoft-foundry/). Follow the [Canvas guide](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/foundry-canvas) to build your first hosted agent. |

<a id="source-code-and-contributions"></a>

## 🛠️ Source code and contributions

The tools have different source-code homes. This repository does not contain the implementation of every tool listed above.

| Tool | Source code |
| --- | --- |
| **azd** | Developed in [Azure/azure-dev](https://github.com/Azure/azure-dev). See its [contributing guide](https://github.com/Azure/azure-dev/blob/main/cli/azd/CONTRIBUTING.md). |
| **Foundry Skills** | Developed in [microsoft/GitHub-Copilot-for-Azure](https://github.com/microsoft/GitHub-Copilot-for-Azure). Browse the [Microsoft Foundry Skill source](https://github.com/microsoft/GitHub-Copilot-for-Azure/tree/main/plugins/azure-skills/skills/microsoft-foundry) and [contributing guide](https://github.com/microsoft/GitHub-Copilot-for-Azure/blob/main/CONTRIBUTING.md). |
| **Foundry Toolkit for VS Code** | **Not open source.** Its implementation is not in this repository, but we welcome Toolkit issues and feature requests here. |
| **Foundry Canvas** | Source code is in [`microsoft-foundry/`](./microsoft-foundry) in this repository. See its [README](./microsoft-foundry/README.md) for installation and usage. |

We welcome contributions to the source and documentation available in these repositories. Follow the contribution guidance in the repository you want to change. For contributions here, see the [Code of Conduct](./CODE_OF_CONDUCT.md). Source code in this repository is covered by its [license](./LICENSE); the closed-source Toolkit implementation is not included.

<a id="join-the-conversation"></a>

## 💬 Join the conversation

Talk with the developers building these tools. Share what you are working on, ask questions, discuss ideas, and help us improve the experience. **You do not need to contribute code to take part.** Whether you have a first experiment, a feature idea, or a bug to report, you are welcome here.

| Tool | Questions and ideas | Bugs and feature requests |
| --- | --- | --- |
| **azd** | [Discussions](https://github.com/Azure/azure-dev/discussions) | [Issues](https://github.com/Azure/azure-dev/issues) |
| **Foundry Skills** | [Discussions](https://github.com/microsoft/GitHub-Copilot-for-Azure/discussions) | [Issues](https://github.com/microsoft/GitHub-Copilot-for-Azure/issues) |
| **Foundry Toolkit for VS Code** | [Start or join an issue conversation](https://github.com/microsoft/foundry-dev-tools/issues) | [Issues](https://github.com/microsoft/foundry-dev-tools/issues) |
| **Foundry Canvas** | [Start or join an issue conversation](https://github.com/microsoft/foundry-dev-tools/issues) | [Issues](https://github.com/microsoft/foundry-dev-tools/issues) |

Search existing discussions and issues first. When you report a bug, include the tool name, version, operating system, steps to reproduce, and expected behavior. Remove secrets and personal data from logs and screenshots.

For security vulnerabilities, follow our [security reporting policy](./SECURITY.md) instead of opening a public issue.

<a id="documentation-and-updates"></a>

## 📚 Documentation and updates

- [Foundry development environment](https://learn.microsoft.com/en-us/azure/foundry/how-to/develop/install-cli-sdk?tabs=windows%2Cpython%2Cazd-ai): prerequisites and installation.
- [Foundry Toolkit documentation](https://code.visualstudio.com/docs/intelligentapps/overview?azure-portal=true) and [tutorials](https://aka.ms/foundrytk/tutorial): detailed features and walkthroughs.
- [Foundry Canvas documentation](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/foundry-canvas): the guided hosted-agent workflow.
- [Microsoft Foundry Discord community](https://aka.ms/azureaifoundry/discord): connect with other developers.

For private Foundry Toolkit bug reports or support concerns, contact [vscai-support@microsoft.com](mailto:vscai-support@microsoft.com). Report security vulnerabilities through the security policy linked above.

## Foundry Toolkit data and telemetry

Microsoft Foundry Toolkit for Visual Studio Code collects usage data and sends it to Microsoft to help improve our products and services. Read our [privacy statement](https://go.microsoft.com/fwlink/?LinkId=521839) to learn more. This extension respects the `telemetry.enableTelemetry` setting—learn more at [disable telemetry reporting](https://code.visualstudio.com/docs/supporting/faq#_how-to-disable-telemetry-reporting).
