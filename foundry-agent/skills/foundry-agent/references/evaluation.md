# Agent evaluation

Enter this workflow only when requested (never automatically after deployment). Requires project `user`, `manager`, or `owner`. Evaluation assets and evidence stay in native Foundry (never ask for native endpoints/credentials or create local caches/journals); save or reuse `eval.yaml` in the Agent directory as authored intent (or pipe YAML/JSON to `--config -` when the user wants no local files).

## Step 1: Discover or generate datasets and evaluators

```text
foundryx agent eval evaluator list [--limit <1-100>] --project <project-id>
foundryx agent eval evaluator show <name> [--version <version>] --project <project-id>
foundryx agent eval dataset list [--name <name>] --project <project-id>
foundryx agent eval dataset show <name> <version> --project <project-id>
```

Reuse reviewed native datasets and evaluators when available, and pick a ready judge deployment with `allowed: true` from `foundryx model list`.

- **Synthetic generation** (billable—obtain user authorization if not already requested; `--max-samples` accepts `15..1000`, default `15`; `--dataset <name>` suppresses dataset generation; inspect rows/rubrics with `show` before running):
  ```text
  foundryx agent eval generate --agent-id <agent-id> --eval-model <deployment> [--max-samples 15] [--evaluator <name...>] [--gen-instruction <text>] [--dataset <name>] --project <project-id>
  foundryx agent eval job show <job-id> --kind dataset|evaluator [--wait] --project <project-id>
  ```
- **Manual dataset fallback** (if generation fails, explain and use an explicit manual fallback rather than silent regeneration; `1..1000` JSONL rows, `<= 8 MiB`, with `query`, `expected_behavior`, and optional `context` / `ground_truth`):
  ```text
  foundryx agent eval dataset create <name> --from-file <jsonl-or--> --project <project-id>
  ```

Author or update `eval.yaml` (preserving existing user edits) using verified live versions, compatible input schemas (do not copy illustrative versions or force text mappings onto array-only evaluators), and `initialization_parameters` when needed (do not add `trace_days`, generated evaluator IDs, `init_parameters`, credentials, or native endpoints to `eval.yaml`):

```yaml
name: smoke
agent:
  name: <agent-name>
  kind: hosted # hosted | prompt
  version: "<baseline-version>"
dataset:
  name: <dataset-name>
  version: "<dataset-version>"
evaluators:
  - name: builtin.coherence
    version: "<catalog-version>"
    data_mapping:
      query: "{{item.query}}"
      response: "{{sample.output_text}}"
options:
  eval_model: <judge-deployment>
```

## Step 2: Run the evaluation

Show the target project, Agent/version, dataset/version, judge model, evaluators, and row count before running. Warn about external tool side effects: evaluation runs under the backend service identity without per-user OAuth tool delegation (report unsupported tools rather than switching identity; a run does not authorize deployments, RBAC changes, or unrelated generation).

```text
foundryx agent eval run --config eval.yaml --agent-id <agent-id> [--out-file <new-file>] --project <project-id>
foundryx agent eval list [--limit <1-100>] --project <project-id>
foundryx agent eval show <eval-id> [--eval-run-id <run-id>] --project <project-id>
```

`--no-wait` and Ctrl+C do not cancel remote Foundry runs; inspect the returned native IDs with `agent eval job show`, `agent eval list`, or `agent eval show` before retrying an ambiguous submission.

## Step 3: Analyze item-level evidence

```text
foundryx agent eval show <eval-id> --eval-run-id <run-id> --items [--out-file <new-file>] --project <project-id>
```

Inspect `result_counts`, `per_testing_criteria_results`, and each item's `datasource_item` / `sample` (`--out-file` is opt-in and never overwrites an existing file). Correlate split custom scores/details by evaluator identity (leave ambiguous associations unknown), and separate **Agent invocation errors**, **judge/evaluator errors** (accounting for judge knowledge limits on live-data tasks), and **behavioral rubric failures** (`null`, missing, or `0`/`false` scores never establish a pass; do not rescore results in custom scripts).

## Step 4: Create custom evaluators or update assets (when needed)

Choose a failure category with the user and reuse existing evaluators first. Otherwise create a custom prompt or rubric evaluator (`<= 64 KiB` YAML/JSON: prompt definitions use `type`, `prompt_text`, `data_schema`, `init_parameters`, `metrics` with numeric `result` and string `reason` JSON output; rubrics use `dimensions` and native thresholds):

```text
foundryx agent eval evaluator create <name> --from-file <file-or--> --project <project-id>
foundryx agent eval update --config eval.yaml [--dataset-only | --evaluator-only] --project <project-id>
foundryx agent eval evaluator delete <name> <version> --name <name> --project <project-id>
```

Pin returned immutable dataset/evaluator versions in `eval.yaml`, and review Agent source/instruction edits before redeploying (no automatic cloud optimizer, deployment, or rollback).

## Step 5: Rerun and compare candidate versions

Keep `eval.yaml` (dataset, evaluators, mappings, thresholds, judge) unchanged and pass `--eval-id <baseline-eval-id>` with `--agent-version <candidate-version>`. Native `compare` requires matching dataset sources and is a billable job—run it only when requested:

```text
foundryx agent eval run --config eval.yaml --eval-id <baseline-eval-id> --agent-version <candidate-version> --agent-id <agent-id> --project <project-id>
foundryx agent eval compare <eval-id> <baseline-run-id> <treatment-run-id> [--name <display-name>] --project <project-id>
foundryx agent eval job show <comparison-job-id> --kind comparison [--wait] --project <project-id>
```

Explain differences using native metrics and matched cases (empty comparison details are an upstream limitation, not a tie or recommendation) and let the user choose which version to retain. Do not invent unsupported commands (such as evaluation/run/dataset deletion or cancellation) or delete all evaluator versions implicitly.


