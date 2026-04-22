# Release Evidence Report

Сгенерировано: 2026-04-22T12:15:18.515Z
Запрошенное окно: 2026-04-15T12:15:18.491Z → 2026-04-22T12:15:18.491Z
Окно evidence: 2026-04-20T13:13:31.588Z → 2026-04-22T12:06:35.783Z
Уникальных игроков в выборке: 33

## Evidence verdict

- Статус: `warn`
- После novice payoff игроки не доводят знак до сборки: Пламя, Твердь, Буря, Прорицание.
- В текущем окне нет `return_recap_shown`, поэтому return clarity пока не подтверждена evidence pass.

## Sample health

| Сигнал | Событий | Уникальных игроков |
| --- | --- | --- |
| `onboarding_started` | 33 | 33 |
| `tutorial_path_chosen` | 33 | 33 |
| `loadout_changed` | 34 | 33 |
| `first_school_presented` | 63 | 33 |
| `first_school_committed` | 33 | 33 |
| `school_novice_elite_encounter_started` | 30 | 12 |
| `school_novice_follow_up_action_taken` | 44 | 33 |
| `return_recap_shown` | 0 | 0 |
| `post_session_next_goal_shown` | 7 | 5 |
| `reward_claim_applied` | 65 | 33 |
| `quest_book_opened` | 24 | 24 |
| `quest_reward_claimed` | 24 | 24 |
| `quest_reward_replayed` | 12 | 12 |
| `quest_reward_not_ready` | 0 | 0 |
| `battle_stale_action_rejected` | 0 | 0 |

## Onboarding clarity coverage

| Tutorial state | Событий | Уникальных игроков |
| --- | --- | --- |
| ACTIVE | 33 | 33 |

| Path choice | Событий | Уникальных игроков |
| --- | --- | --- |
| continue_tutorial | 33 | 33 |

| Школа | First presented | First committed |
| --- | --- | --- |
| Пламя | 33 | 33 |
| Твердь | 0 | 0 |
| Буря | 0 | 0 |
| Прорицание | 0 | 0 |

- Этот блок собирает onboarding funnel как lightweight evidence layer: старт, выбор пути, первый school reveal и первый commit в сборку.

## School payoff funnel

| Школа | Novice elite | UNUSUAL reward | Open runes | Equip sign | Follow-up battle | RARE seal | Latest event |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Пламя | 12 | 12 | 0 | 33 | 1 | 0 | 2026-04-22T12:06:30.254Z |
| Твердь | 8 | 8 | 8 | 0 | 0 | 0 | 2026-04-22T12:06:32.647Z |
| Буря | 6 | 6 | 0 | 0 | 0 | 0 | 2026-04-22T12:06:33.827Z |
| Прорицание | 4 | 4 | 0 | 0 | 0 | 0 | 2026-04-22T12:06:35.438Z |

## Post-payoff loadout engagement

| Школа | Aligned reward | Open runes after reward | Equip sign after reward | Loadout change after reward | Next battle after reward | RARE seal |
| --- | --- | --- | --- | --- | --- | --- |
| Пламя | 12 | 0 | 0 | 0 | 0 | 0 |
| Твердь | 8 | 8 | 0 | 0 | 0 | 0 |
| Буря | 6 | 0 | 0 | 0 | 0 | 0 |
| Прорицание | 4 | 0 | 0 | 0 | 0 | 0 |

## Post-session next-goal health

| Suggested goal | Shown | Novice elite shown | Follow-up users |
| --- | --- | --- | --- |
| equip_dropped_rune | 5 | 0 | 0 |
| challenge_school_miniboss | 1 | 0 | 1 |

## Return recap health

_Нет данных в текущем окне._

## Quest book funnel

| Quest signal | Events | Unique users | Quest codes | Latest event |
| --- | --- | --- | --- | --- |
| `quest_book_opened` | 24 | 24 | none | 2026-04-22T12:06:27.763Z |
| `quest_reward_claimed` | 24 | 24 | awakening_empty_master | 2026-04-22T12:06:28.064Z |
| `quest_reward_replayed` | 12 | 12 | awakening_empty_master | 2026-04-22T12:06:28.194Z |
| `quest_reward_not_ready` | 0 | 0 | none | none |

## QA / exploit guardrails

- duplicate reward ledger keys: нет
- duplicate reward battle ids: нет
- stale action rejected: 0 событий / 0 игроков / 0 боёв

## Confidence notes

- Onboarding funnel всё ещё читается как lightweight evidence layer: путь обучения, первое school reveal и первый commit считаются по earliest-per-user событию без session-level stitching.
- Return recap follow-up считается только по явно сопоставленному `school_novice_follow_up_action_taken`, а не по полноценному session-link.
- Экономика не попадает в этот отчёт, потому что `economy_transaction_committed` ещё не входит в текущий shipped telemetry baseline.
