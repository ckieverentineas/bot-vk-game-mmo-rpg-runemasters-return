# School Novice Elite Evidence Gap Audit

## Status

- Status: `audit complete`
- Queue task: `Q-001`
- Date: `2026-04-22`
- Commit intent: `Audit school novice elite evidence gap`

## Finding

`school_novice_elite_encounter_started` не отсутствует из-за неподключённой telemetry. Runtime-точка записи существует и покрыта unit tests. Текущий evidence gap возникает потому, что release evidence читает реальные `GameLog`, а локальные/ручные прогоны в текущем окне не довели игрока до фактического старта aligned novice elite encounter.

Иными словами: событие есть, но текущий evidence pass не создаёт нужную игровую ситуацию.

## Runtime-точка записи события

Событие пишет `ExploreLocation` после создания боя:

- `src/modules/exploration/application/use-cases/ExploreLocation.ts`
- method: `trackSchoolNoviceEliteEncounterStarted()`
- telemetry adapter: `src/modules/shared/infrastructure/telemetry/RepositoryGameTelemetry.ts`
- event name: `school_novice_elite_encounter_started`

Событие отправляется только если одновременно выполнены условия:

1. У use-case есть `GameTelemetry`.
2. `battle.enemy.code` соответствует novice path enemy из `school-novice-path.ts`.
3. Враг является elite.
4. Текущая школа игрока совпадает со школой novice path.
5. У игрока ещё нет руны этой школы с rarity не ниже target reward rarity.
6. `buildPlayerNextGoalView(player).goalType === 'hunt_school_elite'`.

Эти условия правильные: они не дают считать generic elite, miniboss или уже закрытую school-веху за первый novice trial.

## Player state, который должен привести к событию

Минимальный честный state для Пламени:

- игрок уже вышел из tutorial;
- у игрока есть экипированная `USUAL` руна школы `ember`;
- у игрока нет `UNUSUAL` или более редкой руны школы `ember`;
- `buildPlayerNextGoalView(player)` возвращает `hunt_school_elite`;
- exploration идёт в `dark-forest`;
- encounter selection выбирает `ash-seer`;
- созданный enemy остаётся `isElite = true`.

Для остальных школ те же правила:

| Школа | Novice enemy | Target reward |
| --- | --- | --- |
| `ember` | `ash-seer` | `UNUSUAL` |
| `stone` | `stonehorn-ram` | `UNUSUAL` |
| `gale` | `storm-lynx` | `UNUSUAL` |
| `echo` | `blind-augur` | `UNUSUAL` |

## Почему текущий evidence report пустой по novice elite

`docs/testing/release-evidence-report.md` честно показывает:

- `school_novice_elite_encounter_started`: `0`;
- `school_novice_follow_up_action_taken`: есть события;
- `post_session_next_goal_shown` с `challenge_school_miniboss`: есть единичный follow-up.

Это означает, что часть follow-up telemetry уже появляется, но в текущем окне нет именно события старта novice elite. `release:evidence` поэтому правильно возвращает `insufficient_evidence`.

Главный практический разрыв:

- `src/tooling/release/local-playtest.ts` сейчас проходит first-session loop до tutorial victory, quest book claim, rune hub, equip first rune и profile;
- после экипировки первой руны он не продолжает deterministic exploration до aligned novice elite;
- `pickEncounterTemplate()` выбирает preferred school elite только при `locationLevel >= 3` и с отдельным шансом;
- обычный first-session loop после tutorial не гарантирует ни нужный location level, ни выбор `ash-seer` / `stonehorn-ram` / `storm-lynx` / `blind-augur`.

Поэтому evidence gap не стоит закрывать ручной вставкой логов. Нужно сделать runtime-прогон, который честно создаёт player state и доводит `ExploreLocation` до aligned novice elite encounter.

## Самый маленький честный следующий путь

Следующий task capsule должен быть `Q-002. Add Ember novice elite local evidence path`.

Минимальный план:

1. Добавить отдельный deterministic playtest или narrow release harness для Пламени.
2. Создать или довести player state до:
   - tutorial завершён;
   - `USUAL` ember rune экипирована;
   - `UNUSUAL` ember rune отсутствует;
   - location/adaptive state достаточен для school elite selection.
3. Запустить exploration через настоящий `ExploreLocation` / `GameHandler`, а не через прямую запись `GameLog`.
4. Зафиксировать, что `GameLog` содержит `school_novice_elite_encounter_started` с:
   - `schoolCode = ember`;
   - `enemyCode = ash-seer`;
   - `targetRewardRarity = UNUSUAL`;
   - `nextGoalType = hunt_school_elite`.
5. После этого прогнать:

```bash
npm run release:school-evidence
npm run release:evidence
npm run release:preflight
```

## Decision

Q-001 закрывается как audit/docs task. Код менять в этом пункте рано: root cause не в отсутствующей telemetry-точке, а в отсутствии deterministic evidence path до нужного runtime-события.

