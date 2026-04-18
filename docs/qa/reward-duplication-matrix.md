# Reward Duplication Matrix v1

Phase 1 документирует critical paths, где повторная команда, retry транспорта или race между запросами не должны дублировать прогресс, валюту или предметы.

| Flow | Duplicate / retry trigger | Canonical guard | Expected second-attempt behavior | Automated coverage |
|---|---|---|---|---|
| `Battle finalize` | повторный `атака` / retry после победы / recovery race | `BattleSession.actionRevision` + `status = ACTIVE` + unique `RewardLedgerRecord.ledgerKey` | вернуть canonical persisted battle/result, не начислять награду повторно | `PrismaGameRepository.concurrency.test.ts` |
| `Battle save` | два действия из одного и того же snapshot | `BattleSession.actionRevision` compare-and-swap | stale branch не перезаписывает бой, игрок получает latest battle state | `PrismaGameRepository.concurrency.test.ts` |
| `Create battle` | двойной `исследовать` / duplicate transport delivery | reuse existing `ACTIVE` battle + fallback cleanup | обе ветки получают один и тот же active battle id | `PrismaGameRepository.test.ts`, `PrismaGameRepository.concurrency.test.ts` |
| `Craft rune` | двойное создание при одном бюджете осколков | guarded `updateMany` на shard spend | один craft проходит, второй получает `not_enough_shards` | `PrismaGameRepository.test.ts`, `PrismaGameRepository.concurrency.test.ts` |
| `Reroll rune stat` | двойной reroll при одном осколке | guarded `updateMany` на shard spend | один reroll проходит, второй получает `not_enough_shards` | `PrismaGameRepository.test.ts`, `PrismaGameRepository.concurrency.test.ts` |
| `Destroy rune` | двойное распыление одной и той же руны | guarded `deleteMany` по `runeId + playerId` | один refund проходит, второй получает `rune_not_found` | `PrismaGameRepository.test.ts`, `PrismaGameRepository.concurrency.test.ts` |

## Notes

- matrix фиксирует shipped behavior для **critical one-budget flows**;
- reward-affecting RNG authority для craft / reroll / victory drop теперь должна идти через `GameRandom` и canonical persisted outcome, а не через transport-owned reroll;
- stale battle branch дополнительно пишет `battle_stale_action_rejected` в `GameLog`, чтобы support и QA могли отличать anti-race rejection от data corruption;
- full RNG authority и broader multi-budget dedupe остаются следующими задачами roadmap.
