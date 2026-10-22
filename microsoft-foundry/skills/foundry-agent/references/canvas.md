# FoundryX Canvas

When the user explicitly asks to list or view deployed Agents, open the
`foundryx-canvas` canvas directly. It lists all Agents in projects where the user
has developer access, matching `foundryx agent list --project <project-id>`, and
provides publishing actions. For a text listing, use that CLI command for each
applicable project from `foundryx access project list`.
Reuse an existing matching canvas when available. Opening the canvas is a display
step; continue any remaining requested work.

The canvas shares the CLI account and credential cache.
