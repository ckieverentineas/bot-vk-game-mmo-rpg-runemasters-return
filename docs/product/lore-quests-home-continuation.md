# Lore and Quest Book Home Continuation

## Status

- Status: `continuation complete`
- Purpose: зафиксировать закрытый проход по лору, интро и `Книге путей`, чтобы следующий заход начинался уже с evidence или нового product slice.
- Scope class: `completed near-term playable vertical slices`
- Current checkpoint: commit `4b7f93c Add school quest chapters`
- Completion: `5/5 slices`, `100%`

Этот документ теперь служит итоговой точкой по первому домашнему continuation-проходу: решения сохранены, пять срезов закрыты отдельными коммитами, следующий шаг вынесен в контроль evidence.

## Completion checkpoint

Закрыто отдельными коммитами:

- `e914adb Extend local playtest with quest book claims` — local playtest открывает книгу, забирает первую награду и проверяет replay-safety.
- `59513bf Add quest telemetry events` — квестовые события пишутся через `GameTelemetry`.
- `39edd63 Extract quest reward ledger contract` — контракт ledger snapshot вынесен из Prisma repository.
- `05514c6 Add first name quest chapter` — добавлена глава `Путь первого имени`.
- `4b7f93c Add school quest chapters` — добавлены первые школьные главы.

Последний контроль:

- `npm run check` — passed перед `4b7f93c`, 602 tests.
- `npm run release:local-playtest` — passed перед `4b7f93c`.
- `npm run release:preflight` — passed после `4b7f93c`.
- `npm run release:school-evidence` — passed, report saved.
- `npm run release:evidence` — command passed, verdict `insufficient_evidence`: в логах пока нет `school_novice_elite_encounter_started`.

---

## 1. Что уже внедрено

### Лорный старт

Игрок теперь входит не через сухое создание персонажа, а через завязку:

- обычный мир гаснет после странного сообщения;
- игрок просыпается в Рунном Пределе;
- в ладони лежит первый осколок;
- он становится `Пустым мастером`;
- первый бой с Учебным огоньком нужен, чтобы руна ответила.

Код:

- `src/vk/presenters/homeMessages.ts`

### Книга путей

Добавлен первый playable vertical slice постоянных квестов:

- отдельная кнопка `📜 Книга путей` в главном меню;
- команды/алиасы: `книга путей`, `квесты`, `задания`, `летопись пути`;
- экран с каруселью записей пути: до 5 записей на странице, готовые награды первыми, один ближайший actionable след, остальные следы после него и компактный архив закрытого;
- inline-кнопки для готовых наград;
- exact-once claim через существующий `RewardLedgerRecord`, без новой миграции БД;
- награды могут давать пыль и inventory delta.
- VK-клавиатура остаётся в лимите 6 рядов: до 5 claim-рядов на текущей странице плюс навигация.

Код:

- `src/modules/quests/domain/quest-definitions.ts`
- `src/modules/quests/application/read-models/quest-book.ts`
- `src/modules/quests/application/use-cases/GetQuestBook.ts`
- `src/modules/quests/application/use-cases/ClaimQuestReward.ts`
- `src/vk/presenters/questMessages.ts`
- `src/vk/keyboards/quests.ts`
- `src/vk/handlers/routes/questCommandRoutes.ts`
- `src/vk/handlers/responders/questReplyFlow.ts`
- `src/modules/shared/infrastructure/prisma/PrismaGameRepository.ts`

### Текст наград

Общий formatter наград стал писать живее:

- `+1 обычный осколок`
- `+2 обычных осколка`
- `+5 обычных осколков`
- `+2 кожи`
- `+1 эссенция`

Код:

- `src/vk/presenters/message-formatting.ts`
- `src/vk/presenters/rewardMessages.ts`

---

## 2. Принятые решения

### Квесты пока без отдельной таблицы

Решение Q-014: текущая `Книга путей` остаётся read-model'ом поверх `PlayerState`, а `RewardLedgerRecord` используется только как экономический exact-once rail для выдачи награды.

Первый срез использует `RewardLedgerRecord` так:

- `sourceType = QUEST_REWARD`
- `sourceId = questCode`
- `ledgerKey = quest_reward:${playerId}:${questCode}`

Этого достаточно, пока каждая запись отвечает на два вопроса:

- можно ли честно вычислить progress из текущего `PlayerState` или уже существующего ledger-события;
- была ли награда за конкретный `questCode` уже выдана.

`RewardLedgerRecord` перестаёт быть достаточным, когда квесту нужно собственное состояние, а не только факт выдачи награды. В таком случае следующая миграция должна вводить отдельный `PlayerQuestState`, а не прятать сюжетный state в reward ledger snapshot.

Конкретные признаки, которые требуют `PlayerQuestState`:

