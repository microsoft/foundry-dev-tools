# Catalog sync trust model

The catalog workflow is invoked by maintainers through `workflow_dispatch` and
uses the repository's existing shared Repository secrets. This preserves the
credential model used by the catalog workflow before the staged implementation.
The generation helper is called explicitly with only its three model secrets;
it does not use `secrets: inherit`.

## Trusted execution

[Manual dispatch requires repository write access](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).
People authorized to edit and dispatch repository workflows are trusted to use
the configured credentials. Maintainers must inspect the selected workflow ref
before dispatching it; do not run unreviewed external workflow or script changes
with these credentials. The entry workflow does not use a pull-request trigger.

`github.sha` pins the selected execution revision for reproducibility. It is not
proof of approval and does not isolate credentials from a malicious repository
writer. If writers must be treated as untrusted, separately introduce approved
execution refs and server-enforced credential restrictions across all consumers.
A condition in editable workflow YAML alone cannot establish that boundary.

## Untrusted data

Sample source and generated catalog content are data, not executable workflow
code. Review source is fetched at a fixed commit and its blob hashes are checked.
The model runs in a read-only container with restricted tools and network access;
GitHub and Azure credentials stay in the host. Trusted host code validates the
proposed edit scope, evidence references, catalog invariants and regression tests
before appending a commit to the expected Draft PR head without force-pushing.

External Actions use immutable commit SHAs. No source code from the sample
bundle or data PR is executed. No approval or merge is automated.

## Credentials and validation

Keep the existing Repository secrets shared by other workflows. No Environment
migration is required for this model. Never print values or place them in source,
PR comments, logs or artifacts. A no-change `validation_only` run exercises the
unprivileged scan and checks; a changed-source run also exercises model jobs.
Human review is still required before merging either implementation or data PRs.