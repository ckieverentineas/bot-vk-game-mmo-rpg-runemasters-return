# Production Handoff Runbook

Этот runbook фиксирует минимальную ручную процедуру для production handoff. Он не добавляет deploy automation и опирается только на уже существующие файлы, команды и runtime-поведение проекта.

## Source Of Truth

- Runtime entrypoint: `src/index.ts`.
- Production command after build: `npm start`, which runs `node dist/index.js`.
- Development command: `npm run dev`.
- Environment example: `.env.example`.
- Local environment file: `.env`.
- Prisma schema: `prisma/schema.prisma`.
- SQLite backups directory used by the repo: `prisma/backups/`.
- Application logs go to process stdout/stderr through `src/utils/logger.ts`; the app does not write a dedicated log file.

## Environment

Production must have a local `.env` in the repository root. Do not commit it.

Minimum required values:

```env
VK_TOKEN=your_vk_group_token_here
VK_GROUP_ID=
DATABASE_URL="file:./dev.db"
```

`VK_GROUP_ID` can stay empty when the token allows the bot to detect the group id. `DATABASE_URL` is consumed by Prisma from `prisma/schema.prisma`; relative SQLite paths are resolved from the Prisma schema directory, not from the shell current directory. With the example value `file:./dev.db`, the database file is `prisma/dev.db`.

Before handoff, record the exact production `DATABASE_URL` value in the private ops note for the host. Never paste tokens or private `.env` values into git.

## Preflight

Run from the repository root:

```bash
git status --short --branch
npm ci
npm run db:generate
npm run check
npm run release:preflight
```

If `npm run db:generate` fails on Windows with an `EPERM` around Prisma query engine files, stop the running bot and close other Node processes that may hold the Prisma engine DLL, then run the command again.

## SQLite Backup

Make a filesystem backup before any schema/data operation and before changing the running build.

Default example path:

```powershell
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item -LiteralPath "prisma\dev.db" -Destination "prisma\backups\dev-$stamp.db"
```

If production `DATABASE_URL` points somewhere else, copy that resolved SQLite file instead. Keep backups under `prisma/backups/` unless the host has an external backup location.

Quick backup check:

```powershell
Get-ChildItem -LiteralPath "prisma\backups" | Sort-Object LastWriteTime -Descending | Select-Object -First 5
```

## Start

Use the already defined build and start commands:

```bash
npm run build
npm start
```

Successful startup writes to stdout/stderr through `Logger`, including the startup line from `src/index.ts` and the message that the bot is listening for updates.

## Stop

Stop the process with the host process manager or send `SIGINT` / `SIGTERM`. The entrypoint handles both signals, stops VK updates, disconnects the database, and exits.

For a manual foreground run, use `Ctrl+C`.

On Windows, if a stuck `node.exe` keeps Prisma files locked, inspect and stop the process using the host's normal process tools before running Prisma commands.

## Logs

Read logs from the terminal, service wrapper, or process manager that runs `npm start`.

The current logger writes:

- `INFO` and `DEBUG` to stdout;
- `WARN` to stderr via `console.warn`;
- `ERROR` to stderr via `console.error`.

The repository does not define a log directory. `*.log` files are ignored by git, so ad hoc captured logs must stay outside source control unless a release note explicitly needs a short excerpt.

## Rollback

Rollback is manual and should preserve both code and data state.

1. Stop the running bot.
2. Back up the current SQLite database before touching it.
3. Check out the known good commit, tag, or branch.
4. Run:

```bash
npm ci
npm run db:generate
npm run build
```

5. If rollback also requires restoring data, copy the chosen backup over the active SQLite file while the bot is stopped.
6. Start again with:

```bash
npm start
```

7. Check stdout/stderr and run the evidence commands that are safe for the environment:

```bash
npm run release:status
npm run release:preflight
```

Do not run `npm run db:push -- --accept-data-loss` against production unless there is a separate release-owner decision and a fresh database backup.

## Handoff Checklist

- `.env` exists on the host and contains production values.
- The exact production `DATABASE_URL` is known privately.
- A fresh SQLite backup exists and is readable.
- `npm run db:generate`, `npm run check`, and `npm run release:preflight` have passed in the handoff environment.
- The bot can be started with `npm start`.
- The operator knows where stdout/stderr are captured.
- The rollback commit and database backup are named before the change starts.
