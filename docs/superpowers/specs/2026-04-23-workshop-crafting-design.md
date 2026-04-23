# Workshop Crafting Design

## Scope

This design introduces a separate `🛠 Мастерская` progression loop for non-rune crafting.

The first implementation slice covers:

- a dedicated workshop entry point outside the rune altar;
- consumable blueprints for one-time crafts;
- crafted equipment with durability;
- rare repair components;
- reward hooks for combat drops, quests, bestiary rewards, and future non-combat events.

This spec intentionally keeps co-op PvE, full item set balance, marketplace purchases, and advanced profession trees out of the first slice.

## Product Goal

Loot should create decisions, not only accumulate in inventory. A player should understand:

- which materials and blueprints they own;
- what can be crafted right now;
- what is missing for a desired craft;
- why crafted items are different from runes;
- when an item is wearing down;
- when spending a rare repair component is worth it.

## Altar And Workshop Boundary

`🕯 Алтарь` is only for runes:

- rune creation;
- rune equipment;
- rune rerolling;
- rune destruction;
- school-facing rune progression.

`🛠 Мастерская` is for material things:

- blueprints;
- equipment;
- repair;
- future tools, consumables, and quest crafts.

The current pill alchemy should leave the altar. In the first workshop slice, existing pill recipes are replaced by equipment blueprints instead of becoming permanent raw stat upgrades. Temporary consumable alchemy can return later as a separate workshop category.

## Bonus Philosophy

Rune bonuses and crafted item bonuses must not be identical copies.

Runes provide:

- school identity;
- active abilities;
- passive magical effects;
- build-defining stat direction;
- combat rhythm.

Crafted items provide:

- physical equipment;
- durability and repair pressure;
- location or enemy utility;
- loot and gathering improvements;
- tactical modifiers that are narrower than rune identity;
- temporary or conditional benefits.

Examples:

| Source | Good payoff | Avoid |
| --- | --- | --- |
| Rune | `АТК +2`, fire active skill, school mastery | plain duplicate item `АТК +2` |
| Crafted sword | damage against beasts, durability, skinning bonus | permanent global attack growth |
| Crafted cloak | reduced swamp damage, ambush resistance | permanent global health growth |
| Crafted tool | better trophy extraction, loses durability on use | passive rune-like school bonus |

## Workshop Categories

The workshop opens as a category hub.

Initial categories:

- `📜 Чертежи` shows owned consumable blueprints and whether each craft is ready.
- `⚒ Снаряжение` shows crafted items, equipped state, durability, and break risk.
- `🧰 Ремонт` shows damaged items and available repair components.

Future categories may add `🧪 Расходники` and `🎒 Материалы`, but the first slice should avoid a noisy inventory wall.

## Blueprints

A blueprint is a one-time craft permission. It is consumed when the craft succeeds.

Blueprint properties:

- code;
- title;
- rarity;
- craft category;
- material cost;
- result item definition;
- source tags for reward tables.

Initial rarities:

- `COMMON`;
- `UNCOMMON`;
- `RARE`;
- `EPIC`;
- `LEGENDARY`;
- `MYTHIC`.

Blueprints should be stored as player-owned stacks by code. Most blueprints stack, even though each craft consumes one copy.

Blueprint sources:

- trophy reward drops after battle;
- quest rewards;
- bestiary kill milestones;
- location discovery rewards where thematically appropriate;
- future non-combat events.

## Crafted Items

Crafted equipment is separate from runes.

Initial item slots should stay small:

- `weapon`;
- `armor`;
- `trinket`;
- `tool`.

Each item has:

- unique id;
- item definition code;
- title;
- rarity;
- slot;
- durability current and max;
- status: `ACTIVE`, `BROKEN`, or `DESTROYED`;
- optional equipped state;
- creation timestamp.

First-slice item effects should be descriptive and narrow. The implementation can begin by rendering effects and storing item state before every effect is wired into battle math. Effects that do affect gameplay must be explicit and tested.

Initial item examples:

| Item | Slot | Role |
| --- | --- | --- |
| `Охотничий тесак` | weapon | better beast trophy output |
| `Кожаная куртка следопыта` | armor | small physical mitigation with durability |
| `Слизевой амулет` | trinket | resistance against slime enemies |
| `Набор свежевателя` | tool | improves skinning-style trophy actions and loses durability on trophy use |

## Durability

Equipment has durability and can break.

Durability loss rules for the first slice:

- equipped weapon and armor lose durability after completed battles;
- equipped tools lose durability when their matching trophy action is used;
- trinkets do not lose durability in the first slice. They become durable-decay items only when a specific tested trigger exists.

At `0` durability, an item status becomes `DESTROYED`. Destroyed items remain in persistence for history, but they are hidden from usable equipment, cannot be equipped, and cannot be repaired in the first slice.

The player-facing battle or trophy result should include one compact durability line only when something changed:

```text
🛠 Прочность: Охотничий тесак 11/14.
```

If an item breaks:

```text
🛠 Охотничий тесак разрушен.
```

## Repair

Repair uses ultra-rare components.

Initial repair resource:

- `repairCatalyst`, shown to the player as `Сердцевина ремонта`.

Repair behavior:

- repair restores one damaged item to max durability;
- repair cannot restore destroyed items in the first slice;
- repair components should be rare enough to make item decay meaningful.

Repair component sources:

- rare bestiary milestones;
- rare non-combat events;
- later premium-adjacent sources, if monetization is introduced carefully.

## Rewards

Reward payloads should support blueprint and repair drops without forcing every reward source to know workshop internals.

Extend reward modeling with optional fields:

- blueprint drops;
- repair component drops;
- crafted item drops only if a future event grants a finished item directly.

All exact-once rewards, such as quests and bestiary milestones, must keep exact-once ledger behavior.

Battle trophy drops may be repeatable, but pending trophy collection must remain single-choice and idempotent for each battle reward ledger.

## Data Model

The likely first-slice persistence additions are:

- `PlayerBlueprint` with `playerId`, `blueprintCode`, `quantity`, and `updatedAt`;
- `PlayerCraftedItem` with `id`, `playerId`, `itemCode`, `rarity`, `slot`, `durability`, `maxDurability`, `status`, `equipped`, and timestamps;
- one repair material field in inventory: `repairCatalyst`.

Because the current inventory is column-based, the first implementation should choose the smallest safe migration:

- add one `repairCatalyst` inventory column;
- use a dedicated blueprint table because blueprint codes are content-driven and should not become many inventory columns.

## Commands And Navigation

Main menu adds:

- `🛠 Мастерская`.

Workshop commands:

- open workshop hub;
- open blueprint category;
- open equipment category;
- open repair category;
- craft selected blueprint;
- equip or unequip crafted item;
- repair selected damaged item;
- return to main menu.

Craft and repair commands must use command intent state keys. State keys should include owned blueprint quantity, material cost, target item id, durability, and relevant inventory fields.

## UX Rules

Workshop screens should be quieter than the full inventory.

Blueprint list row:

```text
✅ Охотничий тесак · редкий чертёж x1
   Нужно: кожа 4, кость 2, металл 1
   Даёт: оружие, прочность 14/14, бонус к зверям
```

Locked or unaffordable row:

```text
· Слизевой амулет · необычный чертёж x1
  Не хватает: эссенция 1
```

Equipment list row:

```text
⚔ Охотничий тесак · 11/14 · надет
```

Repair list row:

```text
🧰 Охотничий тесак · 11/14 -> 14/14 · нужна Сердцевина ремонта x1
```

Main menu, battle result, runes, bestiary, and mastery should not show full workshop details. They may show one short next-step line when the player has a ready blueprint.

## Error Handling

The workshop must handle:

- missing player;
- stale craft button;
- missing blueprint;
- missing materials;
- stale repair target;
- destroyed item selected for repair;
- duplicate command retry;
- item already equipped or no longer owned.

Failures should return the relevant workshop screen with a short error header and fresh keyboard.

## Testing

Add tests before implementation for:

- main menu opens `🛠 Мастерская`;
- altar no longer shows non-rune crafting actions;
- workshop hub shows blueprint, equipment, and repair categories;
- blueprint list shows owned blueprints and missing materials;
- successful craft consumes one blueprint and materials;
- successful craft creates an item with max durability;
- duplicate craft command returns the canonical result once;
- stale craft command is rejected before spending resources;
- equipment list shows durability and equipped state;
- battle or trophy use reduces relevant item durability;
- item at zero durability is no longer usable;
- repair consumes one rare component and restores durability;
- repair cannot restore destroyed items in the first slice;
- quest and bestiary rewards can grant blueprints exactly once;
- repeatable battle/trophy drops can grant blueprints without exact-once quest semantics.

## Implementation Order

1. Add content definitions for blueprint and crafted item definitions.
2. Add persistence for owned blueprints and crafted items.
3. Extend reward payloads for blueprint and repair component grants.
4. Add workshop read models and use cases.
5. Add VK commands, keyboards, and presenters for the workshop hub.
6. Remove pill actions from the altar and replace the first visible non-rune crafts with equipment blueprints.
7. Implement blueprint crafting with command intent replay.
8. Add equipment viewing and equip or unequip flow.
9. Add durability loss for one narrow trigger, then expand only with tests.
10. Add repair flow.
11. Wire blueprint rewards into quests, bestiary milestones, and selected trophy rewards.

## First Slice Acceptance

The first slice is complete when:

- `🕯 Алтарь` is rune-only;
- `🛠 Мастерская` is visible from the main menu;
- players can view owned blueprints;
- players can craft at least one equipment item from a consumable blueprint;
- crafted equipment has durability;
- at least one gameplay action reduces durability;
- repair exists for damaged but not destroyed items;
- at least one exact-once reward source grants a blueprint;
- tests cover idempotency and stale commands.
