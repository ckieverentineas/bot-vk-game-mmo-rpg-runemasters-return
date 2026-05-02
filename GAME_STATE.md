# Current Game State

Короткий снимок текущего состояния игры. Обновлять после значимых gameplay/content срезов.

## Completed

- Modular TypeScript/VK bot architecture with Prisma SQLite runtime state.
- First-session loop: onboarding, tutorial battle, first rune, rune equip, profile and return recap.
- Exploration loop: event or encounter, fight/flee choice, battle, trophy reward, next step.
- Combat core: attack, defence, enemy intent, active rune skills, mana, cooldowns, battle clarity.
- Four starter schools: Пламя, Твердь, Буря, Прорицание.
- Early school path for 4 schools: novice elite, aligned `UNUSUAL` sign, rune hub handoff, miniboss, `RARE` seal.
- Two starting rune slots with stats, passives and active actions.
- School mastery milestones and rare seal progression horizon.
- Pending trophy rewards with exact-once `PENDING -> APPLIED` reward ledger.
- Hidden trophy actions for 4 starter schools on novice enemies.
- Trophy skill thresholds for skinning, reagent gathering and essence extraction.
- Bestiary, Quest Book, Daily Trace, Workshop crafting/alchemy, party PvE and runic tavern threat board.
- Release tooling: status, summary, evidence, local playtest, preflight and gate.

## In Progress

- Midgame progression after first school seal.
- Deeper school-specific hidden trophy chains beyond the first novice enemy slice.
- Longer content pacing after early school loop.
- Economy tuning for dust, shards, materials, blueprint instances and radiance.
- Production handoff discipline around SQLite backup, migrations, logs and rollback.

## Known Issues

- Long-run retention after the first rare school seal is not yet proven by extended playtest.
- Deep doctrine trees, cross-school synergies and late rarity promises are deferred.
- Full release gate still depends on current DB migrations being applied before local playtest.
- Some evidence remains local/manual rather than production telemetry-backed.

## Next Priorities

1. Expand midgame content after first school seal.
2. Add deeper trophy chains per school without new persistence unless needed.
3. Strengthen retention loops without streak pressure, FOMO or pay-for-power.
4. Add more encounter and quest content for post-early-game pacing.
5. Keep `npm run check`, `release:local-playtest` and `release:preflight` green after each slice.
