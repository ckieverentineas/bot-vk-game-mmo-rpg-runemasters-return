# PLAN — Runemasters Return

> Живой план текущего продукта. История уже сделанных изменений живёт в `CHANGELOG.md`; этот файл не должен превращаться в кладбище закрытых чекбоксов.

## Источники правды

- `docs/product/1-0-release-charter.md` — обещание 1.0, out-of-scope и ethical retention boundaries.
- `docs/product/deep-progression-rpg-vision.md` — дальняя vision-рамка, не committed scope.
- `ARCHITECTURE.md` — границы модулей, persistence/runtime contracts и replay-safety rails.
- `RELEASE_CHECKLIST.md` — что проверять перед крупной поставкой.
- `CHANGELOG.md` — история shipped-изменений и release notes.
- `docs/reviews/*` — decision snapshots. Старые support-slot review оставлены только как superseded references для истории.

## Текущие продуктовые решения

- 1.0 остаётся `PvE-first`, `schools-first` и без mandatory PvP.
- FOMO, guilt UX, pay-for-power, exclusive power windows и attendance pressure не допускаются.
- Основной CTA маршрута — `⚔️ Исследовать`. Исследование может дать standalone PvE-событие или встречу с врагом.
- Бой больше не начинается мгновенно из исследования: сначала игрок видит врага, понимает угрозу и выбирает `⚔️ В бой` или `💨 Отступить`.
- Шанс отступления считается от ловкости и даёт нейтральный исход `FLED`, без наград и без штрафного давления.
- После завершённого боя игрок возвращается в общий exploration loop через `⚔️ Исследовать`, а не в отдельную кнопку “Новый бой”.
- Мастера испытаний — только FOMO-safe PvE framing: они объясняют сцену, школу и tactical ask, но не раздают силу, не ставят таймеры и не являются live-ops системой.
- Рунная сборка стартует с двух равноправных слотов. Каждая надетая руна работает полностью: статы, пассивы и активное действие, если оно есть.
- Player-facing support-slot модель вырезана. Будущие 3+ слоты допустимы только как progression payoff через уровни, очки и ветку мастера.
- Rune hub работает в два шага: список по 5 рун на странице, затем карточка выбранной руны со статами, пассивами, активными навыками и действиями.
- `Надеть` автоматически использует первый свободный слот; игроку не нужно выбирать слот, пока это не станет реально нужным для продвинутой сборки.
- Мана медленно восстанавливается внутри боя при возврате хода игроку. Долговременная HP/мана attrition между боями отложена до полноценной rest/recovery экономики.
- Рост персонажа строится вокруг школ, mastery, рун и будущей ветки мастера, а не вокруг legacy stat allocation.

## Текущий фокус

Довести текущий PvE vertical slice до состояния, где игрок без внешних объяснений понимает:

- что он сейчас исследует;
- почему перед ним именно эта встреча или событие;
- чем отличается `В бой` от `Отступить`;
- что дала новая руна, знак школы или печать школы;
- какой следующий шаг полезен, но не навязан давлением.

## Ближайшие шаги

1. Проверить playtest-сценарий `исследовать -> событие/встреча -> бой/отступление -> результат -> исследовать` на читаемость и отсутствие “меня просто бросило в бой”.
2. Дотянуть battle/exploration copy: события игрока, ответ врага, реген маны, FLED и victory/defeat должны читаться как одна последовательность.
3. Укрепить rune hub как рабочий инструмент сборки: 5 рун на странице, понятные статусы `надета`, подробная карточка, чистые действия без support-терминов.
4. Спроектировать ветку мастера: очки за уровни, meaningful perks, открытие 3+ рунных слотов и ограничения без FOMO/pay-for-power.
5. Прежде чем включать долговременную attrition, отдельно спроектировать recovery/rest loop, pre-battle UI состояния, баланс ранних школ и exploit review.
6. Расширить school-first PvE content: события, enemies, miniboss pressure points и targeted rewards для всех четырёх стартовых школ.
7. Прогнать release evidence и ручной playtest по onboarding, school payoff, encounter choice, rune UX и post-session next goal.

## Отложено или вырезано

- Player-facing support-slot / passive-only second rune model.
- Отдельная кнопка `Проверить школу` как обязательный режим; школьная проверка должна жить внутри `Исследовать`.
- Post-battle `Новый бой`, который обходит exploration resolver.
- Real-time PvP, open PvP, ganking и mandatory PvP.
- Social/PvP/live-ops scope до доказанного core PvE loop.
- Free player market, auction-house economy и guild-war scale competition.
- Daily chores, hard streaks, absence punishment и power-exclusive limited events.
- Долговременная attrition без честной recovery/rest системы.
- Глубокая crafting-игра как отдельный продукт внутри продукта до доказанного early/mid PvE loop.

## Правило обновления

- Новое поведение игрока обновляет `README.md`, `CHANGELOG.md`, `PLAN.md` и при необходимости `ARCHITECTURE.md` / `RELEASE_CHECKLIST.md`.
- `PLAN.md` хранит только текущую карту решений и ближайший порядок работ. Закрытые детали уходят в `CHANGELOG.md`.
- Старый review-документ не должен спорить с текущим runtime. Если решение отменено, документ помечается `superseded` и остаётся только как историческая ссылка.
- Любой новый scope, который меняет economy, rewards, persistence, replay-safety или retention pressure, сначала проходит product/tech/exploit review.
