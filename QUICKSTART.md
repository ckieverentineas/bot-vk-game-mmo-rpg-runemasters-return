# Quickstart

## 1. Подготовить окружение

```bash
npm install
```

Для чистой проверки релиза используйте:

```bash
npm ci
```

## 2. Настроить `.env`

Скопируйте `.env.example` в `.env` и заполните минимум:

```env
VK_TOKEN=your_vk_group_token_here
# Optional. Можно оставить пустым, бот сам определит id группы.
VK_GROUP_ID=
DATABASE_URL="file:./dev.db"
```

Для SQLite путь `file:./dev.db` в Prisma считается относительно `prisma/schema.prisma`, поэтому база будет создана как `prisma/dev.db`.

## 3. Сгенерировать Prisma Client

```bash
npm run db:generate
```

На Windows команда может упасть с `EPERM`, если запущенный бот или другой `node.exe` держит Prisma engine DLL. В этом случае остановите бота, закройте лишние Node-процессы и повторите команду.

## 4. Поднять схему базы

Для локальной базы:

```bash
npm run db:push
```

Если старую локальную базу можно пересоздать:

```bash
npm run db:push -- --accept-data-loss
```

Production-базу не пересоздавайте без backup и отдельного migration/deploy решения.

## 5. Проверить стартовые данные

```bash
npm run db:seed
```

Сейчас seed не заливает биомы и шаблоны мобов в SQLite. Статический world/rune content живёт в `src/content/**`, а seed подтверждает, что контент валиден и база нужна только для изменяемого runtime state.

## 6. Прогнать проверки

```bash
npm run check
```

Команда запускает:

- `typecheck`
- `content:validate`
- `build`
- `test`

Если локальная среда блокирует Vitest/Vite через `spawn EPERM`, повторите проверку после закрытия лишних Node-процессов.

## 7. Запустить бота

Для разработки:

```bash
npm run dev
```

Для production-сборки:

```bash
npm run build
npm start
```

## Базовый сценарий игры

1. Написать `начать`.
2. Пройти обучение или нажать `пропустить обучение`.
3. Открыть `профиль`, чтобы увидеть героя, школы и текущий рост.
4. Открыть `руна` / `алтарь`, выбрать руну и надеть её.
5. Нажать `исследовать`.
6. Если появилась встреча, выбрать `в бой` или `отступить`.
7. В бою использовать `атака`, `защита`, `навык 1` или `навык 2`, если у надетой руны есть активное действие.
8. После результата вернуться к общему CTA `исследовать`.

## Релизные команды

```bash
npm run release:status
npm run release:summary
npm run release:school-evidence
npm run release:evidence
npm run release:preflight
```

Перед релизом сверяйтесь с `RELEASE_CHECKLIST.md`. Если `release:status` показывает `0.00` при существующей Git-истории, сначала исправьте Git safe-directory / release tooling, иначе версия недостоверна.

## Что важно помнить

- VK transport-слой команд централизован в `src/vk/commands/catalog.ts`.
- Клавиатуры собираются через `src/vk/keyboards/index.ts`.
- Игровая логика живёт в `src/modules/**`, а `src/vk/**` должен в основном маршрутизировать и презентовать.
- Статический контент живёт в `src/content/**`.
- Повторные клики и retry должны проходить через command-intent / reward-ledger rails без дублей наград и double spend.
- Изменения в пользовательском поведении должны обновлять `README.md`, `CHANGELOG.md`, `PLAN.md` и при необходимости `ARCHITECTURE.md` / `RELEASE_CHECKLIST.md`.
