# Catalog sync credential boundary

The catalog workflows use the `catalog-sync` GitHub Environment for model and
GitHub App credentials. GitHub must enforce its deployment rules before starting
the credentialed jobs; a YAML branch condition is not a security boundary.

## Environment policy

Allow only these exact **branch** names (no tags, pull-request refs or wildcards):

- `main`
- `template/dev`
- `template/stable`
- `template/pre-release`

Keep required-review branch protection on every allowed branch. Any change to
these protections or the environment allowlist requires a security review.
Checkouts use the workflow's immutable `github.sha`; that pins the execution
revision but establishes trust only together with the server-side branch policy.

## Secret migration

Use the environment settings in
[microsoft/foundry-dev-tools](https://github.com/microsoft/foundry-dev-tools/settings/environments)
to configure these environment secrets from their original secure source:

- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_DEPLOYMENT`
- `SYNC_APP_ID`
- `SYNC_APP_PRIVATE_KEY`

GitHub cannot return existing secret values. Do not put values in chat, source
files, PR comments, logs or artifacts. Do not silently replace them with another
local configuration. Reusable jobs consume environment secrets directly, not
caller-provided secrets or `secrets: inherit`.

1. Prepare and review environment-enabled workflows for all four branches.
   Each branch currently has a catalog sync workflow; older versions will lose
   credential access when the repository-level copies are removed.
2. Populate the environment secrets and verify their configuration through the
   approved secret-management process.
3. Remove the five repository-level copies and any organization-level grant of
   the same credentials to this repository. Otherwise a modified workflow can
   omit the environment and bypass its policy. Do not remove unrelated secrets.
4. Verify that an unapproved branch is rejected before a credentialed job starts,
   and that a protected branch can execute the approved workflow.

Until migration and bypass removal are verified, the trust-boundary finding
remains open. Creating the environment or changing checkout refs alone does not
complete the fix. Never auto-merge a workflow change to complete this rollout.

## Validation

A no-change `validation_only` run exercises unprivileged scan and validation
jobs. A feature-branch run with added samples is expected to be denied at the
environment-protected metadata job. Real model and publishing checks must run
from an approved branch after migration; do not allow feature branches merely
to make their CI green.