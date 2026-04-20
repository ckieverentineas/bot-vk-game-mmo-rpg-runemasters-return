# Telemetry Plan v1

## Goal

Telemetry v1 должен отвечать на несколько product-вопросов без отдельной analytics-платформы и без event spam:

- onboarding стал понятнее или нет;
- игрок действительно доходит до первого school payoff;
- после battle result и return recap игрок понимает следующий шаг;
- build/loadout система используется, а не игнорируется;
- экономика выглядит честной;
- reward/retry rails не сигналят про exploit pressure.

## Scope

### In scope

- onboarding clarity;
- school pick rates;
- loadout change rates;
- economy health;
- exploit/retry signals.

### Out of scope

- vendor/tool choice;
- dashboards и warehouse design;
- clickstream на каждую кнопку;
- full retention BI;
- A/B framework;
- social / PvP / live-ops telemetry.

## Core product questions

1. Доходит ли игрок до первого meaningful school moment без ручных объяснений?
2. Понимает ли игрок следующий шаг после battle result?
3. Помогает ли return recap быстро вернуться к осмысленному действию?
4. Используют ли игроки rune/loadout систему после первого rune payoff?
5. Нет ли ранних economy / abuse сигналов, которые ломают доверие к прогрессу?

## Event map v1

Использовать существующий `GameLog(action, details, createdAt, userId)` как transport/storage rail до отдельной telemetry platform.

Все новые/формализованные события должны иметь `event_version: 1` в payload.

| Event | When | Key fields | Why it matters |
|---|---|---|---|
| `onboarding_started` | новый игрок реально вошёл в первый flow после создания персонажа | `entry_surface`, `tutorial_state`, `event_version` | базовая точка funnels |
| `tutorial_path_chosen` | игрок продолжает tutorial или skip | `choice`, `event_version` | сравнение tutorial vs skip |
| `first_school_presented` | school identity впервые показана как meaningful reward/context | `school_code`, `source`, `event_version` | понятность school-first framing |
| `first_school_committed` | первая школа стала реальной build identity игрока | `school_code`, `acquisition_source`, `tutorial_path`, `event_version` | читаемость школ и ранний pick distribution |
| `post_session_next_goal_shown` | battle result показал next-goal block | `battle_outcome`, `had_rune_drop`, `suggested_goal_type`, `enemy_code`, `battle_school_code`, `is_school_novice_elite`, `event_version` | проверка качества post-session guidance и того, что battle result не расходится с каноническим next-goal read-model |
| `return_recap_shown` | existing player получил return recap | `entry_surface`, `has_equipped_rune`, `current_school_code`, `next_step_type`, `event_version` | clarity первого действия после return и качество school-aware guidance |
| `loadout_changed` | equip / unequip реально меняет committed loadout | `change_type`, `before_school_code`, `after_school_code`, `before_rarity`, `after_rarity`, `event_version` | engagement с rune/loadout loop |
| `school_novice_elite_encounter_started` | игрок реально вошёл в aligned novice elite encounter своей школы | `battle_id`, `school_code`, `enemy_code`, `biome_code`, `location_level`, `target_reward_rarity`, `next_goal_type`, `event_version` | проверка, что novice guidance реально доводит до первого school trial |
| `school_novice_follow_up_action_taken` | игрок сделал осмысленный follow-up шаг после novice payoff | `school_code`, `current_goal_type`, `action_type`, `sign_equipped`, `used_school_sign`, `battle_id`, `enemy_code`, `event_version` | проверка, что school payoff не заканчивается dead end экраном |
| `economy_transaction_committed` | source/sink изменения зафиксированы | `transaction_type`, `source_type`, `resource_dust_delta`, `resource_shards_delta`, `rune_delta`, `player_level`, `event_version` | economy health и outliers |
| `reward_claim_applied` | canonical reward claim применён | `ledger_key`, `source_type`, `source_id`, `battle_id`, `enemy_code`, `battle_school_code`, `is_school_novice_aligned`, `novice_path_school_code`, `novice_target_reward_rarity`, `had_target_rarity_before`, `reward_rune_archetype_code`, `reward_rune_rarity`, `event_version` | exact-once reward health и измерение aligned novice payoff |
| `battle_stale_action_rejected` | stale battle mutation заблокирована | `battle_id`, `expected_revision`, `actual_revision`, `status`, `event_version` | exploit/UX confusion signal |

## Core metrics and decision checks

### Onboarding clarity

- `onboarding_started -> first_school_committed`
- time/order to first rune and first school presentation
- tutorial vs skip delta

Healthy signal:
- заметная доля новых игроков доходит до `first_school_committed` без провала между tutorial и first rune.

### Post-session clarity

- % completed battles with `post_session_next_goal_shown`
- next meaningful action after that block:
  - `open_runes`
  - `open_profile`
  - `start_battle`

Healthy signal:
- battle result screen не становится dead end; игрок делает хотя бы один follow-up step в той же или следующей сессии.
- `suggested_goal_type` чаще ведёт к осмысленному действию (`open_runes`, `start_battle`), а не к menu wandering.

### Return clarity

- `return_recap_shown -> first_action_after_return`
- bounce without meaningful action after recap

