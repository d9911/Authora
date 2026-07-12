> Денис: файл создан или изменён по запросу пользователя.

# Authora test runner

The canonical full-project test command is:

```bash
make test
```

It runs the project's unique checks strictly one at a time, records every result,
continues after a failure, and returns a CI-safe exit code after printing the complete
summary. Existing Makefile targets remain available for compatibility, but they are not
used as aggregate dependencies by `make test` because several of them repeat the same
underlying checks.

The project requires Node.js 24 and Yarn 1.22. Install the existing workspace dependencies
before the first run:

```bash
make install
```

## Output modes

```bash
make test              # compact progress; complete output is written to logs
make test VERBOSE=1    # stream each child process's stdout/stderr and keep the logs
make test NO_COLOR=1   # plain text with no ANSI escape sequences
```

Colors are enabled only when stdout is a TTY and `NO_COLOR` is not set. Output redirected
to a file or produced in CI remains readable plain text. Status words are always printed,
so color is never the only status indicator.

In compact mode, a failed step prints the last significant lines from its log and the
path to the full log. `VERBOSE=1` additionally mirrors child output while the step runs.

## Check order

The production catalog contains 55 unique steps: 51 required checks followed by 4
optional environment-dependent checks. The order is fixed and is never parallelized.

| Position | Category | Checks, in execution order | Required | Server/tool requirements |
| --- | --- | --- | --- | --- |
| 1 | Runner | Runner unit/integration tests | yes | Node.js |
| 2-34 | Source regressions | 33 source checks listed below | yes | Node.js; no server |
| 35 | Makefile regression | `doc-mongo` fallback fixture | yes | fake local `docker`/`yarn`; no Docker daemon or MongoDB |
| 36-37 | Types | Backend TypeScript, frontend TypeScript | yes | Yarn |
| 38-41 | Backend build and recovery | Backend build, mail templates, account-recovery use cases, Telegram recovery ticket | yes | Yarn and Node.js |
| 42-44 | SQLite | Smoke compile, Telegram ticket repository, SQLite GraphQL smoke | yes | self-hosted local SQLite smoke |
| 45-47 | Profile photo | Test compile, image processor, profile-photo use cases | yes | Yarn and Node.js |
| 48 | Refresh flow | Refresh-token rotation integration | yes | self-hosted local backend |
| 49-51 | Production/runtime | Frontend production build, i18n HTTP routing, security audit | yes | self-hosted local frontend/backend |
| 52 | Mongo | Legacy in-memory Mongo smoke | no | `mongodb-memory-server` |
| 53-54 | k6 | Auth load, OAuth functional load | no | runnable `k6`; self-hosted local backend |
| 55 | Autocannon | HTTP throughput benchmark | no | backend `autocannon`; self-hosted local backend |

The 33 source checks at positions 2-34 run in this exact order:

1. i18n config and routing
2. i18n locale routing contract
3. i18n locale key parity
4. i18n used translation keys
5. i18n source coverage
6. i18n production fallback
7. i18n metadata
8. i18n auth integration
9. i18n mobile header
10. auth flow and registration
11. backend clean-architecture boundaries
12. frontend FSD boundaries
13. auth auto-code and redirect
14. auth email and sign-in UX
15. connected-accounts email
16. Docker Compose environment files
17. Telegram bot config guard
18. theme hydration
19. SelectMain model
20. SelectMain component contract
21. UI-kit remediation contracts
22. Sass deprecation guard
23. OAuth cookie handoff fields
24. account-recovery contract
25. account-recovery session version
26. account-recovery settings
27. account-recovery security
28. account-recovery observability
29. account-recovery persistence
30. two-factor recovery codes
31. auth hydration request loop
32. auth session skeleton
33. GraphQL client refresh concurrency

`tests/source-checks.mjs` is the shared registry for this source group, so
`make check-source` and `make test` do not maintain separate copies of that list. The full
audit table, including every command, working directory, type, dependency, duplicate
relationship, and expected exit code, is in
`docs/superpowers/plans/2026-07-11-authora-test-runner.md`.

### Excluded duplicates and aggregators

`make test` calls leaf checks instead of these overlapping entry points:

- `backend-test` and `backend-test-sqlite` are aliases for the same SQLite smoke script;
- `check`, `check-types`, and `check-account-recovery` aggregate checks already present as
  individual steps;
- backend/frontend `lint` repeat boundary/source and TypeScript checks;
- `check-source` is preserved, but its 32 leaves run independently in the full runner so
  one source failure does not suppress the remaining source checks;
- `check-i18n-http` aggregates the production-fallback test and an HTTP check against
  `I18N_BASE_URL`; the full runner executes the fallback once and owns a separate local
  production frontend lifecycle for its HTTP leaf;
- `test-all` contains only security and load testing; it is not the full project suite;
- the backend build runs once and its output is reused by recovery, refresh, security, and
  load phases.

## PASS, WARN, and FAIL

- `PASS` means the command started, exited with code `0`, and satisfied its declared
  postconditions.
