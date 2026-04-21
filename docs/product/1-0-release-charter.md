# 1.0 Release Charter

## Status

- Status: `approved v1`
- Approval date: `2026-04-19`
- Primary owner: `Producer / Product`
- Review owners: `Game Design`, `Gameplay / Platform`, `Content / UX`, `QA / Release`

Этот документ — source of truth для **обещания релиза 1.0**, явного **out-of-scope** и продуктовых red lines.

- Даты, execution checkpoints и delivery status живут в `PLAN.md`.
- Технические контракты живут в `ARCHITECTURE.md` и `docs/platform/*`.
- Gate snapshots живут в `docs/reviews/*`.

## 1.0 Promise

Runemasters Return 1.0 — это **PvE-first social build-RPG** для коротких, но осмысленных сессий, где игрок:

- осваивает **школы рун** как главную build-ось;
- исследует мир через PvE-события и встречи, где бой начинается после понятного player choice, а не как внезапный технический переход;
- читает намерения врага и отвечает не только цифрами, но и решениями;
- растёт через **расширение сборки**, а не через голую инфляцию силы;
- возвращается ради новых целей, mastery и выраженного стиля боя, а не из-за давления или страха потери.

## Product pillars for 1.0

- **PvE-first** — core progression опирается на PvE;
- **Schools first** — школа рун остаётся главной identity-осью;
- **Exploration first** — следующий шаг игрока идёт через `Исследовать`, где возможны события, встречи, бой или отступление;
- **Basic attack is evergreen** — базовая атака не превращается в мусорную кнопку;
- **Two full rune slots** — стартовая сборка держит две равноправные руны без player-facing support-slot модели;
- **Rarity expands loadout breadth** — редкость расширяет варианты сборки, а не ломает баланс x2 цифрами;
- **Ethical retention only** — возврат строится на curiosity, mastery, belonging и expression.

## Explicit out-of-scope for 1.0

В 1.0 **не обещаем**:

- real-time PvP;
- open PvP / ganking;
- mandatory PvP для core progression;
- свободную торговлю, player market и auction-house economy;
- guild-war scale synchronous social competition;
- hard attendance loops, punitive streak systems и absence punishment;
- exclusive power windows и другие FOMO power structures;
- pay-for-power или любые monetization paths, которые дают игровую силу за деньги;
- launch breadth, которая размывает school readability вместо её усиления.

Дополнение по PvP boundary:

- optional async PvP не входит в locked Vertical Slice и не считается committed scope для 1.0 без отдельного evidence review после slice proof.

## Ethical retention charter

### Allowed

- возвращать игрока через ясные next goals;
- мотивировать через mastery, build expression и понятный chase;
- использовать recap и school-driven hints для быстрого возврата в контекст;
- усиливать любопытство и ощущение прогресса без наказания за паузы.

### Forbidden

- hard streak resets;
- absence punishment;
- guilt / panic / FOMO copy;
- mandatory PvP как gate для core progression;
- exclusive power windows;
- pressure patterns, где лучший ответ игрока — приходить чаще, а не играть умнее.

## Governance baseline

Для 1.0 этим charter'ом утверждается governance baseline из `PLAN.md`: живой план хранит текущие решения, ближайший порядок работ, cut/defer list и правило обновления документов.

Минимальное правило:

- любое расширение обещания 1.0 требует явного `Producer / Product` sign-off;
- любое widening scope, которое конфликтует с этим charter, должно идти через `cut/defer review`, а не тихо добавляться в committed order.

## Change control

Feature proposal для 1.0 проходит charter только если:

1. усиливает `PvE-first social build-RPG`, а не уводит продукт в другой жанровый центр;
2. не ломает school readability и не размывает core build fantasy;
3. не конфликтует с ethical retention rules;
4. не требует молча вернуть в scope то, что уже вынесено в explicit out-of-scope.

Если хотя бы один пункт не проходит, default decision для 1.0 — `defer` или `cut`.

## Linked evidence

- `PLAN.md`
- `README.md`
- `docs/reviews/phase-1-exit-gate.md`
