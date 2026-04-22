# Release Evidence Report

Сгенерировано: 2026-04-22T13:46:12.085Z
Запрошенное окно: 2026-04-15T13:46:12.054Z → 2026-04-22T13:46:12.054Z
Окно evidence: 2026-04-20T13:13:31.588Z → 2026-04-22T13:45:57.000Z
Уникальных игроков в выборке: 44

## Evidence verdict

- Статус: `warn`
- `first_school_committed` покрывает не все first-school reveal случаи, поэтому onboarding commit funnel ещё неполный.
- После novice payoff игроки не доводят знак до сборки: Пламя, Твердь, Буря, Прорицание.
- В текущем окне нет `return_recap_shown`, поэтому return clarity пока не подтверждена evidence pass.

## Sample health

| Сигнал | Событий | Уникальных игроков |
| --- | --- | --- |
| `onboarding_started` | 44 | 44 |
| `tutorial_path_chosen` | 44 | 44 |
| `loadout_changed` | 42 | 41 |
| `first_school_presented` | 106 | 44 |
| `first_school_committed` | 41 | 41 |
| `school_novice_elite_encounter_started` | 62 | 20 |
| `school_novice_follow_up_action_taken` | 60 | 41 |
| `return_recap_shown` | 0 | 0 |
| `post_session_next_goal_shown` | 7 | 5 |
| `reward_claim_applied` | 108 | 44 |
| `economy_transaction_committed` | 2 | 2 |
| `quest_book_opened` | 32 | 32 |
| `quest_reward_claimed` | 32 | 32 |
| `quest_reward_replayed` | 16 | 16 |
| `quest_reward_not_ready` | 0 | 0 |
| `battle_stale_action_rejected` | 0 | 0 |

## Onboarding clarity coverage

| Tutorial state | Событий | Уникальных игроков |
| --- | --- | --- |
| ACTIVE | 44 | 44 |

| Path choice | Событий | Уникальных игроков |
| --- | --- | --- |
| continue_tutorial | 44 | 44 |

| Школа | First presented | First committed |
| --- | --- | --- |
| Пламя | 44 | 41 |
| Твердь | 0 | 0 |
| Буря | 0 | 0 |
| Прорицание | 0 | 0 |

- Этот блок собирает onboarding funnel как lightweight evidence layer: старт, выбор пути, первый school reveal и первый commit в сборку.

## School payoff funnel

| Школа | Novice elite | UNUSUAL reward | Open runes | Equip sign | Follow-up battle | RARE seal | Latest event |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Пламя | 20 | 20 | 0 | 41 | 1 | 0 | 2026-04-22T13:45:51.190Z |
| Твердь | 16 | 16 | 16 | 0 | 0 | 0 | 2026-04-22T13:45:53.665Z |
| Буря | 14 | 14 | 0 | 0 | 0 | 0 | 2026-04-22T13:45:54.876Z |
| Прорицание | 12 | 12 | 0 | 0 | 0 | 0 | 2026-04-22T13:45:56.713Z |

## Post-payoff loadout engagement

| Школа | Aligned reward | Open runes after reward | Equip sign after reward | Loadout change after reward | Next battle after reward | RARE seal |
| --- | --- | --- | --- | --- | --- | --- |
| Пламя | 20 | 0 | 0 | 0 | 0 | 0 |
| Твердь | 16 | 16 | 0 | 0 | 0 | 0 |
| Буря | 14 | 0 | 0 | 0 | 0 | 0 |
| Прорицание | 12 | 0 | 0 | 0 | 0 | 0 |

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
| `quest_book_opened` | 32 | 32 | none | 2026-04-22T13:45:48.930Z |
| `quest_reward_claimed` | 32 | 32 | awakening_empty_master | 2026-04-22T13:45:49.282Z |
| `quest_reward_replayed` | 16 | 16 | awakening_empty_master | 2026-04-22T13:45:49.405Z |
| `quest_reward_not_ready` | 0 | 0 | none | none |

## Economy health

| Transaction | Source | Events | Unique users | Dust delta | Shards delta | Rune delta | Source IDs | Latest event |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| reward_claim | QUEST_REWARD | 2 | 2 | 10 | 2 | 0 | awakening_empty_master | 2026-04-22T13:45:49.176Z |

## QA / exploit guardrails

- duplicate reward ledger keys: нет
- duplicate reward battle ids: нет
- stale action rejected: 0 событий / 0 игроков / 0 боёв

## Confidence notes

- Onboarding funnel всё ещё читается как lightweight evidence layer: путь обучения, первое school reveal и первый commit считаются по earliest-per-user событию без session-level stitching.
- Return recap follow-up считается только по явно сопоставленному `school_novice_follow_up_action_taken`, а не по полноценному session-link.
- Economy health пока читает только shipped `economy_transaction_committed`; source paths без этого события остаются invisible для release evidence.
