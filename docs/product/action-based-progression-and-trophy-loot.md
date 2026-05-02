# Action-Based Progression and Trophy Loot

## Status

- Status: `committed design candidate`
- Purpose: зафиксировать гибридную систему послебоевой добычи, action-based прокачки, скрытого дропа и узких специализаций.
- Scope class: `post-release / OBT candidate`, внедрять маленькими replay-safe срезами.

Этот документ расширяет long-horizon vision из `docs/product/deep-progression-rpg-vision.md`, но не отменяет текущие релизные gates из `PLAN.md`, `RELEASE_CHECKLIST.md`, `docs/platform/rng-authority-rules.md` и `docs/qa/reward-duplication-matrix.md`.

Главное правило: **кнопка должна менять мир**. Декоративные `Собрать`-кнопки без реального эффекта не используются.

---

## 1. Product Intent

Runemasters Return должен ощущаться как игра, где персонаж растёт от того, что он реально делает:

- бьёт — становится сильнее в атаке;
- блокирует и переживает опасные удары — лучше держит защиту;
- использует рунные действия — глубже чувствует школу;
- свежует зверя — растит ремесленный навык и получает лучший звериный трофей;
- извлекает эссенцию из духа — растит мистическое извлечение;
- разбирает доспехи — растит разбор трофеев и металл;
- играет узкую школу/роль — открывает скрытые варианты добычи и действий.

Система должна создавать ощущение:

> Я не просто получаю уровень. Я выращиваю мастера, чьи навыки, школа, руны и решения открывают новые способы взаимодействовать с миром.

---

## 2. Core Loop

Базовый гибридный flow:

1. Игрок побеждает врага.
2. Бой создаёт `PENDING` reward record в базе.
3. Игрок получает отдельную послебоевую карточку с действиями.
4. Доступные действия зависят от:
   - `enemy.kind`;
   - биома;
   - elite/boss статуса;
   - школы экипированной руны;
   - рунных свойств;
   - навыков игрока;
   - будущих ролей / веток прокачки / специализаций.
5. Игрок выбирает одно действие.
6. Выбранное действие применяет базовую награду и action-specific reward.
7. Система делает skill/stat/school growth rolls.
8. Повтор той же кнопки возвращает canonical result без повторной награды.

Пока reward `PENDING`, игрок не должен потерять его:

- `начать` для существующего игрока показывает несобранную добычу;
- `исследовать` сначала возвращает к pending reward card;
- отдельная команда `добыча` / `награды` может открыть ожидающую добычу;
- старые кнопки должны безопасно отвечать `уже собрано` или возвращать replay-result.

---

## 3. Pending Reward Model

Используем существующий `RewardLedgerRecord` как основу exact-once reward rail.

Минимальное расширение смысла статусов:

```text
PENDING -> APPLIED
PENDING -> EXPIRED
APPLIED -> APPLIED replay
```

`entrySnapshot` должен хранить не только результат, но и доступные действия:

```json
{
  "version": 1,
  "source": {
    "type": "battle",
    "id": "battle-id"
  },
  "baseReward": {
    "experience": 14,
    "gold": 5,
    "shards": {
      "USUAL": 2
    },
    "droppedRune": null
  },
  "trophyActions": [
    {
      "code": "claim_all",
      "label": "🎒 Забрать добычу",
      "skillCodes": [],
      "visibleRewards": []
    },
    {
      "code": "skin_beast",
      "label": "🔪 Свежевать",
      "skillCodes": ["gathering.skinning"],
      "visibleRewards": ["leather", "bone"]
    }
  ],
  "selectedAction": null,
  "appliedResult": null
}
```

После выбора действия:

```json
{
  "selectedAction": "skin_beast",
  "appliedResult": {
    "baseRewardApplied": true,
    "inventoryDelta": {
      "usualShards": 2,
      "leather": 2,
      "bone": 1
    },
    "skillUps": [
      {
        "skillCode": "gathering.skinning",
        "before": 320,
        "after": 342
      }
    ],
    "statUps": [],
    "schoolUps": []
  }
}
```

