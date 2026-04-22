# Action Progression OBT Tester Guide

- Date: `2026-04-22`
- Source: `docs/product/action-based-progression-and-trophy-loot.md`
- Scope: tester-facing guide for post-battle action progression, reward collection and replay safety.
- Runtime changes in this commit: none.

## Purpose

This guide gives an OBT tester a clear path for checking that trophy actions feel like real progression rather than decorative buttons. A valid pass proves three things:

1. choosing a trophy action changes the reward and the related skill;
2. the same pending reward can be collected only once;
3. replaying an old button returns the canonical result or a safe already-collected response without adding another reward.

## Current Playable Paths

| Path | Unlock condition | Expected action | Expected reward behavior | Expected skill behavior |
| --- | --- | --- | --- | --- |
| Fast collect | Any pending battle reward | `🎒 Забрать добычу` | Applies only the base battle reward. | No trophy skill progress. |
| Skinning | `enemy.kind = wolf` or `boar` | `🔪 Свежевать` / skinning variant | Adds the relevant trophy materials from the enemy loot table, such as `leather` and `bone`. | Grows `gathering.skinning`. |
| Reagent gathering | `enemy.kind = slime` | `🧪 Собрать слизь` | Adds slime/reagent materials such as `herb` and `essence`. | Grows `gathering.reagent_gathering`. |
| Essence extraction | `enemy.kind = spirit` or `mage` | `✨ Извлечь эссенцию` / essence variant | Adds essence-focused materials from the enemy loot table. | Grows `gathering.essence_extraction`. |
| Ember hidden trophy | Ember school equipped and `enemy.code = ash-seer` | `🔥 Вытянуть знак Пламени` | Shows a fixed pending preview with `+2 essence` before collection. | Grows `gathering.essence_extraction`. |
| Skinning threshold | `enemy.kind = wolf` and `gathering.skinning >= 10` | `🔪 Аккуратно снять шкуру` | Shows a fixed pending preview with `+3 leather`, `+1 bone`. | Grows `gathering.skinning`. |

The threshold action must be absent for the same enemy when `gathering.skinning < 10`. It should appear alongside the normal skinning action only after the threshold is reached.

## Recommended Test Pass

Use one tester account per pass and record the build commit, date, channel (`local handler`, `staging bot` or `live bot`) and any seeded state. A fresh account is best for the basic flow; a seeded account is acceptable for threshold checks if the seed is written down.

| Step | Tester action | Expected result |
| --- | --- | --- |
| 1 | Win a battle and stop on the post-battle trophy card. | A `PENDING` reward exists and the card offers trophy actions plus `🎒 Забрать добычу`. The reward is not applied until a collect action is chosen. |
| 2 | Choose `🎒 Забрать добычу` on one pending reward. | Base reward is applied once. No gathering skill line should be shown as new progress from this action. |
| 3 | Replay the same collect button or payload from step 2. | No second reward is granted. The response is the same canonical result or an already-collected message. |
| 4 | Win a wolf or boar battle and choose the skinning action. | The result includes base reward plus trophy materials, and `gathering.skinning` progress is visible through the player-facing rank/status copy. |
| 5 | Replay the old skinning button. | Inventory and skill do not increase a second time. |
| 6 | Win a slime battle and choose `🧪 Собрать слизь`. | The result includes slime/reagent materials and `gathering.reagent_gathering` progress. |
| 7 | Replay the old slime action. | No duplicate materials and no duplicate skill progress. |
| 8 | Win a spirit or mage battle and choose the essence action. | The result includes essence-focused materials and `gathering.essence_extraction` progress. |
| 9 | Replay the old essence action. | No duplicate materials and no duplicate skill progress. |
| 10 | With Ember equipped, win against `ash-seer`. | The trophy card includes `🔥 Вытянуть знак Пламени` and its pending reward preview shows `+2 essence`. |
| 11 | Collect the Ember hidden action, then replay the same button. | First collect applies the hidden action once; replay does not reroll or duplicate the reward. |
| 12 | With `gathering.skinning < 10`, win against a wolf. | `🔪 Аккуратно снять шкуру` is not visible. |
| 13 | With `gathering.skinning >= 10`, win against a wolf. | `🔪 Аккуратно снять шкуру` is visible and its pending reward preview shows `+3 leather`, `+1 bone`. |
| 14 | Collect `🔪 Аккуратно снять шкуру`, then replay the same button. | First collect applies the threshold action once; replay returns canonical or already-collected behavior without a second grant. |
| 15 | Leave a pending trophy card, then use `начать`, `исследовать` or `добыча` before collecting. | The player returns to the same unresolved pending reward instead of silently losing it or creating a new collectible reward. |

## What To Record

For each checked action, record:

- account alias or test player id;
- enemy code/kind;
- selected action label and action code, if visible in logs;
- reward text before and after collection;
- inventory-relevant deltas, especially materials;
- skill line shown to the player after collection;
- replay response from the old button or payload;
- whether navigation back to the pending card worked before collection.

The tester does not need exact internal skill points for a player-facing pass. Rank/status copy such as `Новичок свежевания · первые успехи` is enough unless the pass is explicitly a debug/evidence run.

## Pass And Fail Rules

Pass the slice if every checked action is reward-bearing, skill-relevant where expected, and replay-safe.

Fail the slice if any of these happen:

- `🎒 Забрать добычу` grants trophy skill progress;
- a trophy action grants materials but no related skill progress;
- replaying an old reward button grants any extra inventory, currency, rune shard or skill progress;
- a pending reward disappears before collection during normal navigation;
- `🔪 Аккуратно снять шкуру` appears below `gathering.skinning >= 10` or stays hidden at/above the threshold;
- the Ember hidden action appears without the Ember/`ash-seer` condition.

## Out Of Scope For This Pass

- action-based stat growth;
- hidden school pools beyond the first Ember / `ash-seer` slice;
- skill-threshold actions beyond `gathering.skinning >= 10` for wolf;
- broad balance tuning or drop-rate review;
- profile copy rewrites beyond confirming that skill progress is readable.
