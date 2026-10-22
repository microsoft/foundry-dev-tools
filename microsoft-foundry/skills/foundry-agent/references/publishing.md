# Publish an Agent to Microsoft 365 / Teams

Publishes a ready Prompt Agent or enabled Hosted Agent (with its own native identity in a public Foundry project) to the organization's Microsoft 365 catalog. Requires an effective project `user`, `manager`, or `owner` role (including for subscription managers).

## Step 1: Select the path and assemble package metadata

- **Publish existing Agent**: Inspect the ready Agent and proceed to Step 2 without rebuilding, redeploying, or changing its source, instructions, model, or tools.
- **Combined build and publish**: Only when both are requested, complete Agent deployment and remote verification first, then continue directly to Step 2 without a second intake questionnaire (an ordinary build/deploy request never authorizes publishing).
- **Metadata flags** (passed on the CLI—never create a separate publishing YAML/JSON file or create/edit/delete the CLI's automatic local journal):
  - `--short-description`: `<= 80` chars (draft from known Agent purpose/description).
  - `--description`: `<= 4000` chars.
  - `--developer-name`: `<= 32` chars; reuse only when already supplied as publishing metadata, otherwise ask (never infer from email or tenant).
  - `--app-version`: propose `1.0.0` for first publication; for updates, inspect prior version history and ask for an explicit higher semver (never auto-increment).
  - Optional overrides: `--display-name`, `--developer-website`, `--privacy-url`, `--terms-of-use-url` (each URL defaults to `https://example.com` without asking three separate URL questions), `--color-icon` (192x192 PNG), `--outline-icon` (32x32 white/transparent PNG; bundled icons used by default; total ZIP `<= 10 MiB`).
- Ask at most one grouped clarification if target Agent, developer name, or update version is missing.

## Step 2: Verify target readiness and publishing session

```text
foundryx agent show <agent-id> --project <project-id>
foundryx auth publish status
foundryx auth publish login
foundryx auth publish logout
```

Publishing uses a separate M365 session signed in as the **same immutable tenant and user** (`auth publish status` is silent-only, so transport/store errors do not prove a signed-out session; `auth publish logout` clears only publishing credentials, while `foundryx auth logout` clears both; never switch accounts to bypass a catalog ownership denial). If previous publication is known, run `foundryx agent publish-status <agent-id> --project <project-id>` first (missing local journal history on another machine is not proof of a first upload—ask for the known version or external reconciliation rather than generating a replacement app ID).

## Step 3: Preview, confirm, and submit

Run `agent publish` **without** `--yes` to validate metadata/icons, read the authorized binding, and print the publishing plan (exiting nonzero with the confirmation prompt is the expected preview outcome; do not suppress unrelated validation or readiness errors as if they were a preview):

```powershell
foundryx agent publish <agent-id> --project <project-id> `
  --app-version <semver> `
  --short-description "<short-description <= 80 chars>" `
  --description "<full-description <= 4000 chars>" `
  --developer-name "<developer-name <= 32 chars>"
```

Share the previewed tenant, project, Agent, native/package versions, metadata, and ZIP SHA-256 with the user, explaining together:
1. Preparing an **S1 Azure Bot** can incur cost, and tenant channel access operates outside Foundry project membership (tools may expose shared capabilities).
2. Default `https://example.com` URLs are placeholders that tenant admins may ask to replace before approval.
3. In preview mode, publishing uses the Microsoft 365 Agents Toolkit app registration, not a production onboarding guarantee for FoundryX's own registration.
4. Submission creates a catalog request (`approval: not_verified`), not admin approval; later Agent code/prompt redeployments update the same runtime endpoint without republishing metadata.

Obtain one explicit user confirmation for the reviewed plan (a generic build/publish request is not confirmation of the reviewed target, costs, and access; if target or metadata changes, preview again), then rerun the exact command with `--yes`.

## Step 4: Inspect status and recover

```text
foundryx agent publish-status <agent-id> --project <project-id>
```

| State / Phase | Meaning & action |
|---|---|
| `state: "submitted"` | Upload processing completed; report `request_title_id`, `catalog_app_id`, and `approval: "not_verified"`. |
| `state: "submitting"` with `upload_status_id` | Processing is still in flight; poll with `agent publish-status` rather than uploading again. |
| `phase: "prepare"` failure | No package was uploaded; report `error` and `preparation_operation_id`. Missing backend Bot permission on an existing project requires a separate Admin setup action (`deployment\Configure-Publishing.ps1`); do not run access setup, change network settings, or patch resources from this skill. |
| `state: "unknown"` in `phase: "upload"` without `upload_status_id` | Ambiguous upload outcome blocking new uploads (including higher versions). Require external catalog reconciliation; never delete the local journal, mint a new app ID, or retry automatically. |

Finish with the observed `agent_id`, `project_id`, `app_version`, `state`, `request_title_id`, `catalog_app_id`, and any blocking error. Report admin approval, store availability, and channel chat separately rather than claiming them from upload or API success (and note that deleting a native Agent/Bot does not remove a catalog entry).