- ручной выбор ветки, школы ответа, союзника, исхода или другой mutually exclusive путь;
- скрытые или открываемые стадии, которые нельзя восстановить из публичного `PlayerState`;
- сюжетные решения с долгим последствием: accepted, declined, forgiven, betrayed, remembered;
- временная недоступность записи, cooldown, fail state, pause/resume или abandoned state;
- несколько reward claims или несколько reward-bearing steps внутри одной quest chapter;
- ordered multi-step progress, где важен порядок действий, а не только итоговый счётчик;
- per-quest counters, которые не являются уже сохранёнными player counters;
- серверное событие, которое произошло один раз и не оставило честного marker'а в `PlayerState`;
- необходимость показать игроку разные тексты для `seen`, `revealed`, `completed`, `claimed`, `replayed`;
- analytics/evidence требует distinguishing state, который невозможно получить из current read-model без догадок.

До появления хотя бы одного такого признака новые записи добавляются через `quest-definitions.ts`, а claim продолжает идти через `RewardLedgerRecord`.

### Прогресс квестов считается read-model'ом

Сейчас квесты не пишут отдельный progress state. Они вычисляются из текущего состояния:

- победы;
- надетые руны;
- mastery школы;
- материалы в инвентаре.

Это хорошо для стартовых постоянных квестов, потому что меньше риска рассинхрона.

### Квесты не должны стать daily chores

Запрещённый тон:

- `зайди сегодня`;
- `сделай 10 кликов`;
- `не пропусти награду`;
- `серия дней`;
- FOMO-награды;
- punishment за отсутствие.

Правильный тон:

- глава пути;
- запись летописи;
- школьное испытание;
- milestone сборки;
- открытие мира;
- награда за уже совершённый meaningful step.

### Текст должен оставаться в мире игры

В player-facing сообщениях не писать:

- `нажмите кнопку`;
- `функция`;
- `режим`;
- `механика`;
- `прогресс сохранён`;
- `квест выполнен`;
- `интерфейс`;
- `система выдала`.

Лучше:

- `Запись закрыта`;
- `Награда ждёт`;
- `Руны помнят завершённые шаги`;
- `Теперь это часть твоей летописи`;
- `Путь стал яснее`;
- `Школа ответила`.

---

## 3. Закрытый порядок работ

### Срез 1. Расширить local playtest на Книгу путей — закрыт

На момент continuation-старта `release:local-playtest` проверял первый session loop, но не открывал `Книгу путей`.

Нужно добавить в `src/tooling/release/local-playtest.ts`:

1. После первой победы и сбора трофея открыть `gameCommands.questBook`.
2. Убедиться, что reply содержит:
   - `📜 Книга путей`;
   - `Пробуждение Пустого мастера`;
   - хотя бы одну готовую награду.
3. Нажать `gameCommands.claimQuestReward` с `stateKey = awakening_empty_master`.
4. Повторить claim той же записи и убедиться, что повтор не даёт вторую награду.
5. Добавить summary-поля:
   - `questBookReplyCount`;
   - `questRewardClaimReplyCount`;
   - `questRewardReplaySafe`.

Acceptance:

- `npm run release:local-playtest` проходит;
- transcript показывает книгу и закрытие записи;
- повторная кнопка не увеличивает пыль/осколки повторно.

### Срез 2. Добавить quest-specific telemetry — закрыт

На момент continuation-старта квесты проверялись через repository и tests, но в evidence их почти не было видно.

Добавить события:

- `quest_book_opened`
- `quest_reward_claimed`
- `quest_reward_replayed`
- `quest_reward_not_ready`

Где писать:

- use-case или handler-level, но аккуратно: gameplay event лучше ближе к application layer;
- если использовать `GameTelemetry`, расширять интерфейс маленьким срезом и обновить `RepositoryGameTelemetry`.

Payload:

- `playerId`
- `questCode`
- `questStatus`
- `readyToClaimCount`
- `claimedCount`

Acceptance:

- события попадают в `gameLog`;
- telemetry failure не ломает claim;
- tests покрывают happy path и telemetry rejection.

### Срез 3. Вынести quest reward snapshot в contract — закрыт

На момент continuation-старта quest ledger snapshot жил внутри `PrismaGameRepository.ts`. Для роста его нужно было вынести в shared/domain contract:

- `src/modules/shared/domain/contracts/quest-reward-ledger.ts`

Туда:

- `QuestRewardLedgerEntryV1`
- `createQuestRewardLedgerEntry`
- `isQuestRewardLedgerEntry`
- parse/validation helpers, если потребуется.

Acceptance:

- `PrismaGameRepository` становится чуть тоньше;
- добавлены contract tests;
- `npm test` зелёный.

### Срез 4. Расширить первые квесты до настоящей главы — закрыт

Текущие 5 стартовых записей:

- `Пробуждение Пустого мастера`
- `Первый знак`
- `Голос школы`
- `Два гнезда`
- `Трофейная рука`

Следующие записи стоит добавить как главу `Путь первого имени`:

1. `Имя на границе`
   - Условие: завершить tutorial и открыть приключения.
   - Смысл: мир впервые признаёт игрока не только выжившим, но и идущим.

