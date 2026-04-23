# Project One-Request Task Queue

## Status

- Status: `living queue`
- Created: `2026-04-22`
- Current checkpoint: commit `fa19167 Document lore quest continuation completion`
- Progress policy: one task = one request = one verification pass = one commit.
- Active queue progress: `11/46 active task capsules closed`
- Deferred review progress: `0/10 review capsules closed`

Этот документ нужен как рабочая очередь для чата. Когда звучит `дальше`, берётся первый незакрытый пункт из ближайшего приоритета, выполняется маленьким вертикальным срезом, проверяется и коммитится отдельно.

---

## 1. Правило размера задачи

Задача подходит для одного запроса, если она:

- имеет один главный результат;
- меняет небольшой связный набор файлов;
- может быть проверена локальной командой или конкретным evidence pass;
- не требует одновременно менять gameplay, persistence, transport, telemetry и docs без жёсткой причины;
- заканчивается понятным коммитом.

Если по ходу работы задача расползается, её нужно остановить и разделить на новые task capsules.

## 2. Формат отчёта после каждого коммита

После каждого закрытого пункта сообщать:

```text
Готово: <процент очереди>.
Коммит: <hash> <message>
Закрыто: <task id>
Дальше: <следующий task id>
```

Процент считать как `закрытые task capsules / активные task capsules`, а deferred review capsules считать отдельно, пока они не переведены в active.

## 3. Verification presets

### Docs-only

```bash
npm run content:validate
git diff --check
```

### Code slice

```bash
npm run typecheck
npm test
```

Если меняется контент, дополнительно:

```bash
npm run content:validate
```

### Release evidence slice

```bash
npm run release:school-evidence
npm run release:evidence
npm run release:preflight
```

### Full local release gate

```bash
npm run db:generate
npm run check
npm run release:local-playtest
npm run release:status
npm run release:summary
npm run release:preflight
```

`db:generate` запускать только когда бот не держит Prisma query engine.

---

## 4. Active queue

### Q-001. Audit school novice elite evidence gap

- Status: `done`
- Source: `docs/testing/release-evidence-report.md`, `docs/testing/school-path-evidence-report.md`, `docs/telemetry/telemetry-plan.md`
- Goal: понять, почему в логах нет `school_novice_elite_encounter_started`, и зафиксировать самый маленький честный путь к этому событию.
- Scope:
  - найти runtime-точку записи события;
  - найти, какой player state должен привести к school novice elite;
  - записать короткое решение в документах или тесте, если код менять рано.
- Verification: `npm run typecheck` или docs-only preset, в зависимости от изменений.
- Commit: `Audit school novice elite evidence gap`

### Q-002. Add Ember novice elite local evidence path

- Status: `done`
- Source: `docs/testing/school-path-playtest-v1.md`
- Goal: добиться воспроизводимого локального пути до novice elite Пламени.
- Scope:
  - расширить локальный playtest или targeted test только для Пламени;
  - проверить, что событие `school_novice_elite_encounter_started` реально появляется;
  - не подделывать telemetry без runtime-перехода.
- Verification: release evidence preset.
- Commit: `Add ember novice elite evidence path`

### Q-003. Add Stone novice elite local evidence path

- Status: `done`
- Source: `docs/testing/school-path-playtest-v1.md`
- Goal: повторить evidence path для Тверди как второй школы locked Vertical Slice.
- Scope:
  - довести игрока до novice elite Тверди;
  - подтвердить aligned reward и follow-up к rune hub;
  - не расширять одновременно баланс всех школ.
- Verification: release evidence preset.
- Commit: `Add stone novice elite evidence path`

### Q-004. Add Gale novice elite local evidence path

- Status: `done`
- Source: `docs/testing/school-path-playtest-v1.md`
- Goal: получить отдельный runtime evidence path для Бури.
- Scope:
  - использовать уже найденный pattern из Пламени/Тверди;
  - проверить `schoolCode = gale`;
  - оставить tuning боя вне этого коммита, если событие уже достижимо.
