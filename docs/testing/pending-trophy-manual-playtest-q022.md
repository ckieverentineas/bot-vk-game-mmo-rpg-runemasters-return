# Pending Trophy Manual Playtest Note Q-022

- Date: `2026-04-22 23:27:46 +10:00`
- Evidence source: `npm run release:local-playtest` plus a targeted local handler replay pass.
- Scope: pending trophy reward collection and replay of the same old payload/state key.
- Runtime changes in this commit: none.

## Result

Pending trophy collection is replay-safe at local handler level. The first collect applied one trophy action and moved the reward ledger to `APPLIED`; replaying the same old trophy payload did not add inventory, currency, rune shards or skill progress.

This note is not a live external VK bot pass. It closes the manual local evidence gap for the core pending trophy collect/replay rail, while broader release evidence and live-bot smoke can still be requested by the release owner.

## Release Local Playtest Snapshot

`npm run release:local-playtest` passed.

| Scenario | Synthetic vkId | Victories | Trophy collection replies | Active battle after run | Pending reward after run | Suspicious replies |
| --- | --- | ---: | ---: | --- | --- | ---: |
| `legacy-text` | `910947621` | 5 | 5 | `false` | `false` | 0 |
| `payload` | `910174316` | 5 | 5 | `false` | `false` | 0 |

The local playtest proves that the first-session and four school evidence paths can create and collect pending trophy rewards. Its summary does not replay an old trophy payload, so a targeted replay pass was run separately.

## Targeted Replay Pass

Targeted local handler pass:

- synthetic vkId: `911897314`;
- ledger key: `battle-victory:cmoa37kj500077zpbfbtp0vu1`;
- action code: `extract_essence`;
- action label: `✨ Извлечь эссенцию`;
- replay input: the same payload command and the same `stateKey` as the first collect.

Observed first collect:

- reply opened with `✨ Извлечь эссенцию`;
- ledger status became `APPLIED`;
- selected action stored in ledger snapshot: `extract_essence`;
- applied inventory delta: `+1 essence`;
- applied skill-up: `gathering.essence_extraction` from `0` to `1`;
- pending reward was no longer open after collection.

Observed replay:

```text
Этого трофея уже нет на поле. Вернитесь к текущей добыче.
```

Replay checks:

| Check | Observed |
| --- | --- |
| Resources changed on first collect | `true` |
| Skills changed on first collect | `true` |
| Resources unchanged after replay | `true` |
| Skills unchanged after replay | `true` |
| Pending reward open after replay | `false` |
| Ledger status after replay | `APPLIED` |

## Verdict

Passed for the core pending trophy rail:

- first collect applies the selected trophy action once;
- reward ledger keeps the selected action and applied result;
- replay of the old trophy payload is safe and does not duplicate reward or skill progress.

Remaining scope for later passes:

- live VK transport replay;
- replay coverage for every trophy action variant;
- release evidence aggregation for trophy reward events, if the release gate starts requiring that explicitly.
