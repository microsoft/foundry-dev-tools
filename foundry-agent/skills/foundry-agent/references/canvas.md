# FoundryX Canvas

Open the `foundryx-canvas` canvas when the user explicitly asks to list or view
deployed Agents, or by default after a successful `foundryx agent deploy`. It
lists all Agents in projects where the user
has developer access, matching `foundryx agent list --project <project-id>`, and
provides publishing actions. For a text listing, use that CLI command for each
applicable project from `foundryx access project list`.
Reuse an existing matching canvas when available. Opening the canvas is a display
step; continue any remaining requested work.

The canvas shares the CLI account and credential cache.
