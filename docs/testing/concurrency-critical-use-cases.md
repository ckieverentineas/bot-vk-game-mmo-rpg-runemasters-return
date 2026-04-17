# Concurrency Critical Use Cases v1

Эти сценарии обязательны для regression coverage перед любым Phase 1 / Vertical Slice изменением, которое трогает battle persistence, награды или рунные мутации.

## Mandatory cases

1. parallel `createBattle` на одного игрока не создаёт две активные сессии;
2. parallel `saveBattle` из одного revision не даёт stale branch перезаписать новый бой;
3. parallel `finalizeBattle` одной победы начисляет reward ровно один раз;
4. parallel `craftRune` при одном бюджете создаёт одну руну и не уводит shard balance в минус;
5. parallel `rerollRuneStat` при одном осколке тратит ресурс ровно один раз;
6. parallel `destroyRune` возвращает refund ровно один раз.

## CI expectation

- минимум mock-level regression coverage и one real Prisma-backed concurrency lane должны оставаться зелёными;
- новый reward-bearing flow не считается done, пока не добавлен в эту таблицу и в duplication matrix.
