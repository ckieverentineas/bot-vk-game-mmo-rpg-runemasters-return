# Weekly Evidence Review Template

Дата review: `YYYY-MM-DD`
Окно evidence: `YYYY-MM-DD -> YYYY-MM-DD`
Участники: `Content / UX`, `Balance / Gameplay`, `QA / Release`
Итог: `ship` / `iterate` / `cut` / `needs evidence`

## Inputs

- `npm run release:evidence`
- `npm run release:school-evidence`
- актуальный `docs/testing/release-evidence-report.md`
- актуальный `docs/testing/school-path-evidence-report.md`
- ручные playtest notes, если review закрывает human-readable gap

## Product / UX Review

Owner: `Content / UX`

### Signals

| Signal | Current read | Decision |
| --- | --- | --- |
| Onboarding funnel | `onboarding_started -> tutorial_path_chosen -> first_school_presented -> first_school_committed` | `ship` / `iterate` / `needs evidence` |
| Post-session next goal | `post_session_next_goal_shown`, follow-up users by suggested goal | `ship` / `iterate` / `needs evidence` |
| Return recap | `return_recap_shown`, next step type, follow-up proxy | `ship` / `iterate` / `needs evidence` |

### Notes

- What looked clear to the player:
- Where the player may still hit menu wandering:
- Copy or flow follow-up, if any:

## Balance / Economy Review

Owner: `Balance / Gameplay`

### Signals

| Signal | Current read | Decision |
| --- | --- | --- |
| First school distribution | `first_school_committed.schoolCode` | `ship` / `iterate` / `needs evidence` |
| School novice payoff | novice elite, aligned reward, open runes, equip sign, follow-up battle | `ship` / `iterate` / `needs evidence` |
| Economy summary | `economy_transaction_committed` by transaction/source, dust/shards/rune delta | `ship` / `iterate` / `needs evidence` |

### Notes

- School or reward outliers:
- Economy source/sink concerns:
- Balance follow-up, if any:

## QA / Exploit Review

Owner: `QA / Release`

### Signals

| Signal | Current read | Decision |
| --- | --- | --- |
| Reward duplication | duplicate `ledgerKey` / duplicate `battleId` checks | `ship` / `iterate` / `needs evidence` |
| Replay safety | quest reward replay, pending trophy replay, command intent hot paths | `ship` / `iterate` / `needs evidence` |
| Stale actions | `battle_stale_action_rejected` count and affected battles | `ship` / `iterate` / `needs evidence` |

### Notes

- Exploit or retry pressure found:
- Manual smoke needed before release:
- Guardrail follow-up, if any:

## Final Decision

Decision: `ship` / `iterate` / `cut` / `needs evidence`

Reason:

-

Follow-up tasks:

-

Deferred intentionally:

-
