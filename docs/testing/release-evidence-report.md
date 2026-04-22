# Release Evidence Report

Сгенерировано: 2026-04-22T13:53:40.885Z
Запрошенное окно: 2026-04-15T13:53:40.854Z → 2026-04-22T13:53:40.854Z
Окно evidence: 2026-04-20T13:13:31.588Z → 2026-04-22T13:53:26.241Z
Уникальных игроков в выборке: 46

## Evidence verdict

- Статус: `warn`
- `first_school_committed` покрывает не все first-school reveal случаи, поэтому onboarding commit funnel ещё неполный.
- После novice payoff игроки не доводят знак до сборки: Пламя, Твердь, Буря, Прорицание.
- `return_recap_shown` пока не показывает follow-up proxy после экрана возврата.

## Sample health

| Сигнал | Событий | Уникальных игроков |
| --- | --- | --- |
| `onboarding_started` | 46 | 46 |
| `tutorial_path_chosen` | 46 | 46 |
| `loadout_changed` | 44 | 43 |
| `first_school_presented` | 116 | 46 |
| `first_school_committed` | 43 | 43 |
| `school_novice_elite_encounter_started` | 70 | 22 |
| `school_novice_follow_up_action_taken` | 64 | 43 |
| `return_recap_shown` | 2 | 2 |
| `post_session_next_goal_shown` | 7 | 5 |
| `reward_claim_applied` | 118 | 46 |
| `economy_transaction_committed` | 4 | 4 |
| `quest_book_opened` | 34 | 34 |
| `quest_reward_claimed` | 34 | 34 |
| `quest_reward_replayed` | 17 | 17 |
| `quest_reward_not_ready` | 0 | 0 |
| `battle_stale_action_rejected` | 0 | 0 |

## Onboarding clarity coverage

| Tutorial state | Событий | Уникальных игроков |
| --- | --- | --- |
| ACTIVE | 46 | 46 |

| Path choice | Событий | Уникальных игроков |
| --- | --- | --- |
| continue_tutorial | 46 | 46 |

| Школа | First presented | First committed |
| --- | --- | --- |
| Пламя | 46 | 43 |
| Твердь | 0 | 0 |
| Буря | 0 | 0 |
| Прорицание | 0 | 0 |

- Этот блок собирает onboarding funnel как lightweight evidence layer: старт, выбор пути, первый school reveal и первый commit в сборку.

## School payoff funnel

| Школа | Novice elite | UNUSUAL reward | Open runes | Equip sign | Follow-up battle | RARE seal | Latest event |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Пламя | 22 | 22 | 0 | 43 | 1 | 0 | 2026-04-22T13:53:20.213Z |
| Твердь | 18 | 18 | 18 | 0 | 0 | 0 | 2026-04-22T13:53:22.712Z |
| Буря | 16 | 16 | 0 | 0 | 0 | 0 | 2026-04-22T13:53:23.954Z |
| Прорицание | 14 | 14 | 0 | 0 | 0 | 0 | 2026-04-22T13:53:25.575Z |

## Post-payoff loadout engagement

| Школа | Aligned reward | Open runes after reward | Equip sign after reward | Loadout change after reward | Next battle after reward | RARE seal |
| --- | --- | --- | --- | --- | --- | --- |
| Пламя | 22 | 0 | 0 | 0 | 0 | 0 |
| Твердь | 18 | 18 | 0 | 0 | 0 | 0 |
| Буря | 16 | 0 | 0 | 0 | 0 | 0 |
| Прорицание | 14 | 0 | 0 | 0 | 0 | 0 |

## Post-session next-goal health

| Suggested goal | Shown | Novice elite shown | Follow-up users |
| --- | --- | --- | --- |
| equip_dropped_rune | 5 | 0 | 0 |
| challenge_school_miniboss | 1 | 0 | 1 |

## Return recap health

| Next step | Shown | Без руны | С руной | Follow-up users |
| --- | --- | --- | --- | --- |
| equip_school_sign | 2 | 0 | 2 | 0 |

## Quest book funnel

| Quest signal | Events | Unique users | Quest codes | Latest event |
| --- | --- | --- | --- | --- |
| `quest_book_opened` | 34 | 34 | none | 2026-04-22T13:53:17.911Z |
| `quest_reward_claimed` | 34 | 34 | awakening_empty_master | 2026-04-22T13:53:18.326Z |
| `quest_reward_replayed` | 17 | 17 | awakening_empty_master | 2026-04-22T13:53:18.462Z |
| `quest_reward_not_ready` | 0 | 0 | none | none |

## Economy health

| Transaction | Source | Events | Unique users | Dust delta | Shards delta | Rune delta | Source IDs | Latest event |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| reward_claim | QUEST_REWARD | 4 | 4 | 20 | 4 | 0 | awakening_empty_master | 2026-04-22T13:53:18.203Z |

## QA / exploit guardrails

- duplicate reward ledger keys: нет
- duplicate reward battle ids: нет
- stale action rejected: 0 событий / 0 игроков / 0 боёв

## Confidence notes

- Onboarding funnel всё ещё читается как lightweight evidence layer: путь обучения, первое school reveal и первый commit считаются по earliest-per-user событию без session-level stitching.
- Return recap follow-up считается только по явно сопоставленному `school_novice_follow_up_action_taken`, а не по полноценному session-link.
- Economy health пока читает только shipped `economy_transaction_committed`; source paths без этого события остаются invisible для release evidence.
