# Reward Duplication Matrix v1

Phase 1 документирует critical paths, где повторная команда, retry транспорта или race между запросами не должны дублировать прогресс, валюту или предметы.

| Flow | Duplicate / retry trigger | Canonical guard | Expected second-attempt behavior | Automated coverage |
|---|---|---|---|---|
| `Battle finalize` | повторный `атака` / retry после победы / recovery race | `BattleSession.actionRevision` + `status = ACTIVE` + unique `RewardLedgerRecord.ledgerKey` | вернуть canonical persisted battle/result, не начислять награду повторно | `PrismaGameRepository.concurrency.test.ts` |
| `Quest reward claim` | повторный inline-claim, replay старой кнопки или parallel claim одного `questCode` | unique `RewardLedgerRecord.ledgerKey = quest_reward:<playerId>:<questCode>` + `sourceType = QUEST_REWARD` | первый claim применяет награду, replay возвращает уже закрытую запись без второго reward delta | `ClaimQuestReward.test.ts`, `PrismaGameRepository.test.ts`, `release-evidence.test.ts` |
| `Battle save` | два действия из одного и того же snapshot | `BattleSession.actionRevision` compare-and-swap | stale branch не перезаписывает бой, игрок получает latest battle state | `PrismaGameRepository.concurrency.test.ts` |
| `Create battle` | двойной `исследовать` / duplicate transport delivery | reuse existing `ACTIVE` battle + fallback cleanup | обе ветки получают один и тот же active battle id | `PrismaGameRepository.test.ts`, `PrismaGameRepository.concurrency.test.ts` |
| `Craft rune` | двойное создание при одном бюджете осколков | guarded `updateMany` на shard spend | один craft проходит, второй получает `not_enough_shards` | `PrismaGameRepository.test.ts`, `PrismaGameRepository.concurrency.test.ts` |
| `Craft rune (same intent)` | duplicate VK retry или legacy text replay при достаточном бюджете | `CommandIntentRecord` + stored `resultSnapshot` | duplicate reply возвращает canonical crafted result без второго spend | `PrismaGameRepository.test.ts`, `PrismaGameRepository.concurrency.test.ts`, `gameHandler.smoke.test.ts`, `commandRouter.test.ts` |
| `Reroll rune stat` | двойной reroll при одном осколке | guarded `updateMany` на shard spend | один reroll проходит, второй получает `not_enough_shards` | `PrismaGameRepository.test.ts`, `PrismaGameRepository.concurrency.test.ts` |
| `Reroll rune stat (same intent)` | duplicate VK retry или legacy text replay при достаточном бюджете | `CommandIntentRecord` + stored `resultSnapshot` | duplicate reply возвращает canonical reroll result без второго spend | `PrismaGameRepository.concurrency.test.ts`, `gameHandler.smoke.test.ts`, `commandRouter.test.ts` |
| `Destroy rune` | двойное распыление одной и той же руны | guarded `deleteMany` по `runeId + playerId` | один refund проходит, второй получает `rune_not_found` | `PrismaGameRepository.test.ts`, `PrismaGameRepository.concurrency.test.ts` |
| `Destroy rune (same intent)` | duplicate VK retry или legacy text replay после первого refund | `CommandIntentRecord` + stored `resultSnapshot` | duplicate reply возвращает canonical destroy result без второго refund | `PrismaGameRepository.concurrency.test.ts`, `gameHandler.smoke.test.ts`, `commandRouter.test.ts` |

## Notes

- matrix фиксирует shipped behavior для **critical one-budget flows**;
- quest reward claim считается reward-bearing flow: replay должен быть player-visible и exact-once, а не silent duplicate grant;
- reward-affecting RNG authority для craft / reroll / victory drop теперь должна идти через `GameRandom` и canonical persisted outcome, а не через transport-owned reroll;
- keyboard intent receipts и server-owned legacy text intents теперь закрывают replay-abuse для multi-budget rune mutations;
- stale battle branch дополнительно пишет `battle_stale_action_rejected` в `GameLog`, чтобы support и QA могли отличать anti-race rejection от data corruption;
- full RNG authority и broader multi-budget dedupe остаются следующими задачами roadmap.
