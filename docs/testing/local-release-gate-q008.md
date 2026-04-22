# Q-008 Local Release Gate

- Date: `2026-04-22 22:07:12 +10:00`
- Scope: Q-008, full local release gate preset after confirming the bot process was stopped.
- Git before gate: `main...origin/main [ahead 7]`, clean working tree.
- Bot process check: `Get-Process node` returned no running Node.js process.

## Preset

The Q-008 preset from `docs/product/project-one-request-task-queue.md` was run:

```bash
npm run db:generate
npm run check
npm run release:local-playtest
npm run release:status
npm run release:summary
npm run release:preflight
```

## Results

| Command | Result | Important output |
| --- | --- | --- |
| `npm run db:generate` | Passed | Prisma Client generated successfully; no `EPERM` from a locked query engine. |
| `npm run check` | Passed | Typecheck, content validation, build and Vitest completed. Vitest reported 64 test files and 606 tests passed. |
| `npm run release:local-playtest` | Passed | Both `legacy-text` and `payload` scenarios completed with 5 victories, no open battle, no pending reward, and `school_novice_elite_encounter_started = 4`. |
| `npm run release:status` | Passed | History count: 152 commits. Public version: `1.52`. Next release milestone: 200 commits. |
| `npm run release:summary` | Passed | Summary used public version `1.52` and range `HEAD~99..HEAD`; latest school evidence and production handoff docs appeared in the generated summary. |
| `npm run release:preflight` | Passed | Required documents exist, content and balance are valid, and preflight status passed. |

## Notes

- `npm run check` printed expected telemetry-offline warnings from tests that intentionally verify failure tolerance after persistence. They did not fail the gate.
- `release:local-playtest` confirmed novice elite evidence for `ember`, `stone`, `gale` and `echo` in both local scenarios.
- The `payload` scenario confirmed quest reward replay safety with `questRewardReplaySafe = true`.
- The technical gate is green. Runtime evidence commands remain a separate release checklist concern and were last closed by Q-006.