- Verification: release evidence preset.
- Commit: `Add gale novice elite evidence path`

### Q-005. Add Echo novice elite local evidence path

- Status: `done`
- Source: `docs/testing/school-path-playtest-v1.md`
- Goal: получить отдельный runtime evidence path для Прорицания.
- Scope:
  - использовать общий helper, если он появился в Q-002..Q-004;
  - проверить `schoolCode = echo`;
  - не менять fantasy copy без отдельного copy pass.
- Verification: release evidence preset.
- Commit: `Add echo novice elite evidence path`

### Q-006. Close school evidence verdict

- Status: `done`
- Source: `PLAN.md`, `RELEASE_CHECKLIST.md`, `docs/testing/release-evidence-report.md`
- Goal: перевести school-first slice из `insufficient_evidence` в доказанное состояние или честно зафиксировать оставшийся gap.
- Scope:
  - прогнать `release:school-evidence`;
  - прогнать `release:evidence`;
  - синхронизировать `PLAN.md` и `RELEASE_CHECKLIST.md`, если verdict изменился.
- Verification: release evidence preset.
- Commit: `Close school path evidence gap`

### Q-007. Write production handoff runbook

- Status: `done`
- Source: `RELEASE_CHECKLIST.md`
- Goal: зафиксировать минимальный ops-runbook для `.env`, SQLite backup, запуска, логов и отката.
- Scope:
  - создать или обновить документ в `docs/platform/`;
  - не добавлять деплой-автоматизацию;
  - указать только проверяемые локальные команды и места, которые уже используются проектом.
- Verification: docs-only preset.
- Commit: `Document production handoff runbook`

### Q-008. Run full local release gate after bot stop

- Status: `done`
- Source: `RELEASE_CHECKLIST.md`
- Goal: пройти полный технический gate на чистом окружении.
- Scope:
  - запустить full local release gate preset;
  - сохранить вывод важных команд в краткой release note, если есть изменения в docs;
  - не чинить найденные ошибки в этом же коммите, если они требуют кода.
- Verification: full local release gate preset.
- Commit: `Record local release gate results`

### Q-009. Add quest book funnel to release evidence

- Status: `done`
- Source: `docs/product/lore-quests-home-continuation.md`, `PLAN.md`
- Goal: сделать `Книгу путей` видимой в `release:evidence`, а не только в unit/local playtest.
- Scope:
  - добавить узкий блок по `quest_book_opened`, `quest_reward_claimed`, `quest_reward_replayed`, `quest_reward_not_ready`;
  - не строить analytics platform;
  - обновить `docs/testing/release-evidence-report.md`.
- Verification: release evidence preset.
- Commit: `Add quest book release evidence`

### Q-010. Add quest rewards to duplication matrix

- Status: `done`
- Source: `docs/qa/reward-duplication-matrix.md`, `docs/testing/concurrency-critical-use-cases.md`
- Goal: явно включить quest reward claim/replay в reward duplication safety docs.
- Scope:
  - добавить строку matrix для `Quest reward claim`;
  - указать ledger guard и expected replay behavior;
  - добавить critical-use-case note, если новый reward-bearing flow должен быть обязательным.
- Verification: docs-only preset.
- Commit: `Document quest reward duplication guard`

### Q-011. Run manual quest book playtest note

- Status: `done`
- Source: `PLAN.md`, `docs/product/lore-quests-home-continuation.md`
- Goal: закрыть human-readable evidence по open/claim/replay `Книги путей`.
- Scope:
  - пройти сценарий из continuation-документа;
  - записать краткий результат в `docs/testing/`;
  - не менять UX в том же коммите.
- Verification: docs-only preset.
- Commit: `Record quest book manual playtest`

### Q-012. Quest book copy density pass

- Status: `done`
- Source: `src/vk/presenters/questMessages.ts`
- Goal: проверить, что после добавления новых глав экран не выглядит как административный список.
- Scope:
  - отредактировать только presenter/copy, если нужно;
  - сохранить forbidden tone из continuation-документа;
  - добавить или обновить presenter snapshot/unit test.
