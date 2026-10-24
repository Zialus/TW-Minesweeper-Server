# Schemathesis workflow: findings and post-merge follow-up

> Historical PR-run snapshot. Check the linked Actions run and current TraceCov comment for later results.

## Workflow run reviewed

The latest completed run available when this summary was written was [Build and Test run 304](https://github.com/Zialus/TW-Minesweeper-Server/actions/runs/37961398841), for PR #246 at commit `fc52caca85a16e655857b80bc1d3dbe1e2ece8d3` (2026-10-09).

- Build, unit tests, repository lint, and Stryker completed successfully.
- OpenAPI generation, the generated-file check, and Vacuum lint passed.
- The Schemathesis step failed after about 194 seconds: 334 cases were generated, with 6 unique failures and 3 errored cases; its final summary reported 6 failures and 1 error.
- Coverage exercised all 7 operations, 9/9 parameters, 61/61 keywords, and 21/21 examples. Response coverage was 13/19 (68.4%); response-keyword coverage was 52/87 (59.7%).
- The per-operation report shows incomplete response coverage for the POST operations. `/update` was fully covered. The report does not identify the missing response branches in its summary.
- The API log included JSON parser errors for generated invalid JSON payloads. These need triage against the corresponding Schemathesis cases; log entries alone do not establish whether the API behavior is incorrect.

The [TraceCov report comment](https://github.com/Zialus/TW-Minesweeper-Server/pull/246#issuecomment-6072176309) contains the operation-level coverage table. The [HTML coverage artifact](https://github.com/Zialus/TW-Minesweeper-Server/actions/runs/37961398841/artifacts/11632570222) has additional details and may expire according to the repository's artifact-retention settings.

## Suggested next steps after the PR is merged

1. **Verify the merged workflow.** Check the first `Build and Test` run on `master`, including the Schemathesis step; the PR run above failed even though the build/test job itself passed.
2. **Triage each failure and error from the HTML report.** Record the operation, generated request, response, and failed check, then reproduce each case before deciding whether to change the API behavior or the OpenAPI contract. Do not infer that all failures are expected from the aggregate coverage numbers.
3. **Investigate invalid-JSON probes.** Confirm the parser rejects malformed JSON with the documented response and does not leave the server or test fixtures in a bad state.
4. **Improve response coverage deliberately.** Identify the six unvisited response branches from the detailed report. Add deterministic scenarios or correct the contract where behavior differs; avoid rate-limit tests that depend on a tight request timing window.
5. **Check stability with `--workers auto`.** Compare subsequent runs for recurring failures and runtime changes. If parallel requests interfere through shared game or database state, isolate fixtures or adjust concurrency rather than treating intermittent results as product defects.
6. **Keep the report current.** Use the post-merge run as the new baseline and update follow-up items based on its actual failures and coverage.
