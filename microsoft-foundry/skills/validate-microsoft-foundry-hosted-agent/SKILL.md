---
name: validate-microsoft-foundry-hosted-agent
description: Validate one Microsoft Foundry hosted agent against Microsoft Foundry best practices and open its validation report. Use when the user explicitly asks to validate a Foundry hosted agent or invokes this skill.
compatibility: Requires GitHub Copilot with the microsoft-foundry skill and hosted-agent-validation-report canvas.
---

# Validate a Microsoft Foundry hosted agent

Treat the slash-command input as free-form validation input:

1. Use its `agentPath`, or the current working directory when none is supplied. Preserve `rulesFile` and other input.
2. Load the `microsoft-foundry` skill and follow `foundry-agent/validate/validate.md`. Pass `agentPath` as the only target context; the canonical workflow selects and validates one hosted agent.
3. If the workflow returns `no-hosted-agent`, ask once for a direct path and retry. Stop if the user provides no path or the retry finds no agent.
4. When the workflow returns a JSON/Markdown report pair, open exactly one `hosted-agent-validation-report` canvas with the returned JSON path:

   ```json
   {
     "report": "<absolute or workspace-relative JSON report path>"
   }
   ```

5. Derive a stable instance ID from the report path. Use only alphanumeric characters, `.`, `_`, or `-`; start with an alphanumeric character; and limit it to 128 characters.
6. Do not open a canvas without a report pair.