- Verification: code slice preset.
- Commit: `Refine quest book copy density`

### Q-013. Add world trail quest chapter

- Status: `ready-after-q012`
- Source: `src/modules/quests/domain/quest-definitions.ts`
- Goal: добавить следующую небольшую главу `Книги путей` вокруг exploration/world milestones.
- Scope:
  - 3-5 новых записей;
  - только progress, который честно выводится из текущего `PlayerState` или ledger;
  - tests для read-model и presenter.
- Verification: `npm run check`.
- Commit: `Add world trail quest chapter`

### Q-014. Decide quest persistence boundary

- Status: `ready-before-branching-quests`
- Source: `docs/product/lore-quests-home-continuation.md`, `ARCHITECTURE.md`
- Goal: определить, когда `RewardLedgerRecord` перестаёт быть достаточным и нужна отдельная quest-state persistence.
- Scope:
  - document-first decision;
  - перечислить конкретные признаки, которые требуют `PlayerQuestState`;
  - не добавлять Prisma migration.
- Verification: docs-only preset.
- Commit: `Document quest persistence boundary`

### Q-015. Add skinning skill growth depth

- Status: `done`
- Source: `docs/product/action-based-progression-and-trophy-loot.md`
- Goal: сделать `gathering.skinning` глубже, чем один базовый action.
- Scope:
  - добавить один новый skinning threshold или reward variation;
  - покрыть resolver тестом;
  - не трогать reagent/essence в этом коммите.
- Verification: code slice preset.
- Commit: `Add skinning skill growth depth`

### Q-016. Add reagent gathering skill growth depth

- Status: `done`
- Source: `docs/product/action-based-progression-and-trophy-loot.md`
- Goal: расширить `gathering.reagent_gathering` для slime/reagent loop.
- Scope:
  - один новый threshold или reward variation;
  - targeted tests;
  - не менять essence extraction.
- Verification: code slice preset.
- Commit: `Add reagent gathering skill depth`

### Q-017. Add essence extraction skill growth depth

- Status: `done`
- Source: `docs/product/action-based-progression-and-trophy-loot.md`
- Goal: расширить `gathering.essence_extraction` для spirit/mage loop.
- Scope:
  - один новый threshold или reward variation;
  - targeted tests;
  - не добавлять hidden school pools в этом же срезе.
- Verification: code slice preset.
- Commit: `Add essence extraction skill depth`

### Q-018. Decide skill display style

- Status: `done`
- Source: `docs/product/action-based-progression-and-trophy-loot.md`
- Goal: выбрать, показывать ли навыки числом (`3.42`) или рангом (`Новичок свежевания`).
- Scope:
  - document-first decision;
  - если решение очевидно по текущему UX, обновить profile presenter отдельно маленьким срезом;
  - не менять баланс роста.
- Verification: docs-only preset или code slice preset.
- Commit: `Define skill display style`

### Q-019. Add Ember hidden trophy pool

- Status: `done`
- Source: `docs/product/action-based-progression-and-trophy-loot.md`
- Goal: добавить первый hidden drop pool по школе Пламени.
- Scope:
  - один enemy или encounter;
  - один hidden action;
  - replay-safe reward resolution;
  - tests на доступность и отсутствие reroll на replay.
- Verification: code slice preset plus relevant reward tests.
- Commit: `Add ember hidden trophy pool`

### Q-020. Add one skill-threshold trophy action

- Status: `done`
- Source: `docs/product/action-based-progression-and-trophy-loot.md`
- Goal: открыть новую trophy action через skill threshold.
- Scope:
  - один навык;
  - один threshold;
  - один enemy kind;
  - no hidden school pool in the same commit.
- Verification: code slice preset.
- Commit: `Unlock trophy action by skill threshold`

### Q-021. Update OBT tester guide for action progression