---

## 4. Trophy Actions by Enemy Kind

Первый слой действий строится от `enemy.kind`.

| Enemy kind | Основная кнопка | Навык | Обычная добыча | Возможный скрытый дроп |
|---|---|---|---|---|
| `wolf` | `🔪 Свежевать` | `gathering.skinning` | `leather`, `bone` | цельная шкура, сухожилия, звериный знак |
| `boar` | `🔪 Снять шкуру и рог` | `gathering.skinning` | `leather`, `bone` | крепкий рог, грубая кожа |
| `slime` | `🧪 Собрать слизь` | `gathering.reagent_gathering` | `herb`, `essence` | слизевое ядро, мутный кристалл |
| `spirit` | `✨ Извлечь эссенцию` | `gathering.essence_extraction` | `essence` | духовный след, школьный знак |
| `mage` | `🔮 Разобрать фокус` | `gathering.essence_extraction` | `essence`, `crystal` | фокус, пепельный знак, знак предзнамений |
| `knight` | `⚒️ Разобрать доспех` | `gathering.reagent_gathering` | `metal`, `crystal`, `leather` | печать брони, осколок клинка |
| `goblin` | `🧰 Разобрать трофейное снаряжение` | `gathering.reagent_gathering` | `bone`, `metal`, `crystal` | карта тайника, ворованный осколок |
| `troll` | `⛏️ Сколоть пещерные наросты` | `gathering.reagent_gathering` | `bone`, `metal`, `crystal` | тяжёлая кость, рудный обломок |
| `lich` | `☠️ Рассеять филактерию` | `gathering.essence_extraction` | `essence`, `crystal` | мёртвая печать, фрагмент проклятия |
| `demon` | `🜏 Сковать бездновую искру` | `gathering.essence_extraction` | `essence`, `crystal` | бездновый жар, тёмный металл |
| `dragon` | `🐉 Снять драконью чешую` | `gathering.skinning` | `crystal`, `metal` | чешуя дракона, сердце пламени |

Для раннего vertical slice достаточно:

- `wolf` / `boar` -> `Свежевать`;
- `slime` -> `Собрать слизь`;
- `spirit` / `mage` -> `Извлечь эссенцию`;
- `knight`, `goblin`, `troll`, `lich`, `demon`, `dragon` -> по одному action-specific trophy действию на уже существующих enemy kind;
- первые threshold-срезы для `gathering.skinning`, `gathering.reagent_gathering` и `gathering.essence_extraction`.

---

## 5. Hidden Drop Access

Скрытый дроп — это не просто низкий шанс из общей таблицы. Это reward pool, который открывается условиями.

Источники доступа:

1. **Школа**  
   Экипированная школа открывает тематические действия и дроп.

2. **Руна**  
   Конкретная руна может открыть скрытый способ обработки трофея.

3. **Роль / дерево прокачки**  
   Будущие ветки дают доступ к узким профессиям и действиям.

4. **Навык**  
   Высокий навык открывает точные варианты обработки.

5. **Уровень / регион**  
   Более опасные биомы открывают материалы высокого tier.

6. **Состояние боя**  
   Иногда важно, как победили: блоком, добиванием, рунным действием, чтением намерения врага.

Пример hidden pool:

```json
{
  "code": "ember_ash_seer_hidden_pool",
  "visibleWhen": {
    "enemyCodes": ["ash-seer"],
    "equippedSchoolCodes": ["ember"]
  },
  "actions": [
    {
      "code": "draw_ember_sign",
      "label": "🔥 Вытянуть знак Пламени",
      "requiresSkill": null,
      "possibleRewards": ["ember_sign_rune", "essence"]
    }
  ]
}
```

Другой пример:

```json
{
  "code": "expert_skinning_wolf_pool",
  "visibleWhen": {
    "enemyKinds": ["wolf"],
    "minSkill": {
      "gathering.skinning": 1000
    }
  },
  "actions": [
    {
      "code": "precise_skinning",
      "label": "🔪 Аккуратно снять шкуру",
      "possibleRewards": ["perfect_hide", "sinew"]
    }
  ]
}
```