- `WARN` is produced only by an explicit runner rule, such as an unavailable optional
  tool. The runner does not infer warnings by searching arbitrary stdout/stderr text.
- `FAIL` means a check returned non-zero, could not start, exited on a signal, timed out,
  or missed a required postcondition. Required setup/readiness failures are also `FAIL`.

An optional check is `WARN` only when its declared prerequisite is unavailable. If the
optional tool is present and the executed check reports a real error, that result is
`FAIL`, not a silent skip.

The process exit codes are:

| Exit code | Meaning |
| --- | --- |
| `0` | No check failed; `WARN` results are allowed |
| `1` | One or more checks failed |
| `130` | The user interrupted the suite with Ctrl+C |
| other non-zero | Internal runner/startup failure |

On interruption, the runner terminates the current process tree and any frontend/backend
it started, writes the partial summary, and exits non-zero.

## Logs and machine-readable summary

Every run replaces only the runner-owned `.test-results/` directory:

```text
.test-results/
  logs/
    01-runner-tests.log
    02-i18n-config-and-routing.log
    ...
  summary.json
```

Each result in `summary.json` contains the stable check ID, label, status, exit code,
duration, and relative log path. The document also contains ISO start/finish timestamps,
total duration, and PASS/WARN/FAIL counters. It intentionally does not record the full
environment. Known secret environment values and bearer credentials are redacted from
captured child output.

## Self-hosted HTTP checks

The full runner does not require a manually started application server:

- the frontend is built once, started in production mode on an available loopback port,
  checked for readiness, used by `tests/i18n-http-routing.mjs`, and stopped in cleanup;
- refresh and security checks use local test backends with SQLite/in-memory data;
- available load tools run only against a local test backend with relaxed test-only rate
  limits;
- servers started by the runner are stopped after success, failure, timeout, SIGINT, or
  SIGTERM.

No production URL is the default target for security or load testing.

## Optional dependencies and WARN remediation

The repository does not contain a CI workflow that makes Mongo or load tools mandatory.
Consequently, missing prerequisites for the four optional steps produce explicit `WARN`
results and do not change an otherwise successful exit code.

### Mongo smoke

The legacy `backend/smoke-test.ts` uses the `mongodb-memory-server` dev dependency declared
in `backend/package.json`. Install backend dependencies before running the check:

```bash
cd backend
yarn install
```

`mongodb-memory-server` may need to obtain a compatible MongoDB binary on its first run.
The normal required suite does not require a separately running MongoDB service.

### k6

The runner accepts a runnable system `k6` found on `PATH`. It does not download
a binary automatically. On macOS:

```bash
brew install k6
```

For other supported platforms, follow the
[official k6 installation instructions](https://grafana.com/docs/k6/latest/set-up/install-k6/).
The current ignored local `tests/bin/k6` artifact is a Linux x86-64 binary and is not a
compatible macOS fallback.

### Autocannon

The benchmark loads the declared `autocannon` dev dependency from the backend and never
installs packages during a test run:

```bash
cd backend
yarn install
```

The local k6 profile defaults to 5 VUs so the latency threshold remains meaningful on a
single development process. Load duration and concurrency remain configurable, for example:

```bash
VUS=20 DURATION=30s make load-test                 # k6 duration
AUTOCANNON_DURATION=30 CONNECTIONS=75 make load-test # autocannon seconds
```

## CI usage

A CI job can use the same entry point and rely on its final exit code:

```bash
make install
make test NO_COLOR=1
```

Do not append `|| true`: that would hide a required test failure. Preserve
`.test-results/logs/` and `.test-results/summary.json` as job artifacts when diagnosing a
failed run. If a future CI policy makes Mongo or load testing mandatory, install those
tools in the job before `make test`; missing tools currently have the documented optional
`WARN` policy.

## Compatibility targets

These existing commands keep their narrower historical purpose:

```bash
make check-source          # fail-fast run of the 33 source checks
make check-types           # backend + frontend TypeScript
make check-account-recovery # backend build + three recovery behavior tests
make check                 # source + types + account recovery aggregate
make backend-test          # SQLite smoke (alias)
make backend-test-sqlite   # SQLite smoke (same command as backend-test)
make check-i18n-http       # i18n HTTP against I18N_BASE_URL (default :5178)
make security-audit        # self-hosted local security audit
make load-test             # local k6 + autocannon; prerequisites must be installed
make test-all              # legacy security + load aggregate only
```

The legacy load scripts now propagate actual tool/test failures and do not claim success
when a tool is missing. Use `make test` for the complete deduplicated suite and consolidated
summary.

`frontend/e2e-test.mjs` was also found during the audit, but it is not an applicable
runner step yet: it depends on the undeclared Mongo memory package, fixed ports, and
pre-localization routes such as `/country` and `/profile/edit`. It remains documented as
legacy instead of being reported as PASS without execution. Migrating that script to the
locale-prefixed URL contract and managed ports is a separate prerequisite.