- Status: `done`
- Source: `docs/product/action-based-progression-and-trophy-loot.md`
- Goal: дать тестеру понятный сценарий проверки action progression.
- Scope:
  - создать или обновить документ в `docs/testing/`;
  - указать expected skill/reward/replay behavior;
  - не менять runtime.
- Verification: docs-only preset.
- Commit: `Document action progression tester guide`

### Q-022. Record pending trophy manual evidence

- Status: `done`
- Source: `PLAN.md`, `RELEASE_CHECKLIST.md`
- Goal: закрыть manual evidence gap по pending trophy collect/replay.
- Scope:
  - пройти сбор pending reward и повтор старой кнопки;
  - записать краткую заметку в `docs/testing/`;
  - не менять gameplay в этом коммите.
- Verification: docs-only preset plus `npm run release:local-playtest`.
- Commit: `Record pending trophy manual evidence`

### Q-023. Add economy transaction telemetry for reward claims

- Status: `ready`
- Source: `docs/telemetry/telemetry-plan.md`
- Goal: начать покрытие `economy_transaction_committed` с reward claim path.
- Scope:
  - один стабильный event shape;
  - один reward source path;
  - tests на telemetry failure safety.
- Verification: code slice preset.
- Commit: `Add reward claim economy telemetry`

### Q-024. Add economy source/sink summary to release evidence

- Status: `ready-after-q023`
- Source: `docs/telemetry/telemetry-plan.md`
- Goal: показать early economy health в `release:evidence`.
- Scope:
  - агрегировать только shipped telemetry fields;
  - не добавлять dashboard;
  - обновить generated report.
- Verification: release evidence preset.
- Commit: `Add economy evidence summary`

### Q-025. Add return recap local evidence path

- Status: `ready`
- Source: `docs/testing/release-evidence-report.md`, `docs/telemetry/telemetry-plan.md`
- Goal: получить данные по `return_recap_shown`, которых сейчас нет в evidence window.
- Scope:
  - расширить local playtest или targeted handler test на returning player;
  - проверить next step type;
  - не менять copy без отдельного pass.
- Verification: `npm run release:local-playtest` plus release evidence preset if logs update.
- Commit: `Add return recap evidence path`

### Q-026. Review next-goal follow-up stitching

- Status: `ready-after-q025`
- Source: `docs/testing/release-evidence-report.md`
- Goal: проверить, не теряется ли связь между `post_session_next_goal_shown` и последующим meaningful action.
- Scope:
  - inspect only release tooling and telemetry payloads;
  - add one narrow aggregation improvement if needed;
  - avoid session analytics platform.
- Verification: release evidence preset.
- Commit: `Improve next goal evidence stitching`

### Q-027. Close telemetry plan definition of done

- Status: `ready`
- Source: `docs/telemetry/telemetry-plan.md`
- Goal: синхронизировать checkbox definition of done с фактическим runtime instrumentation snapshot.
- Scope:
  - проверить каждый checkbox;
  - отметить выполненное или явно оставить незакрытый пункт с причиной;
  - не менять events в том же коммите.
- Verification: docs-only preset.
- Commit: `Sync telemetry plan completion state`

### Q-028. Add weekly evidence review template

- Status: `ready`
- Source: `docs/telemetry/telemetry-plan.md`, `RELEASE_CHECKLIST.md`
- Goal: дать короткий шаблон weekly review по UX, balance/economy и QA/exploit.
- Scope:
  - docs-only;
  - один шаблон в `docs/testing/` или `docs/qa/`;
  - без новых process requirements в runtime.
- Verification: docs-only preset.
- Commit: `Add weekly evidence review template`

### Q-029. Sync content pipeline references

- Status: `ready`
- Source: `docs/content/content-pipeline-plan.md`
- Goal: закрыть definition-of-done пункт про ссылки из README/PLAN/release checklist.
- Scope:
  - обновить только ссылки и короткие описания;
  - не менять content runtime.
- Verification: docs-only preset.
- Commit: `Link content pipeline docs`

