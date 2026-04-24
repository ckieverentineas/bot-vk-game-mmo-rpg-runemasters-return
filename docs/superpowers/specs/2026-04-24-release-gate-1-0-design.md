# Release Gate 1.0 Design

## Цель

Собрать один локальный `release:gate`, который последовательно прогоняет технические проверки, playtest, evidence и preflight, а затем честно отвечает: 1.0 можно отдавать игрокам без сопровождения или релиз нужно остановить.

Gate не должен маскировать недоказанные места общим `warn`. Все evidence-сигналы делятся на `blocker`, `manual_decision` и `info`.

## Команда

Добавить npm-скрипт:

```bash
npm run release:gate
```

Он запускает строго в таком порядке:

1. `npm run db:generate`
2. `npm run db:deploy`
3. `npm run check`
4. `npm run release:local-playtest`
5. `npm run release:school-evidence`
6. `npm run release:evidence`
7. `npm run release:preflight`

Каждый шаг наследует stdout/stderr. При первом non-zero коде сценарий останавливается и возвращает ошибку.

## Evidence Severity

`release:evidence` должен строить список findings:

- `blocker` — реально блокирует 1.0 и всегда валит `release:gate`.
- `manual_decision` — не валит gate только при явном release-owner решении.
- `info` — пояснение методики или ограничения выборки, gate не валит.

Примеры `blocker`:

- нет базового school runtime evidence;
- нет ключевого school payoff;
- найден duplicate reward;
- найдено `insufficient_evidence`;
- content validation сообщает critical error;
- обязательный release-документ отсутствует или пуст.

Примеры `manual_decision`:

- return recap follow-up proxy не доказан текущим окном, но release-owner принял это как не блокирующее 1.0;
- ручной live-smoke по конкретной ветке заменён local handler evidence с явной подписью.

Примеры `info`:

- evidence использует lightweight proxy;
- окно отчёта мало;
- метрика не является session-level stitching.

## Manual Decisions

Добавить явный реестр ручных решений:

```text
docs/release/manual-decisions.json
```

Формат записи:

```json
{
  "id": "return-recap-follow-up-proxy",
  "owner": "release-owner",
  "date": "2026-04-24",
  "decision": "accepted_for_1_0",
  "reason": "Риск не блокирует первый публичный локальный релиз.",
  "followUp": "Вернуть follow-up proxy в следующий evidence slice."
}
```

`release:gate` валится, если finding уровня `manual_decision` не имеет принятой записи.

## Документы 1.0

Добавить короткие release-документы:

- `docs/testing/manual-playtest-1-0.md`
- `docs/release/economy-source-sink-1-0.md`
- `docs/release/release-doc-sync-1-0.md`
- `docs/release/manual-decisions.json`

### Manual Playtest Guide

`docs/testing/manual-playtest-1-0.md` — один короткий документ без внутренних слов. Формат: “нажми -> ожидай”.

Обязательные разделы:

1. Первый запуск
2. Исследование
3. Бой
4. Поражение и восстановление
5. Награды
6. Руны
7. Бестиарий
8. Квесты
9. Алхимия и мастерская
10. Пати
11. Экономика

Документ не должен использовать внутренние слова вроде `payload`, `stateKey`, `GameLog`, `handler`, `ledger`, `telemetry`.

### Economy Source/Sink

`docs/release/economy-source-sink-1-0.md` отвечает не идеальной математикой, а честным баланс-вопросом:

- игрок не получает бесконечный ресурс;
- игрок не упирается в пустоту в первые 30 минут.

Обязательная таблица:

```markdown
| Контур | Источники | Стоки | Ограничитель | Риск | Вывод для 1.0 |
| --- | --- | --- | --- | --- | --- |
```

Обязательные контуры:

- квесты;
- daily trace;
- бой/трофеи;
- расходники;
- руны;
- мастерская.

### README / CHANGELOG / PLAN Sync

`docs/release/release-doc-sync-1-0.md` фиксирует проверяемый контракт между `README.md`, `CHANGELOG.md` и `PLAN.md`.

Обязательные блоки:

- что 1.0 обещает;
- что уже сделано;
- что остаётся после релиза;
- какие команды запускать.

Canonical gate sequence в этом документе должен совпадать с `release:gate`.

## Gate Document Rules

`release:gate` проверяет:

- обязательные release-документы существуют;
- файлы не пустые;
- нет красных маркеров: `TODO`, `TBD`, `FIXME`, `insufficient_evidence`, `Not covered`, `не проверено`, `не закрыто`, `релиз не готов`, `warn и ладно`;
- manual playtest guide не содержит внутренних слов;
- economy source/sink содержит все обязательные контуры;
- doc-sync содержит все обязательные блоки и команды;
- README/CHANGELOG/PLAN не расходятся с canonical gate sequence.

Проверка docs не должна сканировать все исторические product/review документы, чтобы старые заметки не ломали релиз. Scope проверки:

- `README.md`
- `CHANGELOG.md`
- `PLAN.md`
- `RELEASE_CHECKLIST.md`
- `ARCHITECTURE.md`
- `docs/testing/manual-playtest-1-0.md`
- `docs/testing/release-evidence-report.md`
- `docs/testing/school-path-evidence-report.md`
- `docs/release/economy-source-sink-1-0.md`
- `docs/release/release-doc-sync-1-0.md`
- `docs/release/manual-decisions.json`

## Implementation Shape

Добавить чистую библиотеку:

```text
src/tooling/release/release-gate-lib.ts
```

Ответственность:

- описать ordered release steps;
- классифицировать evidence result;
- читать и валидировать manual decisions;
- проверять release-документы;
- собирать итоговый gate report.

Добавить CLI:

```text
src/tooling/release/release-gate.ts
```

Ответственность:

- запускать npm-команды по порядку;
- останавливать gate на первом падении;
- после evidence/preflight выполнять строгие release assertions;
- печатать короткую сводку: шаг, статус, причина отказа.

## Tests

Добавить unit-тесты на `release-gate-lib`:

- порядок команд ровно соответствует gate sequence;
- non-zero step блокирует дальнейший сценарий;
- `blocker` валит gate;
- `manual_decision` без записи валит gate;
- `manual_decision` с записью проходит;
- `info` не валит gate;
- red marker в release-docs валит gate;
- internal word в manual playtest валит gate;
- отсутствующий economy-контур валит gate;
- расхождение команды в README/CHANGELOG/PLAN валит gate.

CLI проверяется smoke-тестом без реального запуска npm-команд через injectable runner.

## Границы

В этот slice не входит:

- новая CI-интеграция;
- полноценный баланс-симулятор экономики;
- автоматическое прохождение ручного playtest;
- семантический AI-анализ противоречий в документах.

Gate должен быть строгим, но простым: явный контракт, явные документы, явные blocker/manual/info решения.
