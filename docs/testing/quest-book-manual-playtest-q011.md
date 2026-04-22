# Quest Book Manual Playtest Note Q-011

- Date: `2026-04-22 22:21:40 +10:00`
- Evidence source: local handler transcript from `npm run release:local-playtest`.
- Scope: human-readable review of `Книга путей` open, claim and replay behavior.
- UX/code changes in this commit: none.

## Result

`Книга путей` is visible in the local first-session path. The book can be opened after the tutorial reward, `Пробуждение Пустого мастера` can be claimed once, and replaying the same payload returns an already-closed entry without adding another reward.

This run is a local manual review of the generated transcript, not a live external VK bot pass. It is enough to document the current handler-level behavior, but a release owner may still request a live bot smoke pass before production release.

## Scenario Checklist

| Step | Expected check | Observed result |
| --- | --- | --- |
| 1-2 | New player reads intro. | Passed in both `legacy-text` and `payload` scenarios. |
| 3-6 | Tutorial, first battle and trophy collection complete. | Passed; the first trophy was collected through `извлечь эссенцию`. |
| 7 | Open `Книга путей`. | Passed; transcript shows `📜 Книга путей` and the quest book screen after the first trophy. |
| 8 | Claim `Пробуждение Пустого мастера`. | Passed; transcript shows `📜 Запись закрыта` and `В сумке: +5 пыли · +1 обычный осколок`. |
| 9-10 | Replay the same inline claim without a second reward. | Passed in the `payload` scenario; transcript shows `📜 Запись уже закрыта` and `Новая добыча не добавлялась`. |
| 11 | Equip the first rune. | Passed; transcript shows the first rune equipped and `Стиль Пламени закреплён`. |
| 12-13 | Open the book again and claim `Первый знак`, if ready. | Not covered by the current local playtest transcript; keep this for a later live/manual pass or a narrow extension. |
| 14 | Confirm the book does not block the main battle flow. | Passed at handler level; the run continued into rune hub, profile, and later school trial battles. |

## Evidence Snapshot

- `legacy-text` summary: `questBookReplyCount = 2`, `questRewardClaimReplyCount = 1`, `questRewardReplaySafe = null`.
- `payload` summary: `questBookReplyCount = 3`, `questRewardClaimReplyCount = 2`, `questRewardReplaySafe = true`.
- `payload` telemetry counts: `quest_book_opened = 1`, `quest_reward_claimed = 1`, `quest_reward_replayed = 1`.
- No active battle or pending reward remained open at the end of either scenario.

## Notes For Next Pass

- A true live VK pass should repeat the same old inline button after claim to confirm transport-level replay behavior outside the local handler.
- If Q-012 changes copy density, re-check that the quest book still reads like a chapter of the path rather than an administrative list.
- If Q-013 adds more quest chapters, extend the transcript path after first rune equip to cover `Первый знак` or explicitly mark why that claim is not ready.
