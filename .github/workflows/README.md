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
code. CI scans a fixed source commit, generates template/card metadata, checks
catalog invariants and regression tests, and creates a Draft PR. It does not run
a post-publication editorial agent or append correction commits.

Action version tags follow the existing workflow. No source code from the sample
bundle or data PR is executed. No approval or merge is automated.

## Local acceptance

After Draft creation, use the
[review-sample-catalog skill](../skills/review-sample-catalog/SKILL.md) locally in
`review` mode, then `fix` confirmed findings when authorized. The generation
summary records the source SHA, generated PR head, workflow revision and skill
hash. Verify the actual current PR base/head and every affected implementation
at the catalog's pinned SHA; a green generation workflow is not semantic approval.

Keep accurate baseline Details, make natural minimal corrections, and judge
template descriptions by scenario accuracy rather than a 100-character limit.
Run tests and review the final diff before appending an authorized commit to the
existing upstream PR branch. Preserve unrelated content and never force-push,
approve or merge automatically. Do not execute sample code during prose review.

## Credentials and validation

Keep the existing Repository secrets shared by other workflows. No Environment
migration is required for this model. Never print values or place them in source,
PR comments, logs or artifacts. A no-change `validation_only` run exercises the
unprivileged scan and checks; a changed-source run also exercises model jobs.
Human review is still required before merging either implementation or data PRs.