### Q-030. Add concrete encounter package example

- Status: `ready`
- Source: `docs/content/content-pipeline-plan.md`
- Goal: добавить один worked example encounter package.
- Scope:
  - один encounter;
  - школа, enemy pressure, tactical ask, reward hook, validation expectations;
  - no runtime folder migration.
- Verification: docs-only preset.
- Commit: `Add encounter package example`

### Q-031. Add concrete enemy package example

- Status: `ready-after-q030`
- Source: `docs/content/content-pipeline-plan.md`
- Goal: добавить worked example enemy package.
- Scope:
  - один enemy;
  - fantasy role, combat pressure, intent language, school relevance, reward role;
  - docs-only.
- Verification: docs-only preset.
- Commit: `Add enemy package example`

### Q-032. Add concrete quest package example

- Status: `ready-after-q031`
- Source: `docs/content/content-pipeline-plan.md`
- Goal: показать, как quest package consumes school/enemy/encounter packages.
- Scope:
  - один quest package example;
  - trigger, completion type, reward hook, validation expectations;
  - no quest runtime platform.
- Verification: docs-only preset.
- Commit: `Add quest package example`

### Q-033. Expand validator warning for encounter ask

- Status: `ready-after-q030`
- Source: `docs/content/validator-scope.md`
- Goal: добавить warning-level check для weak encounter tactical ask, если runtime content уже хранит нужные поля.
- Scope:
  - сначала проверить content shape;
  - реализовать warning только если есть стабильные данные;
  - иначе обновить validator scope как deferred note.
- Verification: `npm run content:validate` plus code slice preset if validator changes.
- Commit: `Validate encounter tactical ask`

### Q-034. Write school bible v1

- Status: `done`
- Source: `docs/reviews/phase-1-exit-gate.md`, `docs/product/1-0-release-charter.md`
- Goal: закрыть product-lock gap по school overlap/uniqueness rules.
- Scope:
  - document-first;
  - описать четыре школы, их overlap, forbidden overlap и first payoff promise;
  - не менять баланс.
- Verification: docs-only preset.
- Commit: `Document school bible v1`

### Q-035. Write rarity ladder v1

- Status: `ready-after-q034`
- Source: `docs/reviews/phase-1-exit-gate.md`, `docs/product/deep-progression-rpg-vision.md`
- Goal: закрыть product-lock gap по rarity ladder.
- Scope:
  - document-first;
  - описать `USUAL`, `UNUSUAL`, `RARE` как ранние payoff tiers;
  - не менять reward formulas.
- Verification: docs-only preset.
- Commit: `Document rarity ladder v1`

### Q-036. Write player-state versioning policy

- Status: `ready`
- Source: `docs/platform/persistence-versioning-rules.md`, `docs/reviews/phase-1-exit-gate.md`
- Goal: закрыть document-first gap по full player-state versioning.
- Scope:
  - описать policy и boundaries;
  - не добавлять Prisma migration;
- указать, какие fixtures уже существуют и что ещё остаётся открытым.
- Verification: docs-only preset.
- Commit: `Document player state versioning policy`

### Q-037. Define source-of-truth vs read-model split

- Status: `ready-after-q036`
- Source: `ARCHITECTURE.md`, `docs/platform/persistence-versioning-rules.md`
- Goal: формально развести persisted source-of-truth state и derived read-models.
- Scope:
  - document-first;
  - перечислить текущие examples: quest book, next goal, school mastery, battle snapshot;
  - no schema change.
- Verification: docs-only preset.
- Commit: `Document state and read model boundaries`

### Q-038. Decide legacy battle fallback retirement policy

- Status: `ready-after-q036`
- Source: `docs/platform/persistence-versioning-rules.md`
- Goal: решить, когда legacy battle columns остаются permanent fallback, а когда могут быть retired.
- Scope:
  - decision doc only;
  - include rollback safety and migration window criteria;
  - no migration.
- Verification: docs-only preset.
- Commit: `Document battle fallback retirement policy`

