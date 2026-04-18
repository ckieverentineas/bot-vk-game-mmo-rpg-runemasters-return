# Release Checklist

## Локальная поставка

Используйте этот чек-лист перед каждым релизом или крупной поставкой контента.

1. Обновить рабочую ветку и убедиться, что релизные документы синхронизированы:
   - `README.md`
   - `CHANGELOG.md`
   - `PLAN.md`
   - `ARCHITECTURE.md`, если менялись архитектурные границы
2. Установить зависимости на чистом окружении или убедиться, что lock-файл актуален:
   - `npm ci`
3. Сгенерировать Prisma client:
   - `npm run db:generate`
4. Прогнать единый технический пайплайн:
   - `npm run check`
5. Проверить релизный статус и версию:
   - `npm run release:status`
6. Прогнать релизный preflight:
   - `npm run release:preflight`
7. Проверить, что changelog и release summary отражают пользовательские изменения.
8. Если менялись reward-bearing или battle-mutation rails, сверить:
   - `docs/platform/retry-handling-rules.md`
   - `docs/platform/rng-authority-rules.md`
   - `docs/platform/persistence-versioning-rules.md`
   - `docs/qa/reward-duplication-matrix.md`
   - `docs/testing/concurrency-critical-use-cases.md`
9. Если менялись onboarding / return / economy decision flows, синхронизировать `docs/telemetry/telemetry-plan.md`.
10. Если менялись content package contracts или validator expectations, синхронизировать `docs/content/content-pipeline-plan.md` и `docs/content/validator-scope.md`.
11. Если менялся player-facing combat/rune UX, вручную пройти smoke-путь:
    - регистрация → учебный бой;
    - welcome/tutorial copy явно объясняет путь `базовая атака -> первая руна -> школа рун`;
    - tutorial reward → открыть руны → надеть первую активную руну → применить рунное действие в бою;
    - завершённый бой показывает `🎯 Следующая цель`, а не только механический возврат к кнопке;
    - existing-player `начать` / `пропустить обучение` / `в приключения` показывают короткий return recap без давления и without-FOMO phrasing;
    - в следующем бою пережить телеграфируемый тяжёлый удар через `защиту`;
   - отдельно проверить бой против врага с guard-break intent: `защита` не должна выглядеть правильным ответом на этот телеграф;
   - отдельно проверить, что стартовые школы реально различаются: Пламя давит сильнее, Твердь усиливает защиту, Прорицание лучше наказывает телеграфы;
   - новый бой после победы;
   - rune hub: page navigation, slot selection, equip, craft, reroll, destroy.

## CI-зеркало

GitHub Actions workflow `/.github/workflows/ci.yml` повторяет релизный минимум автоматически:

1. `npm ci`
2. `npm run db:generate`
3. `npm run check`
4. `npm run release:preflight`

Если CI не проходит, релиз не считается готовым.

## Минимальный критерий готовности

- все команды из чек-листа завершились успешно;
- контентная валидация зелёная;
- school ↔ archetype content wiring не имеет drift и проходит через `content:validate`;
- регрессионные тесты не находят дублей наград, отрицательных остатков инвентаря и повторного создания активного боя;
- critical concurrency lane не находит stale overwrite, duplicate reward apply и double-spend на battle/rune hot paths;
- versioned battle/loadout/reward contracts имеют compatibility fixtures и безопасный fallback policy;
- telemetry plan обновлён, если менялись onboarding clarity, return recap, economy signals или exploit-sensitive flows;
- content pipeline plan и validator scope обновлены, если менялись content package expectations;
- rune hub позволяет выбрать нужную руну без one-by-one browsing через page/slot flow;
- ранний бой остаётся читаемым и не выглядит как guaranteed loss для нового персонажа;
- рунное действие корректно тратит ману, уходит в откат и переживает re-entry без рассинхрона;
- `защита` и enemy intent не создают stale-state рассинхрон и понятны игроку по battle UI;
- оба enemy intent (`тяжёлый удар` и `guard-break`) различимы по UI и реально ведут к разным правильным ответам игрока;
- документация обновлена;
- версия из `npm run release:status` соответствует changelog-записи.
