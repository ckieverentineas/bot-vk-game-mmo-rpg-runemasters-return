# Release Evidence Report

Сгенерировано: 2026-04-24T12:37:12.604Z
Запрошенное окно: 2026-04-17T12:37:12.555Z → 2026-04-24T12:37:12.555Z
Окно evidence: 2026-04-20T13:13:31.588Z → 2026-04-24T12:37:09.772Z
Уникальных игроков в выборке: 94

## Evidence verdict

- Статус: `warn`
- `tutorial_path_chosen` покрывает не всех игроков из `onboarding_started`, поэтому split tutorial vs skip ещё неполный.
- `first_school_committed` покрывает не все first-school reveal случаи, поэтому onboarding commit funnel ещё неполный.
- `return_recap_shown` пока не показывает follow-up proxy после экрана возврата.

## Blockers

- Нет blocker finding в текущей выборке.

## Manual release-owner decisions

- `tutorial-path-choice-gap` — `tutorial_path_chosen` покрывает не всех игроков из `onboarding_started`, поэтому split tutorial vs skip ещё неполный.
- `first-school-commit-gap` — `first_school_committed` покрывает не все first-school reveal случаи, поэтому onboarding commit funnel ещё неполный.
- `return-recap-follow-up-missing` — `return_recap_shown` пока не показывает follow-up proxy после экрана возврата.

## Info

- Onboarding funnel всё ещё читается как lightweight evidence layer: путь обучения, первое school reveal и первый commit считаются по earliest-per-user событию без session-level stitching.
- Post-session next-goal follow-up stitches matching school follow-up and loadout equip telemetry; это всё ещё lightweight proxy, а не полноценный session-link.
- Return recap follow-up считается только по явно сопоставленному `school_novice_follow_up_action_taken`, а не по полноценному session-link.
- Economy health пока читает только shipped `economy_transaction_committed`; source paths без этого события остаются invisible для release evidence.

## Sample health

| Сигнал | Событий | Уникальных игроков |
| --- | --- | --- |
| `onboarding_started` | 94 | 94 |
| `tutorial_path_chosen` | 67 | 67 |
| `loadout_changed` | 132 | 62 |
| `first_school_presented` | 208 | 70 |
| `first_school_committed` | 130 | 62 |
| `school_novice_elite_encounter_started` | 138 | 39 |
| `school_novice_follow_up_action_taken` | 299 | 62 |
| `return_recap_shown` | 19 | 19 |
| `post_session_next_goal_shown` | 211 | 40 |
| `reward_claim_applied` | 284 | 67 |
| `economy_transaction_committed` | 22 | 22 |
| `quest_book_opened` | 54 | 53 |
| `quest_reward_claimed` | 51 | 51 |
| `quest_reward_replayed` | 25 | 25 |
| `quest_reward_not_ready` | 0 | 0 |
| `battle_stale_action_rejected` | 0 | 0 |

## Onboarding clarity coverage

| Tutorial state | Событий | Уникальных игроков |
| --- | --- | --- |
| ACTIVE | 94 | 94 |

| Path choice | Событий | Уникальных игроков |
| --- | --- | --- |
| continue_tutorial | 67 | 67 |

| Школа | First presented | First committed |
| --- | --- | --- |
| Пламя | 67 | 62 |
| Твердь | 3 | 0 |
| Буря | 0 | 0 |
| Прорицание | 0 | 0 |

- Этот блок собирает onboarding funnel как lightweight evidence layer: старт, выбор пути, первый school reveal и первый commit в сборку.

## School payoff funnel

| Школа | Novice elite | UNUSUAL reward | Open runes | Equip sign | Follow-up battle | RARE seal | Latest event |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Пламя | 39 | 39 | 17 | 62 | 20 | 17 | 2026-04-24T12:36:46.911Z |
| Твердь | 35 | 35 | 35 | 17 | 17 | 17 | 2026-04-24T12:36:52.912Z |
| Буря | 33 | 33 | 17 | 17 | 17 | 17 | 2026-04-24T12:36:57.958Z |
| Прорицание | 31 | 31 | 17 | 17 | 17 | 17 | 2026-04-24T12:37:03.004Z |

## Post-payoff loadout engagement

| Школа | Aligned reward | Open runes after reward | Equip sign after reward | Loadout change after reward | Next battle after reward | RARE seal |
| --- | --- | --- | --- | --- | --- | --- |
| Пламя | 39 | 17 | 17 | 17 | 17 | 17 |
| Твердь | 35 | 35 | 17 | 17 | 17 | 17 |
| Буря | 33 | 17 | 17 | 17 | 17 | 17 |
| Прорицание | 31 | 17 | 17 | 17 | 17 | 17 |

## Post-session next-goal health

| Suggested goal | Shown | Novice elite shown | Follow-up users |
| --- | --- | --- | --- |
| equip_dropped_rune | 31 | 0 | 24 |
| equip_school_sign | 19 | 19 | 17 |
| hunt_school_elite | 9 | 0 | 0 |
| review_runes_after_defeat | 4 | 1 | 0 |
| challenge_school_miniboss | 2 | 0 | 2 |
| complete_tutorial_battle | 1 | 0 | 0 |
| equip_first_rune | 1 | 0 | 0 |
| recover_before_fight | 1 | 0 | 0 |

## Return recap health

| Next step | Shown | Без руны | С руной | Follow-up users |
| --- | --- | --- | --- | --- |
| equip_school_sign | 19 | 0 | 19 | 0 |

## Quest book funnel

| Quest signal | Events | Unique users | Quest codes | Latest event |
| --- | --- | --- | --- | --- |
| `quest_book_opened` | 54 | 53 | none | 2026-04-24T12:36:41.430Z |
| `quest_reward_claimed` | 51 | 51 | awakening_empty_master | 2026-04-24T12:36:41.921Z |
| `quest_reward_replayed` | 25 | 25 | awakening_empty_master | 2026-04-24T12:36:42.068Z |
| `quest_reward_not_ready` | 0 | 0 | none | none |

## Economy health

| Transaction | Source | Events | Unique users | Dust delta | Radiance delta | Shards delta | Rune delta | Source IDs | Latest event |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| reward_claim | QUEST_REWARD | 21 | 21 | 105 | 0 | 21 | 0 | awakening_empty_master | 2026-04-24T12:36:41.806Z |
| reward_claim | DAILY_TRACE | 1 | 1 | 6 | 1 | 1 | 0 | soft_daily_trace:2026-04-23 | 2026-04-23T14:36:44.612Z |

## QA / exploit guardrails

- duplicate reward ledger keys: нет
- duplicate reward battle ids: нет
- stale action rejected: 0 событий / 0 игроков / 0 боёв

## Confidence notes

- Onboarding funnel всё ещё читается как lightweight evidence layer: путь обучения, первое school reveal и первый commit считаются по earliest-per-user событию без session-level stitching.
- Post-session next-goal follow-up stitches matching school follow-up and loadout equip telemetry; это всё ещё lightweight proxy, а не полноценный session-link.
- Return recap follow-up считается только по явно сопоставленному `school_novice_follow_up_action_taken`, а не по полноценному session-link.
- Economy health пока читает только shipped `economy_transaction_committed`; source paths без этого события остаются invisible для release evidence.