### Q-039. Sketch migration harness boundaries

- Status: `later-after-q036`
- Source: `docs/platform/persistence-versioning-rules.md`
- Goal: описать минимальный migration harness beyond checked-in fixtures.
- Scope:
  - docs-only;
  - no Prisma migration;
  - define commands, fixtures and acceptance gates.
- Verification: docs-only preset.
- Commit: `Document migration harness boundaries`

### Q-040. Design generic mutation intent envelope

- Status: `later`
- Source: `docs/platform/command-intent-rules.md`
- Goal: подготовить design slice для generic mutation intent envelope.
- Scope:
  - document-first;
  - enumerate remaining command families;
  - define one narrow implementation candidate.
- Verification: docs-only preset.
- Commit: `Design generic mutation intent envelope`

### Q-041. Cover remaining legacy text replay handling

- Status: `later-after-q040`
- Source: `docs/platform/command-intent-rules.md`, `docs/platform/retry-handling-rules.md`
- Goal: закрывать remaining legacy text repeated actions малыми группами.
- Scope:
  - выбрать одну command family;
  - add canonical receipt only for that family;
  - targeted tests.
- Verification: code slice preset.
- Commit: `Handle legacy text replay for <family>`

### Q-042. Review RNG authority deferred list

- Status: `ready`
- Source: `docs/platform/rng-authority-rules.md`
- Goal: проверить, какие deferred RNG authority пункты уже закрыты command intent work, а какие остаются.
- Scope:
  - docs-only unless direct code gap is obvious;
  - no new randomness behavior.
- Verification: docs-only preset.
- Commit: `Review RNG authority deferred gaps`

### Q-043. Sync README after next behavior slice

- Status: `recurring`
- Source: `PLAN.md`, `RELEASE_CHECKLIST.md`
- Goal: держать README в согласии с shipped runtime.
- Scope:
  - делать после behavior-affecting коммита;
  - не обновлять ради internal-only refactor.
- Verification: docs-only preset.
- Commit: `Sync README with current runtime`

### Q-044. Sync CHANGELOG after next behavior slice

- Status: `recurring`
- Source: `CHANGELOG.md`, `RELEASE_CHECKLIST.md`
- Goal: добавлять player-facing release notes после поведения, которое увидит игрок.
- Scope:
  - один changelog entry на один finished slice;
  - не дублировать внутренние refactor details.
- Verification: docs-only preset.
- Commit: `Update changelog for <slice>`

### Q-045. Sync PLAN after evidence status changes

- Status: `recurring`
- Source: `PLAN.md`
- Goal: не оставлять `не считается доказанным`, если evidence уже прошёл, и наоборот.
- Scope:
  - update only factual status;
  - no roadmap expansion.
- Verification: docs-only preset.
- Commit: `Sync plan evidence status`

### Q-046. Mark superseded review docs

- Status: `ready`
- Source: `PLAN.md`, `docs/reviews/*`
- Goal: снизить риск, что старый review-док начнёт управлять текущим scope.
- Scope:
  - пройти review docs;
  - добавить `superseded by` only where conflict is concrete;
  - do not delete historical docs.
- Verification: docs-only preset.
- Commit: `Mark superseded review notes`

### Q-047. Close rare seal runtime evidence loop

- Status: `done`
- Source: `PLAN.md`, `docs/testing/school-path-playtest-v1.md`, `docs/testing/release-evidence-report.md`
- Goal: довести school-first runtime evidence до `RARE seal`, а не останавливаться на novice payoff.
- Scope:
  - расширить `release:local-playtest` до `novice elite -> UNUSUAL sign -> equip sign -> school miniboss -> RARE seal`;
  - убедиться, что payload auto-equip школьного знака во второй слот не теряет copy и `equip_school_sign` telemetry;
  - обновить release evidence checks без новых школ и таблиц.
- Verification: release evidence preset plus `npm run release:local-playtest`.
- Commit: `Prove rare school seal loop`

---

