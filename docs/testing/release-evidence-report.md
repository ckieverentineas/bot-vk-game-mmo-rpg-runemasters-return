# Release Evidence Report

Сгенерировано: 2026-04-23T00:45:35.647Z
Запрошенное окно: 2026-04-16T00:45:35.513Z → 2026-04-23T00:45:35.513Z
Окно evidence: 2026-04-21T03:19:53.508Z → 2026-04-23T00:45:12.358Z
Уникальных игроков в выборке: 47

## Evidence verdict

- Статус: `warn`
- `return_recap_shown` пока не показывает follow-up proxy после экрана возврата.

## Sample health

| Сигнал | Событий | Уникальных игроков |
| --- | --- | --- |
| `onboarding_started` | 47 | 47 |
| `tutorial_path_chosen` | 47 | 47 |
| `loadout_changed` | 63 | 47 |
| `first_school_presented` | 60 | 47 |
| `first_school_committed` | 59 | 47 |
| `school_novice_elite_encounter_started` | 15 | 5 |
| `school_novice_follow_up_action_taken` | 87 | 47 |
| `return_recap_shown` | 4 | 4 |
| `post_session_next_goal_shown` | 41 | 5 |
| `reward_claim_applied` | 83 | 47 |
| `economy_transaction_committed` | 4 | 4 |
| `quest_book_opened` | 4 | 4 |
| `quest_reward_claimed` | 4 | 4 |
| `quest_reward_replayed` | 2 | 2 |
| `quest_reward_not_ready` | 0 | 0 |
| `battle_stale_action_rejected` | 0 | 0 |

## Onboarding clarity coverage

| Tutorial state | Событий | Уникальных игроков |
| --- | --- | --- |
| ACTIVE | 47 | 47 |

| Path choice | Событий | Уникальных игроков |
| --- | --- | --- |
| continue_tutorial | 47 | 47 |

| Школа | First presented | First committed |
| --- | --- | --- |
| Пламя | 47 | 47 |
| Твердь | 0 | 0 |
| Буря | 0 | 0 |
| Прорицание | 0 | 0 |

- Этот блок собирает onboarding funnel как lightweight evidence layer: старт, выбор пути, первый school reveal и первый commit в сборку.

## School payoff funnel

| Школа | Novice elite | UNUSUAL reward | Open runes | Equip sign | Follow-up battle | RARE seal | Latest event |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Пламя | 4 | 4 | 4 | 47 | 4 | 3 | 2026-04-23T00:44:57.838Z |
| Твердь | 3 | 3 | 3 | 3 | 3 | 3 | 2026-04-23T00:45:03.073Z |
| Буря | 4 | 3 | 3 | 3 | 3 | 3 | 2026-04-23T00:45:07.415Z |
| Прорицание | 3 | 3 | 3 | 3 | 3 | 3 | 2026-04-23T00:45:11.786Z |

## Post-payoff loadout engagement

| Школа | Aligned reward | Open runes after reward | Equip sign after reward | Loadout change after reward | Next battle after reward | RARE seal |
| --- | --- | --- | --- | --- | --- | --- |
| Пламя | 4 | 4 | 3 | 3 | 3 | 3 |
| Твердь | 3 | 3 | 3 | 3 | 3 | 3 |
| Буря | 3 | 3 | 3 | 3 | 3 | 3 |
| Прорицание | 3 | 3 | 3 | 3 | 3 | 3 |

## Post-session next-goal health

| Suggested goal | Shown | Novice elite shown | Follow-up users |
| --- | --- | --- | --- |
| equip_dropped_rune | 5 | 0 | 5 |
| equip_school_sign | 4 | 4 | 4 |
| challenge_school_miniboss | 1 | 0 | 1 |
| equip_first_rune | 1 | 0 | 1 |
| hunt_school_elite | 1 | 0 | 0 |
| review_runes_after_defeat | 1 | 1 | 0 |

## Return recap health

| Next step | Shown | Без руны | С руной | Follow-up users |
| --- | --- | --- | --- | --- |
| equip_school_sign | 3 | 0 | 3 | 0 |
| hunt_school_elite | 1 | 0 | 1 | 0 |

## Quest book funnel

| Quest signal | Events | Unique users | Quest codes | Latest event |
| --- | --- | --- | --- | --- |
| `quest_book_opened` | 4 | 4 | none | 2026-04-23T00:44:53.669Z |
| `quest_reward_claimed` | 4 | 4 | awakening_empty_master | 2026-04-23T00:44:54.094Z |
| `quest_reward_replayed` | 2 | 2 | awakening_empty_master | 2026-04-23T00:44:54.198Z |
| `quest_reward_not_ready` | 0 | 0 | none | none |

## Economy health

| Transaction | Source | Events | Unique users | Dust delta | Shards delta | Rune delta | Source IDs | Latest event |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| reward_claim | QUEST_REWARD | 4 | 4 | 20 | 4 | 0 | awakening_empty_master | 2026-04-23T00:44:53.993Z |

## QA / exploit guardrails

- duplicate reward ledger keys: нет
- duplicate reward battle ids: нет
- stale action rejected: 0 событий / 0 игроков / 0 боёв

## Confidence notes

- Onboarding funnel всё ещё читается как lightweight evidence layer: путь обучения, первое school reveal и первый commit считаются по earliest-per-user событию без session-level stitching.
- Post-session next-goal follow-up stitches matching school follow-up and loadout equip telemetry; это всё ещё lightweight proxy, а не полноценный session-link.
- Return recap follow-up считается только по явно сопоставленному `school_novice_follow_up_action_taken`, а не по полноценному session-link.
- Economy health пока читает только shipped `economy_transaction_committed`; source paths без этого события остаются invisible для release evidence.
