# Release Evidence Report

Сгенерировано: 2026-04-23T02:28:44.420Z
Запрошенное окно: 2026-04-16T02:28:44.383Z → 2026-04-23T02:28:44.383Z
Окно evidence: 2026-04-21T03:19:53.508Z → 2026-04-23T02:28:30.822Z
Уникальных игроков в выборке: 63

## Evidence verdict

- Статус: `warn`
- `return_recap_shown` пока не показывает follow-up proxy после экрана возврата.

## Sample health

| Сигнал | Событий | Уникальных игроков |
| --- | --- | --- |
| `onboarding_started` | 63 | 63 |
| `tutorial_path_chosen` | 63 | 63 |
| `loadout_changed` | 143 | 63 |
| `first_school_presented` | 140 | 63 |
| `first_school_committed` | 139 | 63 |
| `school_novice_elite_encounter_started` | 80 | 21 |
| `school_novice_follow_up_action_taken` | 295 | 63 |
| `return_recap_shown` | 20 | 20 |
| `post_session_next_goal_shown` | 190 | 21 |
| `reward_claim_applied` | 224 | 63 |
| `economy_transaction_committed` | 20 | 20 |
| `quest_book_opened` | 22 | 21 |
| `quest_reward_claimed` | 20 | 20 |
| `quest_reward_replayed` | 10 | 10 |
| `quest_reward_not_ready` | 0 | 0 |
| `battle_stale_action_rejected` | 0 | 0 |

## Onboarding clarity coverage

| Tutorial state | Событий | Уникальных игроков |
| --- | --- | --- |
| ACTIVE | 63 | 63 |

| Path choice | Событий | Уникальных игроков |
| --- | --- | --- |
| continue_tutorial | 63 | 63 |

| Школа | First presented | First committed |
| --- | --- | --- |
| Пламя | 63 | 63 |
| Твердь | 0 | 0 |
| Буря | 0 | 0 |
| Прорицание | 0 | 0 |

- Этот блок собирает onboarding funnel как lightweight evidence layer: старт, выбор пути, первый school reveal и первый commit в сборку.

## School payoff funnel

| Школа | Novice elite | UNUSUAL reward | Open runes | Equip sign | Follow-up battle | RARE seal | Latest event |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Пламя | 20 | 20 | 20 | 63 | 20 | 17 | 2026-04-23T02:28:18.743Z |
| Твердь | 19 | 19 | 19 | 19 | 19 | 17 | 2026-04-23T02:28:23.137Z |
| Буря | 20 | 19 | 19 | 19 | 19 | 18 | 2026-04-23T02:28:26.690Z |
| Прорицание | 19 | 19 | 19 | 19 | 19 | 17 | 2026-04-23T02:28:30.287Z |

## Post-payoff loadout engagement

| Школа | Aligned reward | Open runes after reward | Equip sign after reward | Loadout change after reward | Next battle after reward | RARE seal |
| --- | --- | --- | --- | --- | --- | --- |
| Пламя | 20 | 20 | 19 | 19 | 19 | 17 |
| Твердь | 19 | 19 | 19 | 19 | 19 | 17 |
| Буря | 19 | 19 | 19 | 19 | 19 | 18 |
| Прорицание | 19 | 19 | 19 | 19 | 19 | 17 |

## Post-session next-goal health

| Suggested goal | Shown | Novice elite shown | Follow-up users |
| --- | --- | --- | --- |
| equip_dropped_rune | 21 | 0 | 21 |
| equip_school_sign | 20 | 20 | 20 |
| review_runes_after_defeat | 3 | 3 | 0 |
| challenge_school_miniboss | 1 | 0 | 1 |
| equip_first_rune | 1 | 0 | 1 |
| hunt_school_elite | 1 | 0 | 0 |

## Return recap health

| Next step | Shown | Без руны | С руной | Follow-up users |
| --- | --- | --- | --- | --- |
| equip_school_sign | 17 | 0 | 17 | 0 |
| challenge_school_miniboss | 2 | 0 | 2 | 0 |
| hunt_school_elite | 1 | 0 | 1 | 0 |

## Quest book funnel

| Quest signal | Events | Unique users | Quest codes | Latest event |
| --- | --- | --- | --- | --- |
| `quest_book_opened` | 22 | 21 | none | 2026-04-23T02:28:14.949Z |
| `quest_reward_claimed` | 20 | 20 | awakening_empty_master | 2026-04-23T02:28:15.274Z |
| `quest_reward_replayed` | 10 | 10 | awakening_empty_master | 2026-04-23T02:28:15.358Z |
| `quest_reward_not_ready` | 0 | 0 | none | none |

## Economy health

| Transaction | Source | Events | Unique users | Dust delta | Shards delta | Rune delta | Source IDs | Latest event |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| reward_claim | QUEST_REWARD | 20 | 20 | 100 | 20 | 0 | awakening_empty_master | 2026-04-23T02:28:15.194Z |

## QA / exploit guardrails

- duplicate reward ledger keys: нет
- duplicate reward battle ids: нет
- stale action rejected: 0 событий / 0 игроков / 0 боёв

## Confidence notes

- Onboarding funnel всё ещё читается как lightweight evidence layer: путь обучения, первое school reveal и первый commit считаются по earliest-per-user событию без session-level stitching.
- Post-session next-goal follow-up stitches matching school follow-up and loadout equip telemetry; это всё ещё lightweight proxy, а не полноценный session-link.
- Return recap follow-up считается только по явно сопоставленному `school_novice_follow_up_action_taken`, а не по полноценному session-link.
- Economy health пока читает только shipped `economy_transaction_committed`; source paths без этого события остаются invisible для release evidence.