## 5. Deferred review capsules

Эти пункты не являются active implementation scope. Их можно брать только как отдельный review request, чтобы решить `cut`, `defer`, `split` или `promote to active`.

### R-001. Social-lite / circles review

- Status: `deferred-review`
- Source: `docs/product/1-0-release-charter.md`, `docs/qa/alt-account-guild-pvp-abuse-checklist.md`
- Goal: решить, есть ли безопасный post-1.0 social-lite slice без attendance pressure.
- Output: review doc only.
- Verification: docs-only preset.
- Commit: `Review social lite scope`

### R-002. Async PvP review

- Status: `deferred-review`
- Source: `docs/product/1-0-release-charter.md`, `docs/qa/alt-account-guild-pvp-abuse-checklist.md`
- Goal: проверить optional async PvP как candidate только после school evidence.
- Output: review doc only.
- Verification: docs-only preset.
- Commit: `Review async pvp scope`

### R-003. Season chronicle review

- Status: `deferred-review`
- Source: `docs/content/content-pipeline-plan.md`, `docs/product/1-0-release-charter.md`
- Goal: решить, нужен ли season chronicle config до live-ops tooling.
- Output: review doc only.
- Verification: docs-only preset.
- Commit: `Review season chronicle scope`

### R-004. Full quest runtime platform review

- Status: `deferred-review`
- Source: `docs/product/lore-quests-home-continuation.md`
- Goal: решить, когда read-model quest book перестаёт быть достаточным.
- Output: review doc only, unless Q-014 already closed the boundary.
- Verification: docs-only preset.
- Commit: `Review quest runtime platform scope`

### R-005. Attrition and rest system review

- Status: `deferred-review`
- Source: `ARCHITECTURE.md`, `docs/product/deep-progression-rpg-vision.md`
- Goal: оценить долгосрочные HP/мана wounds/rest без ломки current battle snapshot contract.
- Output: review doc only.
- Verification: docs-only preset.
- Commit: `Review attrition and rest scope`

### R-006. Cities and world meta-progression review

- Status: `deferred-review`
- Source: `docs/product/deep-progression-rpg-vision.md`
- Goal: разложить restored cities/world growth на future slices, не добавляя их в 1.0 promise.
- Output: review doc only.
- Verification: docs-only preset.
- Commit: `Review city progression scope`

### R-007. Daily opportunity board review

- Status: `deferred-review`
- Source: `docs/product/deep-progression-rpg-vision.md`, `docs/product/1-0-release-charter.md`
- Goal: проверить, можно ли сделать opportunity board без daily chores, streak pressure и FOMO.
- Output: review doc only.
- Verification: docs-only preset.
- Commit: `Review opportunity board scope`

### R-008. Player market / trading review

- Status: `deferred-review`
- Source: `docs/product/1-0-release-charter.md`
- Goal: оставить trading/player market out-of-scope до отдельного economy and abuse review.
- Output: review doc only.
- Verification: docs-only preset.
- Commit: `Review trading scope`

### R-009. Full four-school production package review

- Status: `deferred-review`
- Source: `docs/reviews/phase-1-exit-gate.md`
- Goal: решить, когда Буря и Прорицание переходят из evidence coverage в full production package depth.
- Output: review doc only.
- Verification: docs-only preset.
- Commit: `Review four school package scope`

### R-010. Deep skill tree review

- Status: `deferred-review`
- Source: `docs/product/deep-progression-rpg-vision.md`
- Goal: выделить первый safe slice из long-horizon skill tree vision.
- Output: review doc only.
- Verification: docs-only preset.
- Commit: `Review skill tree scope`

---

## 6. Suggested next order

1. Q-001
2. Q-002
3. Q-003
4. Q-006
5. Q-009
6. Q-010
7. Q-011
8. Q-022
9. Q-007
10. Q-034
11. Q-035
12. Q-015

Этот порядок сначала закрывает релизное доказательство, затем reward/quest safety, потом product lock и только после этого расширяет progression depth.
