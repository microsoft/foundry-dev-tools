---
name: open-foundry-canvas
description: Open the Microsoft Foundry Canvas panel in GitHub Copilot App.
compatibility: Requires GitHub Copilot App with the agent-builder canvas and open_canvas tool.
---

# Open Foundry Canvas

This command only opens Canvas. Call `open_canvas` once with:

```json
{
  "canvasId": "agent-builder",
  "instanceId": "foundry-agent-builder",
  "input": {}
}
```

After success, reply "Foundry Canvas is open" in the user's language. If the tool is unavailable or opening fails, briefly report that Canvas could not be opened without retrying.