---

## 6. Specializations

Специализация должна открывать не только проценты, но и новые кнопки.

Пример роста `Свежевания`:

```text
0+    🔪 Свежевать
10+   🔪 Аккуратно снять шкуру
25+   🦴 Сохранить сухожилия
50+   🐾 Вырезать звериный знак
100+  🔮 Найти рунный след зверя
```

Пример роста `Извлечения эссенции`:

```text
0+    ✨ Извлечь эссенцию
10+   ✨ Стабилизировать остаток
25+   🔮 Вплести след в руну
50+   📜 Прочитать духовный отзвук
100+  🜂 Вытащить школьный знак
```

Специализация от дерева или роли может добавлять действия поверх навыка:

- Рунодел видит больше рунных следов.
- Охотник лучше свежует зверей.
- Авангард лучше разбирает доспехи и тяжёлые трофеи.
- Прорицатель видит скрытые знаки у духов, магов и личей.
- Школа Пламени умеет вытягивать жар/пепел.
- Школа Тверди лучше разбирает камень, металл, броню.
- Школа Бури ловит буревые следы и быстрые трофеи.
- Школа Прорицания читает предзнаменования и скрытые филактерии.

---

## 7. Action-Based Skill Growth

Каждое осмысленное действие может вызвать skill-up roll.

Принцип:

```text
Шанс роста = Base × Challenge × Relevance × Novelty × Success × Fatigue
```

Где:

- `Base` — базовая вероятность действия;
- `Challenge` — сложность цели относительно текущего навыка;
- `Relevance` — насколько действие подходит врагу/школе/ситуации;
- `Novelty` — защита от спама одного безопасного действия;
- `Success` — успешный контекст даёт больше;
- `Fatigue` — мягкое снижение при повторении.

Упрощённая первая формула:

```text
chance = clamp(baseChance * enemyDifficulty / max(1, skillValue), minChance, maxChance)
```

Для хранения лучше использовать integer points:

```text
diagnostic value = points / 100
320 points -> 3.20
342 points -> 3.42
```

Это позволяет давать маленький рост без floating-point шума.

Player-facing decision:

- профиль и обычные статусные экраны показывают ранг навыка, а не точное число вроде `3.42`;
- пример стабильной строки: `Свежевание: Новичок свежевания · первые успехи`;
- точные integer points остаются внутренним состоянием, debug/evidence detail и основой будущих threshold-правил;
- если экрану нужен прогресс до следующего ранга, он должен быть качественным (`первые успехи`, `уверенная практика`, `близко к следующему рангу`), без сырых `1/100`.

Правило diminishing returns:

- на низком навыке рост частый;
- на высоком навыке слабые враги почти не учат;
- опасные враги и редкие действия снова дают ощутимый шанс.

---

## 8. Action-Based Stat Growth

Статы могут расти аналогично навыкам, но только от значимых действий.

| Стат | Что может качать | Anti-abuse правило |
|---|---|---|
| `attack` | нанесение значимого урона, добивание, pressure-window | trivial enemies почти не дают рост |
| `defence` | блок, guard, переживание физического удара | царапины не считаются значимыми |
| `magicDefence` | переживание магического/духовного урона | слабая магия не фармится |
| `dexterity` | первый ход, отступление, быстрые враги | безопасное бегство не фармит бесконечно |
| `intelligence` | рунные действия, эссенция, магические трофеи | повтор одного low-tier действия режется |
| `health` | выживание после опасного боя | намеренное стояние под слабым уроном не работает |

Для ОBT это не первый coding slice. Сначала надо доказать post-battle skills, потом подключать статы.

---

## 9. Rune School Growth

Школа должна расти не только за факт победы с экипированной руной, а за поведение.

### Пламя

Рост от:

- давления;
- добивания просевшей цели;
- применения рунного действия Пламени;
- вытягивания жара, пепла, огненного сердца;
- побед над aligned enemy Пламени.

Скрытые действия:

- `🔥 Вытянуть искру`;
- `🔥 Собрать пепельный знак`;
- `🔥 Извлечь сердце пламени`.

### Твердь

Рост от:

- блоков;
- переживания тяжёлого удара;
- контратаки после guard;
- разбора брони, камня, металла;
- побед над aligned enemy Тверди.

Скрытые действия:

- `🪨 Снять каменную печать`;
- `⚙️ Разобрать тяжёлый доспех`;
- `🛡️ Закрепить знак стойкости`.

### Буря

Рост от:

- первого хода;
- темпа;
- быстрых добиваний;
- действий против быстрых врагов;
- ловли буревого следа.

Скрытые действия:

- `⚡ Поймать буревой след`;
- `🌪️ Снять знак скорости`;
- `⚡ Расщепить шквальную искру`.

### Прорицание

Рост от:

- правильной реакции на enemy intent;
- защиты от heavy strike;
- атаки вместо защиты при guard-break;
- чтения духовных, магических и мёртвых знаков.

Скрытые действия:

- `👁️ Прочитать предзнаменование`;
- `📜 Снять мёртвую печать`;
- `🔮 Вплести знак в руну`.

---

## 10. Player-Facing UX

После победы:

```text
🏁 Победа

Лесной волк повержен.
Можно забрать добычу быстро или обработать трофей.

Доступные действия:
🔪 Свежевать — кожа, кость, шанс роста свежевания.
🎒 Забрать добычу — только обычная награда боя.

[🔪 Свежевать]
[🎒 Забрать добычу]
[⚔️ Позже]
```

После выбора:

```text
🔪 Трофей обработан

Вы получили:
+14 опыта
+5 пыли
+2 обычных осколка
+2 кожа
+1 кость

Навык:
Свежевание: Новичок свежевания · первые успехи

[🔮 Руны]
[⚔️ Исследовать дальше]
```

Если открылся скрытый дроп:

```text
🔥 Вы заметили пепельный знак

Руна Пламени отозвалась на останки ведуньи.
Доступно особое действие.

[🔥 Вытянуть знак Пламени]
[✨ Извлечь эссенцию]
[🎒 Забрать добычу]
```

---

## 11. Safety and Anti-Exploit Rules

1. **Одна pending reward — одно выбранное действие.**  
   Игрок не может свежевать, потом ещё извлечь эссенцию, потом ещё забрать скрытый пул с той же победы.

2. **RNG решается до persistence или внутри атомарного collect.**  
   Повтор кнопки не reroll'ит результат.

3. **Replay всегда возвращает canonical result.**  
   Если награда уже собрана, повтор показывает тот же итог или безопасное сообщение.

4. **Trivial content режет рост.**  
   Слабые враги не должны бесконечно качать высокий навык.

5. **Нет наказания за отсутствие.**  
   Pending reward не должен быть FOMO-таймером. Если expiry появится, он должен быть техническим cleanup, а не способом отнять силу.

6. **Скрытый дроп не должен быть обязательным для каждого игрока.**  
   Узкая специализация даёт вкус и альтернативный путь, но не единственный способ прогресса.

7. **Профессии не должны превращаться в обязательные chores.**  
   Действие должно быть коротким, осмысленным и связанным с победой/контекстом.

---

## 12. Current Implementation Slice

Первый playable vertical slice уже собран маленькими replay-safe шагами:

- trophy action rewards моделируются отдельно от базовой победной награды;
- `PlayerSkill` и skill types существуют в persistence и домене;
- боевые навыки получили первый честный runtime-срез поверх battle action facts: `ATTACK` растит `combat.striking`, `DEFEND` растит `combat.guard`, активное рунное действие растит `rune.active_use`, а combat log остаётся только player-facing журналом;
- pending reward snapshot хранит доступные trophy actions и action-specific reward preview;
- победа создаёт `PENDING` reward ledger в базе;
- после победы игрок видит отдельную trophy card с доступными действиями;
- `начать`, `исследовать` и отдельная команда `добыча` возвращают к несобранной награде;
- выбранное trophy action собирается exact-once и переводит ledger в `APPLIED`;
- `claim_all` даёт быстрый безопасный сбор без skill progress;
- первый hidden school pool покрывает novice enemy-срез четырёх стартовых школ: `🔥 Вытянуть знак Пламени`, `🧱 Выбить печать Тверди`, `🌪️ Перехватить шквальный след` и `🔮 Считать предзнаменование` появляются только при matching equipped school в одном из двух слотов рун; reward preview фиксируется в pending snapshot и остаётся exact-once;
- первый skill-threshold unlock добавляет `🔪 Аккуратно снять шкуру` для `wolf`, если `gathering.skinning >= 10`; reward preview фиксируется в pending snapshot как +3 leather, +1 bone и рост `gathering.skinning`;
- reagent threshold добавляет `🧪 Отделить чистый реагент` для `slime`, если `gathering.reagent_gathering >= 10`; reward preview усиливает `essence` или `herb` и остаётся в том же pending snapshot;
- essence threshold добавляет `✨ Стабилизировать эссенцию` для `spirit` / `mage`, если `gathering.essence_extraction >= 10`; reward preview усиливает `essence`;
- action-specific enemy kind срезы уже покрывают `knight`, `goblin`, `troll`, `lich`, `demon` и `dragon` без новых таблиц и школ;
- bootstrap восстанавливает отсутствующие pending reward ledger-записи для уже завершённых победных боёв.

Что всё ещё не входит:

- глубокие hidden school pools за пределами первого novice enemy-среза;
- глубокие многоступенчатые threshold-лестницы за пределами первых срезов по `skinning`, `reagent_gathering` и `essence_extraction`;
- action-based stat growth;
- глубокая роль навыков в профиле, сборке и будущих unlock'ах.

---

## 13. Implementation Roadmap

1. Done: `feat: model trophy action rewards`
2. Done: `feat: add skill up chance resolver`
3. Done: `feat: add player skill types`
4. Done: `feat: persist player skills`
5. Done: `feat: add pending reward snapshot types`
6. Done: `feat: add pending reward ledger`
7. Done: `feat: create pending rewards after victory`
8. Done: `feat: collect pending reward with selected action`
9. Done: `feat: add claim all trophy action`
10. Done: `feat: recover pending rewards on start`
11. Done: `feat: show pending reward collection prompt after victory`
12. Done: `feat: return to pending reward from start and explore`
13. Done: `test: prevent duplicate trophy action rewards`
14. Done: `test: add local playtest for pending trophy reward`
15. Done: `feat: show skills in profile`
16. Done: `feat: add skinning skill growth depth`
17. Done: `feat: add reagent gathering skill growth depth`
18. Done: `feat: add essence extraction skill growth depth`
19. Done: `docs: define skill display style`
20. Done: `feat: add ember hidden trophy pool`
21. Done: `feat: expand novice hidden drop pools by school`
22. Done: `feat: unlock trophy action by skill threshold`
23. Done: `feat: expand trophy action skill thresholds`
24. Done: `feat: add trophy skill quality thresholds`
25. Later: `feat: connect rune school behavior to school growth`
26. Done: `feat: connect combat action facts to skill growth`
27. Later: `feat: connect combat behavior to stat growth`
28. Done: `docs: update OBT tester guide for action progression`

---

## 14. Product Decisions and Open Questions

Resolved:

1. Skill display style: player-facing profile/status/trophy-result copy uses rank labels and qualitative progress (`Новичок свежевания`, `первые успехи крепнут`), while exact points stay internal/debug/evidence-only.

Перед глубоким внедрением ещё надо решить:

1. Может ли игрок иметь несколько pending rewards или только одну активную?
2. Нужно ли действие `Позже`, если оно может запутать first-session flow?
3. Должны ли скрытые действия быть видимыми как `???`, или вообще не показываться без условия?
4. Нужны ли инструменты профессий: нож, сосуд, резец, рунный фокус?
5. Должны ли навыки влиять на шанс дропа сразу или сначала только на unlock кнопок?
6. Какой минимум этой системы нужен до ОБТ, а что лучше оставить post-OBT?
