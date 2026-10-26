# Agent operational metrics

Read-only workflow to retrieve and interpret operational metrics for a deployed Prompt or Hosted Agent (`source: "appinsights_logs"`). Does not invoke the Agent or modify monitoring. Requires an effective project `user`, `manager`, or `owner` role (`consumer` membership and subscription-management authority without qualifying project membership are denied).

## Query metrics (`foundryx agent metrics`)

```text
foundryx agent metrics --list
foundryx agent metrics --help
foundryx agent metrics <agent-id> \
  [--metric <metric...>] \
  [--agent-version <version>] \
  [--start-time <ISO-8601-with-tz> --end-time <ISO-8601-with-tz>] \
  [--interval PT1H|P1D] \
  --project <project-id>
```

- **Discovery & options**: Use `--list` to inspect supported measurements and `--help` for current options, defaults, and accepted intervals. Select the measurements needed for the request; for an explicit range, pass both `--start-time` and `--end-time` as ISO 8601 timestamps with a timezone. An existing `foundryx.yaml` can supply the project; otherwise pass `--project <project-id>` (no `.foundry`, local Agent source folder, or developer Azure permission is required).
- **Data source & errors**: All operational metrics come from the project's connected Application Insights (matching the Foundry Monitor dashboard). Present availability using the returned statuses and `warnings` rather than adding generic source caveats, and report query errors explicitly (query failures are errors, not empty results).
- **Missing data**: When metrics for a recent invocation are not visible yet, verify that the selected Agent, version, and time window cover the invocation, explain that data can take a few minutes to appear, and offer to retry after a short wait. Missing data is not zero activity or proof of failure. Mention delays only when data is missing or a relevant permission error occurs, not when requested data is available.

## Response structure & interpretation (`schema_version: 3`)

Use the response's `descriptions` for current calculation rules and units rather than substituting a hardcoded operation list or formula:

| Field | Meaning |
|---|---|
| `requested_metrics` | Selected metric names. |
| `project_id`, `agent_id`, `agent_name`, `agent_kind`, `agent_version`, `native_agent_id` | Authorized scope (`native_agent_id` differs from the FoundryX `agent_id`). |
| `source` | `appinsights_logs` (the project's connected Application Insights). |
| `window` | Requested UTC `start_time`, `end_time`, and `interval`; source sample timestamps in `series[].points` are preserved rather than forced onto this grid. |
| `metrics.<name>` | Measurement with `source`, `metric_name`, `unit`, `aggregation`, `status`, observed `total`, and dimensioned `series[]` (`dimensions`, observed `total`, and source `points[{timestamp, value}]` without service-side filtering or rebucketing). |
| `totals` | Selected summary totals and underlying counts (`runs_by_state` for run metrics; dependency denominator for `success_rate_percent`). |
| `complete`, `warnings`, `descriptions`, `request_id` | Availability flag for selected measurements, concrete monitoring warnings, service calculation/unit descriptions, and diagnostic request ID. |

- **Status, timestamps, and `null` vs `0`**:
  - Distinguish available data from missing data via each measurement's `status`. Preserve source timestamps and values when rendering (separate series can have different timestamps, and missing timestamps are not observed zeroes).
  - `null` means unavailable/unreported, never zero. A successful empty dependency aggregate returns `0`; terminal/tool zeroes indicate no matching operations in a bucket containing a run; a zero denominator produces a `null` rate.
  - `complete: true` reflects availability of the selected measurements, not instrumentation coverage. Missing monitoring produces `null` measurements and a specific warning; never substitute project-wide totals for missing Agent data.
- **Metric semantics**:
  - **Runs by state (`totals.runs_by_state`)**: Root invocation spans counted once per operation and grouped by `RunStatus`. One run can contribute both `started` and `completed`/`failed`; states are not mutually exclusive current statuses, summing them does not give unique runs, and they do not show in-flight run counts.
  - **Agent runs (`agent_runs`)**: Root invocation spans counted by start timestamp (`null` if starts are absent; in-progress or crashed runs without an exported root cannot be inferred).
  - **Tokens (`input_tokens`, `output_tokens`, `total_tokens`)**: Sum model-call token measurements (not monetary cost). Never add `total_tokens` to `input_tokens` or `output_tokens` (double-counting).
  - **Tool calls (`tool_calls`)**: Aggregates each `ToolName` series once (inspect `metrics.tool_calls.series` for per-tool breakdowns). Includes retries; counts calls, not distinct tools or successful results.
  - **Success rate (`success_rate_percent`)**: Measures dependency-operation success, not run success. Use `totals.success_rate_percent` and its underlying counts; never average interval percentages without weighting by their denominators.
  - **Run error rate (`error_rate_percent`)**: Measures root-run failures, not dependency failures (`completed` means execution completion, not response quality).
  - **Number of errors (`errors`)**: `totals.errors` and `metrics.errors.series` count failed dependency operations (a completed root run can still contain failed dependencies; consult `descriptions.errors` for included operations and rules).
- **Analysis context**: Use `totals` for summaries and `metrics.*.series` for points and dimensions; presentation is up to the coding agent and the user's request. Account for window length, dimensions, and coverage when comparing windows. Use the [tracing workflow](tracing.md) for span-level evidence and `agent hosted logs` or `agent conversation show` for specific executions. Infer prompts, tool arguments/results, conversation content and causal explanations from that evidence rather than aggregate metrics.