2. `След за пределом круга`
   - Условие: победить врага вне tutorial location.
   - Смысл: первый настоящий след в большом мире.

3. `Молчание второй руны`
   - Условие: получить вторую руну.
   - Смысл: сборка начинает быть выбором, а не одиночным знаком.

4. `Первый узор`
   - Условие: надеть две руны.
   - Смысл: первый круг сборки закрыт.

5. `Ремесло после боя`
   - Условие: собрать трофей через action, отличающийся от `claim_all`.
   - Сейчас нет явного persisted marker для выбранного trophy action, кроме reward ledger snapshot. Можно сначала отложить или читать ledger.

Acceptance:

- квесты читаются как глава, а не checklist;
- не появляются ежедневные задания;
- каждая запись имеет понятную награду и progress condition.

### Срез 5. Школьные главы — закрыт

После стартовой главы сделать первые school-specific записи:

Пламя:

- `Искра дожима`
- `То, что боится света`
- `Пепельная печать`

Твердь:

- `Пока я стою`
- `Ответ камня`
- `Печать стены`

Буря:

- `До грома`
- `Перехват ветра`
- `Печать рывка`

Прорицание:

- `Трещина в будущем`
- `Удар, которого ещё нет`
- `Печать предупреждения`

Первые условия можно делать простыми:

- победить с руной школы;
- набрать 3 mastery experience школы;
- победить school novice elite своей школы;
- получить редкость/печать школы.

Важно: если условие нельзя честно вывести из текущего state, не имитировать его. Либо добавить persisted marker, либо отложить.

---

## 4. Ручной playtest дома

Перед следующим product slice полезно пройти один ручной сценарий в боте:

1. Новый игрок.
2. Прочитать интро.
3. `📘 Обучение`.
4. `⚔️ Исследовать`.
5. Победить Учебный огонёк.
6. Собрать трофей через любое действие.
7. Открыть `📜 Книга путей`.
8. Забрать `Пробуждение Пустого мастера`.
9. Нажать эту же inline-кнопку повторно, если она осталась в старом сообщении.
10. Убедиться, что повтор не даёт вторую награду.
11. Надеть первую руну.
12. Открыть `📜 Книга путей` снова.
13. Забрать `Первый знак`, если готов.
14. Проверить главное меню: кнопка книги не мешает боевому flow.

Что смотреть глазами:

- не слишком ли длинное intro для VK;
- не повторяется ли `руна руна`;
- не выглядит ли квестовый экран как административный список;
- все ли награды пишутся по-русски;
- понятно ли, что делать дальше;
- не теряется ли несобранная послебоевая добыча из-за квестов.

---

## 5. Проверки перед коммитом

Минимальный gate для кода:

```bash
npm run typecheck
npm test
npm run build
npm run content:validate
```

Для игровых flow:

```bash
npm run release:local-playtest
```

Перед релизным продвижением:

```bash
npm run release:preflight
npm run release:school-evidence
npm run release:evidence
```

Если менялась Prisma schema:

```bash
npm run db:generate
```

---

## 6. Архитектурные правила для продолжения

- Новые квесты сначала добавлять в `quest-definitions.ts`, если их прогресс выводится из `PlayerState`.
- Если квест требует истории действий, сначала решить, где живёт persisted marker.
- Не добавлять новую таблицу, пока ledger/read-model честно закрывают задачу.
- Не тащить VK-представление в domain/application.
- Не тащить Prisma в quest domain.
- Не писать квестовые награды напрямую из handler.
- Не обходить exact-once rails.
- Тексты квестов держать в `questMessages.ts` и definition story/objective.
- Общие formatter'ы наград держать в `message-formatting.ts`.
- Если появляется повторяющийся progress resolver, выделить маленький helper в quest domain.
- Каждый новый vertical slice должен иметь хотя бы один smoke/unit test.

---

## 7. Что пока не делать

- Не делать daily quests.
- Не делать сезонные награды.
- Не делать streak rewards.
- Не делать магазин наград квестов.
- Не делать случайные квесты.
- Не делать branching сюжет без persistence.
- Не делать отдельную `PlayerQuestState` до появления реального состояния, которое нельзя вывести.
- Не расширять intro в длинную новеллу при каждом `start`; повторный вход должен оставаться recap, а не повторным прологом.

---

## 8. Следующий полезный шаг

Рекомендуемый следующий шаг:

```text
Evidence pass for school novice elite flow
```

Содержимое:

- пройти school novice elite flow хотя бы одной школы до runtime-события `school_novice_elite_encounter_started`;
- обновить `docs/testing/school-path-evidence-report.md`;
- обновить `docs/testing/release-evidence-report.md`;
- после появления runtime evidence решить, нужен ли persisted marker для более точных школьных квестов.

Почему это следующий шаг: кодовые срезы закрыты, но релизный evidence пока честно говорит, что школьный novice elite flow не доказан runtime-логами.