Healthy signal:
- return recap сокращает menu wandering и быстрее ведёт к первому осмысленному действию.
- school-aware `next_step_type` помогает быстрее дойти до ближайшего school payoff или support-slot payoff.

### School pick health

- distribution of `first_school_committed.school_code`

Watch signal:
- любая школа устойчиво выше ~45% ранней концентрации = review of copy/readability or balance.

### Loadout engagement

- `% игроков с хотя бы одним loadout_changed после first_school_committed`
- `% returning players who touch runes/loadout after recap`

Healthy signal:
- rune system используется как часть core loop, а не остаётся декоративным screen.

### School novice loop evidence

- `school_novice_elite_encounter_started` показывает, дошёл ли игрок до первого aligned school trial;
- `post_session_next_goal_shown` в сочетании с `enemy_code`, `battle_school_code`, `is_school_novice_elite` показывает, чем закончился этот trial и куда игра повела дальше;
- `reward_claim_applied` теперь должен различать `is_school_novice_aligned`, `had_target_rarity_before`, `reward_rune_archetype_code`, `reward_rune_rarity`, чтобы aligned reward был измерим как честная novice-веха, а не как анонимный дроп;
- `school_novice_follow_up_action_taken` показывает, превратился ли novice payoff в следующий реальный шаг: `open_runes`, `equip_school_sign` или `start_next_battle`;
- `loadout_changed` остаётся прокси-сигналом, что novice reward не просто выдан, а реально вошёл в сборку.

Healthy signal:
- заметная доля игроков с `hunt_school_elite` доходит до aligned novice elite, получает reward/payoff и затем делает `school_novice_follow_up_action_taken` и/или `loadout_changed` вместо menu wandering.

## Current runtime instrumentation snapshot

Уже заинструментированы в runtime:

- `onboarding_started`;
- `loadout_changed`;
- `school_novice_elite_encounter_started`;
- `school_novice_follow_up_action_taken`;
- `return_recap_shown`;
- `post_session_next_goal_shown`.

Для `return_recap_shown` и `post_session_next_goal_shown` поля `next_step_type` / `suggested_goal_type` должны брать значения из canonical next-goal read-model, а не из ad-hoc transport strings. Текущий целевой набор значений:

- `complete_tutorial_battle`;
- `get_first_rune`;
- `equip_first_rune`;
- `use_active_rune_skill`;
- `hunt_school_elite`;
- `equip_school_sign`;
- `reach_next_school_mastery`;
- `fill_support_slot`;
- `push_higher_threat`;
- `equip_dropped_rune`;
- `review_runes_after_defeat`.

## Release evidence artifact

- `npm run release:evidence` собирает `docs/testing/release-evidence-report.md` из текущего `GameLog` baseline без отдельной analytics-platform; по умолчанию это окно последних 7 дней, которое можно сузить/расширить через `--since`, `--until` или `--days`; date-only `--since/--until` считаются как UTC-границы календарного дня;
- этот отчёт специально остаётся узким: onboarding coverage, school payoff funnel, post-session guidance, return recap proxy и QA/exploit guardrails;
- отчёт не заменяет manual playtest, а даёт единый markdown-срез для release review поверх уже shipped telemetry events.

### Economy and exploit health

- source/sink summary by `economy_transaction_committed`
- ratio and patterns for `reward_claim_applied`
- rate of `battle_stale_action_rejected`

Healthy signal:
- нет unexplained spikes по gain rate и нет роста retry/duplicate-related anomalies.

## Review rhythm and owners

### Weekly product / UX review

Owner:
- Content / UX

Review:
- onboarding funnel
- post-session next goal follow-up
- return recap action rate

Decision:
- `ship`, `iterate`, or `cut` copy/flow branches.

### Weekly balance / economy review

Owner:
- Balance / Gameplay

Review:
- school pick distribution
- loadout engagement by school
- early economy source/sink shape

Decision:
- tune school framing, rewards, or loadout prompts.

### Weekly QA / exploit review

Owner:
- QA / Release

Review:
- `reward_claim_applied`
- `battle_stale_action_rejected`
- suspicious economy outliers

Decision:
- no action / add exploit checks / harden guards.

## Instrumentation rules

- Stable event names only; do not rename casually.
- Log meaningful state transitions, not every button press.
- Prefer one semantic event over multiple near-duplicates.
- Avoid guilt/FOMO instrumentation language in event names and docs.
- If a gameplay/economy/UX slice changes player guidance materially, update this doc and `PLAN.md` / `RELEASE_CHECKLIST.md` together.

## Definition of done for telemetry v1

- [ ] Каждая ключевая question above сопоставлена хотя бы с одним event.
- [ ] Event names и required fields описаны.
- [ ] Onboarding / post-session / return / economy / exploit signals покрыты.
- [ ] Owner и weekly review cadence названы.
- [ ] Scope boundaries задокументированы, чтобы не разрастаться в analytics platform.

## Defer until later

- inactivity-bucket precision and cohort analytics;
- dashboards and alerting;
- vendor/platform integration;
- deep combat turn-by-turn telemetry;
- social / PvP / live-ops analytics;
- experimentation framework.
