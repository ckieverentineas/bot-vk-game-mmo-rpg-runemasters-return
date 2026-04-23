# Bestiary Progression Design

## Scope

This design replaces the current bestiary list with a two-level progression flow:

- location overview pages with up to five locations at once;
- a location detail screen with enemies, discovery state, trophy state, kill counts, and hunt rewards;
- exact-once rewards for first location discovery and enemy kill milestones.

This spec intentionally does not cover co-op PvE, item durability, blueprint crafting, or school mastery screens. Those systems can connect to bestiary rewards later, but they are separate designs.

## Product Goal

The bestiary should feel like a readable map of world knowledge, not a dense dump of every enemy. A player should understand:

- which locations are already open;
- what reward each newly opened location gives;
- what needs to be explored next;
- which enemies were seen in a selected location;
- what enemy drops are known;
- how close the player is to hunt milestones for specific enemies.

## Location Overview

The `📖 Бестиарий` command opens a location overview. The overview shows at most five locations per page.

Each location row shows:

- order number on the current page;
- open or locked state;
- location name;
- level range;
- first-discovery reward status;
- compact progress for discovered enemies, revealed trophy drops, and total victories in that location.

Open locations are selectable. Locked locations are visible but cannot be opened.

Example:

```text
📖 Бестиарий

1. ✅ Порог Инициации · ур. 0
   Открытие: ✨ +1 сияние получено
   Следы: 1/1 · трофеи: 1/1 · охота: 3 победы

2. ✅ Тёмный лес · ур. 1-15
   Открытие: ✨ +2 сияния получено сейчас
   Следы: 4/10 · трофеи: 2/10 · охота: 18 побед

3. 🔒 Забытые пещеры · ур. 16-35
   Открытие: ✨ +3 сияния
   Откроется с исследования ур. 16
```

## Location Unlocking

A location is open when the player's `highestLocationLevel` is greater than or equal to the biome `minLevel`.

The first locked location should show its unlock requirement. Later locked locations may still be listed, but must stay compact and avoid exposing enemy details.

The overview must not list all enemies for all locations. Enemy details belong only to the selected location screen.

## First-Discovery Rewards

Opening a location grants a real one-time reward. The primary reward is `✨ Сияние`.

Initial reward amounts:

| Location tier | Reward |
| --- | --- |
| `initium` | `✨ +1 сияние` |
| `dark-forest` | `✨ +2 сияния` |
| `forgotten-caves` | `✨ +3 сияния` |
| `cursed-citadel` | `✨ +4 сияния` |
| `abyss` | `✨ +5 сияния` |

The reward must be exact-once through `RewardLedgerRecord`.

Ledger identity:

```text
sourceType: BESTIARY_LOCATION_DISCOVERY
ledgerKey: bestiary_location:<playerId>:<biomeCode>
sourceId: <biomeCode>
```

When an open location has no applied discovery ledger, the bestiary flow should apply the reward and return the updated player state. If the ledger already exists, the bestiary only reports that the reward was received.

Future extensions may add small location-themed materials, blueprint drops, or rare repair components where they are product-appropriate. They must use the same exact-once reward contract.

## Location Detail

Selecting an open location opens a detail screen for that location.

The screen shows:

- location name and level range;
- compact location progress;
- enemies in that location;
- per-enemy discovery state;
- per-enemy trophy drop reveal state;
- per-enemy victory count;
- nearest hunt milestone reward.

Example:

```text
📍 Тёмный лес

Прогресс: следы 4/10 · трофеи 2/10 · охота 18 побед

1. ✅ Синий слизень
   Побед: 7
   Добыча: +1 трава · +1 кожа
   Охота: 5/10 убийств · дальше: ✨ +1 сияние

2. ✅ Лесной волк
   Побед: 2
   Добыча скрыта до первого обработанного трофея
   Охота: 2/5 убийств · дальше: кожа и кость

3. ❔ ???
   След ещё не встречен
```

Unknown enemies must not reveal name, stats, tactical profile, loot, rune chance, or milestone flavor. They may show only that an undiscovered trace exists.

## Enemy Discovery And Trophy Reveal

Enemy discovery keeps the existing rule:

- an enemy is discovered after the first recorded encounter;
- tactical profile appears only after discovery.

Drop reveal keeps the existing rule:

- drops and rune chance appear only after the first applied trophy reward for that enemy.

The detail screen may show victory count for discovered enemies. Unknown enemies should not expose kill progress under their real identity.

## Kill Milestone Rewards

Enemy kill milestones are separate from location discovery rewards.

Initial milestone thresholds:

| Threshold | Reward style |
| --- | --- |
| `1` victory | record completion or small dust/material reward |
| `5` victories | `✨ +1 сияние` or location material |
| `10` victories | stronger material bundle or future blueprint |
| `25` victories | future rare blueprint or rare repair component |

Milestone rewards must be exact-once through `RewardLedgerRecord`.

Ledger identity:

```text
sourceType: BESTIARY_ENEMY_KILL_MILESTONE
ledgerKey: bestiary_kill:<playerId>:<enemyCode>:<threshold>
sourceId: <enemyCode>:<threshold>
```

Victory counts should be derived from persisted battle/reward records where possible. Avoid adding a new enemy progress table in the first slice unless the existing data cannot answer the question reliably.

## Commands And Navigation

The overview keeps page navigation:

- `бестиарий страница <n>`;
- previous and next page buttons when needed.

The overview adds location selection commands for open locations:

- `бестиарий локация <biomeCode>`.

The location detail screen includes:

- back to bestiary overview;
- page navigation only if enemy lists later need pagination;
- main menu.

Locked location selection should return a friendly message with the unlock requirement and the bestiary overview keyboard.

## UX Boundaries

Bestiary is responsible for:

- locations;
- enemies;
- discovery;
- trophy reveal;
- hunt counts;
- bestiary rewards.

Bestiary must not show full school mastery milestones, full rune explanations, or broad character progression. Main menu, battle result, and rune screens should keep at most one compact next-goal line. Full mastery detail belongs in profile or a future `📜 Мастерство` screen.

## Data Flow

The application flow should:

1. Load the player by `vkId`.
2. Load bestiary discovery data from battles and applied trophy rewards.
3. Resolve open locations from `highestLocationLevel`.
4. Apply missing first-discovery rewards for open locations.
5. Build an overview or selected-location read model.
6. Render VK message and keyboard from that read model.

Location reward application must be idempotent. Reopening the bestiary must not duplicate `radiance`.

## Testing

Add tests before implementation for:

- location overview shows no more than five locations;
- locked locations do not reveal enemies;
- open locations are determined from `highestLocationLevel`;
- first open location discovery grants `radiance` once;
- reopening bestiary does not duplicate the location reward;
- selecting an open location shows enemies for that location only;
- selecting a locked location returns the unlock requirement;
- enemy detail hides unknown enemies and unrevealed drops;
- enemy victory counts and nearest milestone are shown;
- kill milestone rewards are exact-once;
- VK keyboards include location selection commands only for open locations.

## Implementation Order

1. Extend bestiary domain read models for location overview and location detail.
2. Add exact-once location discovery reward contract and repository method.
3. Update `GetBestiary` or split it into overview/detail use cases.
4. Add location selection commands and keyboard buttons.
5. Update presenters.
6. Add kill-count read model.
7. Add kill milestone reward contract and claim/application logic.
8. Update docs and release evidence after the first working slice.
