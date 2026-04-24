# Release Doc Sync 1.0

Этот документ связывает README, CHANGELOG, PLAN и RELEASE_CHECKLIST в один короткий release contract.

## Что 1.0 обещает

- Игрок может начать без сопровождения: первый запуск, исследование, бой, добыча и следующий шаг читаются из VK-экранов.
- Бой показывает угрозу, лучший ответ и запасной ответ, а Прорицание и бестиарий улучшают чтение врага.
- Алхимия, мастерская, руны, трофеи, квесты и пати имеют рабочий ранний контур без новой большой системы.
- Локальный release gate останавливает 1.0 при критических evidence и content ошибках.

## Что уже сделано

- `README.md` описывает текущий runtime и команды запуска.
- `CHANGELOG.md` хранит shipped-историю и новый R8 release gate slice.
- `PLAN.md` держит ближайший порядок работ и то, что остаётся за пределами 1.0.
- `RELEASE_CHECKLIST.md` переводит релиз в один локальный сценарий и ручной playtest.
- `docs/testing/manual-playtest-1-0.md` даёт короткий путь "нажми -> ожидай".
- `docs/release/economy-source-sink-1-0.md` фиксирует источники и стоки экономики.

## Что остаётся после релиза

- Полноценное дерево мастерства: очки, узлы, unlock rules, баланс, миграции и UI.
- Большой общий сундук пати вместо текущей отдельной награды каждому участнику.
- Глубокие ветки крафта, торговли, PvP и сезонных долгих целей.
- Дальнейший контент мира поверх текущих малых сцен, врагов и глав.

## Какие команды запускать

```bash
npm run db:generate
npm run db:deploy
npm run check
npm run release:local-playtest
npm run release:school-evidence
npm run release:evidence
npm run release:preflight
npm run release:gate
```

`npm run release:gate` запускает последовательность выше и затем проверяет evidence findings, manual release-owner decisions и релизные документы.
