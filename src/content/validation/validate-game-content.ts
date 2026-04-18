import { env } from '../../config/env';
import { gameBalance } from '../../config/game-balance';
import type { MaterialField, RuneRarity } from '../../shared/types/game';
import { abilitySeed, runeArchetypeSeed, schoolSeed, type AbilitySeedDefinition, type RuneArchetypeSeedDefinition, type SchoolSeedDefinition } from '../runes';
import { biomeSeed, mobSeed, type BiomeSeedDefinition, type MobTemplateSeedDefinition } from '../world';

export interface GameContentValidationIssue {
  readonly scope: string;
  readonly message: string;
}

export interface GameContentValidationReport {
  readonly isValid: boolean;
  readonly issues: readonly GameContentValidationIssue[];
}

export interface GameContentValidationInput {
  readonly biomes: readonly BiomeSeedDefinition[];
  readonly mobs: readonly MobTemplateSeedDefinition[];
  readonly schools: readonly SchoolSeedDefinition[];
  readonly abilities: readonly AbilitySeedDefinition[];
  readonly runeArchetypes: readonly RuneArchetypeSeedDefinition[];
  readonly worldBalance: typeof gameBalance.world;
  readonly runeBalance: typeof gameBalance.runes;
  readonly envGameConfig: typeof env.game;
}

const materialFields: readonly MaterialField[] = ['leather', 'bone', 'herb', 'essence', 'metal', 'crystal'];

const isNonEmptyString = (value: string): boolean => value.trim().length > 0;

const isNonNegativeInteger = (value: number): boolean => Number.isInteger(value) && value >= 0;

const isPositiveInteger = (value: number): boolean => Number.isInteger(value) && value > 0;

const isPositiveNumber = (value: number): boolean => Number.isFinite(value) && value > 0;

const pushIssue = (issues: GameContentValidationIssue[], scope: string, message: string): void => {
  issues.push({ scope, message });
};

const collectDuplicateValues = (values: readonly string[]): string[] => {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
};

const validateWorldBalance = (issues: GameContentValidationIssue[], worldBalance: typeof gameBalance.world): void => {
  if (worldBalance.minLocationLevel > worldBalance.maxLocationLevel) {
    pushIssue(issues, 'balance:world', 'Минимальный уровень мира не может быть больше максимального.');
  }

  if (worldBalance.introLocationLevel < worldBalance.minLocationLevel || worldBalance.introLocationLevel > worldBalance.maxLocationLevel) {
    pushIssue(issues, 'balance:world', 'Интро-уровень должен лежать внутри диапазона мира.');
  }

  if (worldBalance.minAdventureLocationLevel <= worldBalance.introLocationLevel) {
    pushIssue(issues, 'balance:world', 'Минимальный уровень приключений должен быть выше интро-уровня.');
  }

  if (worldBalance.minAdventureLocationLevel > worldBalance.maxLocationLevel) {
    pushIssue(issues, 'balance:world', 'Минимальный уровень приключений не может быть выше максимального уровня мира.');
  }

  const adaptiveDifficultyEntries = [
    ['combatPowerPerLevel', worldBalance.adaptiveDifficulty.combatPowerPerLevel],
    ['victoryStreakStep', worldBalance.adaptiveDifficulty.victoryStreakStep],
    ['maxVictoryStreakBonus', worldBalance.adaptiveDifficulty.maxVictoryStreakBonus],
    ['defeatStreakPenalty', worldBalance.adaptiveDifficulty.defeatStreakPenalty],
    ['maxDefeatStreakPenalty', worldBalance.adaptiveDifficulty.maxDefeatStreakPenalty],
  ] as const;

  adaptiveDifficultyEntries.forEach(([key, value]) => {
    if (!isPositiveInteger(value)) {
      pushIssue(issues, `balance:world.${key}`, 'Параметр адаптивной сложности должен быть положительным целым числом.');
    }
  });

  if (!isNonNegativeInteger(worldBalance.adaptiveDifficulty.combatPowerFloorOffset)) {
    pushIssue(issues, 'balance:world.combatPowerFloorOffset', 'Смещение combat power должно быть неотрицательным целым числом.');
  }
};

const validateBiomeSeed = (
  issues: GameContentValidationIssue[],
  biomes: readonly BiomeSeedDefinition[],
  worldBalance: typeof gameBalance.world,
): void => {
  if (biomes.length === 0) {
    pushIssue(issues, 'world:biomes', 'Нужно определить хотя бы один биом.');
    return;
  }

  collectDuplicateValues(biomes.map(({ code }) => code)).forEach((duplicateCode) => {
    pushIssue(issues, 'world:biomes', `Найден дублирующийся biome code: ${duplicateCode}.`);
  });

  const sortedBiomes = [...biomes].sort((left, right) => left.minLevel - right.minLevel);

  sortedBiomes.forEach((biome) => {
    const scope = `biome:${biome.code}`;

    if (!isNonEmptyString(biome.code) || !isNonEmptyString(biome.name) || !isNonEmptyString(biome.description)) {
      pushIssue(issues, scope, 'Код, имя и описание биома должны быть заполнены.');
    }

    if (!isNonNegativeInteger(biome.minLevel) || !isNonNegativeInteger(biome.maxLevel)) {
      pushIssue(issues, scope, 'Границы уровней биома должны быть неотрицательными целыми числами.');
    }

    if (biome.minLevel > biome.maxLevel) {
      pushIssue(issues, scope, 'Минимальный уровень биома не может быть больше максимального.');
    }
  });

  const firstBiome = sortedBiomes[0];
  if (firstBiome && firstBiome.minLevel !== worldBalance.minLocationLevel) {
    pushIssue(issues, 'world:biomes', `Покрытие биомов должно начинаться с уровня ${worldBalance.minLocationLevel}.`);
  }

  const lastBiome = sortedBiomes[sortedBiomes.length - 1];
  if (lastBiome && lastBiome.maxLevel !== worldBalance.maxLocationLevel) {
    pushIssue(issues, 'world:biomes', `Покрытие биомов должно заканчиваться на уровне ${worldBalance.maxLocationLevel}.`);
  }

  for (let index = 1; index < sortedBiomes.length; index += 1) {
    const previousBiome = sortedBiomes[index - 1];
    const currentBiome = sortedBiomes[index];

    if (!previousBiome || !currentBiome) {
      continue;
    }

    if (currentBiome.minLevel <= previousBiome.maxLevel) {
      pushIssue(
        issues,
        'world:biomes',
        `Биомы ${previousBiome.code} и ${currentBiome.code} пересекаются по диапазону уровней.`,
      );
    }

    if (currentBiome.minLevel > previousBiome.maxLevel + 1) {
      pushIssue(
        issues,
        'world:biomes',
        `Между биомами ${previousBiome.code} и ${currentBiome.code} есть разрыв по уровням.`,
      );
    }
  }

  const introCoverage = biomes.filter((biome) => (
    biome.minLevel <= worldBalance.introLocationLevel && biome.maxLevel >= worldBalance.introLocationLevel
  ));

  if (introCoverage.length !== 1) {
    pushIssue(issues, 'world:biomes', 'Интро-уровень должен покрываться ровно одним биомом.');
  }
};

const validateLootTable = (issues: GameContentValidationIssue[], scope: string, lootTable: string): void => {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(lootTable);
  } catch {
    pushIssue(issues, scope, 'Loot table должен быть валидным JSON-объектом.');
    return;
  }

  if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
    pushIssue(issues, scope, 'Loot table должен сериализоваться в объект.');
    return;
  }

  for (const [key, value] of Object.entries(parsedValue)) {
    if (!materialFields.includes(key as MaterialField)) {
      pushIssue(issues, scope, `Loot table содержит неизвестный материал: ${key}.`);
      continue;
    }

    if (typeof value !== 'number' || !isPositiveInteger(value)) {
      pushIssue(issues, scope, `Количество ресурса ${key} должно быть положительным целым числом.`);
    }
  }
};

const validateMobSeed = (
  issues: GameContentValidationIssue[],
  biomes: readonly BiomeSeedDefinition[],
  mobs: readonly MobTemplateSeedDefinition[],
): void => {
  if (mobs.length === 0) {
    pushIssue(issues, 'world:mobs', 'Нужно определить хотя бы одного моба.');
    return;
  }

  collectDuplicateValues(mobs.map(({ code }) => code)).forEach((duplicateCode) => {
    pushIssue(issues, 'world:mobs', `Найден дублирующийся mob code: ${duplicateCode}.`);
  });

  const biomeCodes = new Set(biomes.map(({ code }) => code));

  mobs.forEach((mob) => {
    const scope = `mob:${mob.code}`;

    if (!biomeCodes.has(mob.biomeCode)) {
      pushIssue(issues, scope, `Моб ссылается на неизвестный биом: ${mob.biomeCode}.`);
    }

    if (!isNonEmptyString(mob.code) || !isNonEmptyString(mob.name) || !isNonEmptyString(mob.kind) || !isNonEmptyString(mob.attackText)) {
      pushIssue(issues, scope, 'Код, имя, вид и attackText моба должны быть заполнены.');
    }

    if (!isPositiveInteger(mob.baseHealth)) {
      pushIssue(issues, scope, 'baseHealth должен быть положительным целым числом.');
    }

    const nonNegativeIntegerEntries = [
      ['baseAttack', mob.baseAttack],
      ['baseDefence', mob.baseDefence],
      ['baseMagicDefence', mob.baseMagicDefence],
      ['baseDexterity', mob.baseDexterity],
      ['baseIntelligence', mob.baseIntelligence],
      ['baseExperience', mob.baseExperience],
      ['baseGold', mob.baseGold],
    ] as const;

    nonNegativeIntegerEntries.forEach(([key, value]) => {
      if (!isNonNegativeInteger(value)) {
        pushIssue(issues, `${scope}.${key}`, `${key} должен быть неотрицательным целым числом.`);
      }
    });

    const scaleEntries = [
      ['healthScale', mob.healthScale],
      ['attackScale', mob.attackScale],
      ['defenceScale', mob.defenceScale],
      ['magicDefenceScale', mob.magicDefenceScale],
      ['dexterityScale', mob.dexterityScale],
      ['intelligenceScale', mob.intelligenceScale],
    ] as const;

    scaleEntries.forEach(([key, value]) => {
      if (!isPositiveNumber(value) || value < 1) {
        pushIssue(issues, `${scope}.${key}`, `${key} должен быть числом не меньше 1.`);
      }
    });

    if (!Number.isFinite(mob.runeDropChance) || mob.runeDropChance < 0 || mob.runeDropChance > 100) {
      pushIssue(issues, `${scope}.runeDropChance`, 'Шанс выпадения руны должен лежать в диапазоне от 0 до 100.');
    }

    if (mob.isBoss && !mob.isElite) {
      pushIssue(issues, scope, 'Босс должен быть помечен как elite-враг.');
    }

    validateLootTable(issues, `${scope}.lootTable`, mob.lootTable);
  });

  biomes.forEach((biome) => {
    const biomeMobCount = mobs.filter(({ biomeCode }) => biomeCode === biome.code).length;

    if (biomeMobCount === 0) {
      pushIssue(issues, `biome:${biome.code}`, 'Для биома не определён ни один моб.');
    }
  });
};

const validateRuneBalance = (issues: GameContentValidationIssue[], runeBalance: typeof gameBalance.runes): void => {
  if (!isPositiveInteger(runeBalance.craftCost)) {
    pushIssue(issues, 'balance:runes.craftCost', 'Стоимость создания руны должна быть положительным целым числом.');
  }

  const shardFields = new Set<string>();

  for (const [rarity, profile] of Object.entries(runeBalance.profiles) as Array<[RuneRarity, (typeof runeBalance.profiles)[RuneRarity]]>) {
    const scope = `balance:runes.${rarity}`;

    if (!isPositiveInteger(profile.weight)) {
      pushIssue(issues, `${scope}.weight`, 'Вес редкости должен быть положительным целым числом.');
    }

    if (!isPositiveInteger(profile.maxStatRoll)) {
      pushIssue(issues, `${scope}.maxStatRoll`, 'maxStatRoll должен быть положительным целым числом.');
    }

    if (!isPositiveInteger(profile.lines)) {
      pushIssue(issues, `${scope}.lines`, 'Количество линий должно быть положительным целым числом.');
    }

    if (!isNonEmptyString(profile.title)) {
      pushIssue(issues, `${scope}.title`, 'Title профиля редкости должен быть заполнен.');
    }

    if (shardFields.has(profile.shardField)) {
      pushIssue(issues, `${scope}.shardField`, 'Каждой редкости должен соответствовать уникальный shardField.');
    }

    shardFields.add(profile.shardField);
  }
};

const validateEnvironmentGameConfig = (issues: GameContentValidationIssue[], envGameConfig: typeof env.game): void => {
  if (!isNonNegativeInteger(envGameConfig.startingLevel)) {
    pushIssue(issues, 'env:GAME_STARTING_LEVEL', 'Стартовый уровень должен быть неотрицательным целым числом.');
  }

  const nonNegativeEntries = [
    ['GAME_STARTING_STAT_POINTS', envGameConfig.startingStatPoints],
    ['GAME_STARTING_USUAL_SHARDS', envGameConfig.startingUsualShards],
    ['GAME_STARTING_UNUSUAL_SHARDS', envGameConfig.startingUnusualShards],
    ['GAME_STARTING_RARE_SHARDS', envGameConfig.startingRareShards],
  ] as const;

  nonNegativeEntries.forEach(([key, value]) => {
    if (!isNonNegativeInteger(value)) {
      pushIssue(issues, `env:${key}`, `${key} должен быть неотрицательным целым числом.`);
    }
  });
};

const validateArchetypeAbilityReferences = (
  issues: GameContentValidationIssue[],
  params: {
    readonly archetypeCode: string;
    readonly scope: string;
    readonly abilityCodes: readonly string[];
    readonly scopeSuffix: 'passiveAbilityCodes' | 'activeAbilityCodes';
    readonly expectedKind: AbilitySeedDefinition['kind'];
    readonly missingAbilityLabel: 'passive-способность' | 'active-способность';
    readonly abilityByCode: ReadonlyMap<string, AbilitySeedDefinition>;
  },
): void => {
  const scopedPath = `${params.scope}.${params.scopeSuffix}`;

  params.abilityCodes.forEach((abilityCode) => {
    const ability = params.abilityByCode.get(abilityCode);

    if (!ability) {
      pushIssue(issues, scopedPath, `Не найдена ${params.missingAbilityLabel} ${abilityCode}.`);
      return;
    }

    if (ability.kind !== params.expectedKind) {
      pushIssue(issues, scopedPath, `Способность ${abilityCode} должна быть ${params.expectedKind}.`);
    }

    if (ability.runeArchetypeCode !== params.archetypeCode) {
      pushIssue(
        issues,
        scopedPath,
        `Способность ${abilityCode} принадлежит архетипу ${ability.runeArchetypeCode}, а не ${params.archetypeCode}.`,
      );
    }
  });
};

const validateRuneContent = (
  issues: GameContentValidationIssue[],
  schools: readonly SchoolSeedDefinition[],
  abilities: readonly AbilitySeedDefinition[],
  runeArchetypes: readonly RuneArchetypeSeedDefinition[],
): void => {
  collectDuplicateValues(schools.map(({ code }) => code)).forEach((duplicateCode) => {
    pushIssue(issues, 'runes:schools', `Найден дублирующийся school code: ${duplicateCode}.`);
  });

  collectDuplicateValues(schools.map(({ starterArchetypeCode }) => starterArchetypeCode)).forEach((duplicateStarterCode) => {
    pushIssue(issues, 'runes:schools', `Стартовый архетип ${duplicateStarterCode} привязан сразу к нескольким школам.`);
  });

  collectDuplicateValues(abilities.map(({ code }) => code)).forEach((duplicateCode) => {
    pushIssue(issues, 'runes:abilities', `Найден дублирующийся ability code: ${duplicateCode}.`);
  });

  collectDuplicateValues(runeArchetypes.map(({ code }) => code)).forEach((duplicateCode) => {
    pushIssue(issues, 'runes:archetypes', `Найден дублирующийся archetype code: ${duplicateCode}.`);
  });

  const archetypeCodes = new Set(runeArchetypes.map(({ code }) => code));
  const schoolCodes = new Set(schools.map(({ code }) => code));
  const abilityByCode = new Map(abilities.map((ability) => [ability.code, ability]));

  schools.forEach((school) => {
    const scope = `school:${school.code}`;

    if (
      !isNonEmptyString(school.code)
      || !isNonEmptyString(school.name)
      || !isNonEmptyString(school.nameGenitive)
      || !isNonEmptyString(school.starterArchetypeCode)
      || !isNonEmptyString(school.styleLine)
      || !isNonEmptyString(school.playPatternLine)
      || !isNonEmptyString(school.battleLine)
      || !isNonEmptyString(school.passiveLine)
    ) {
      pushIssue(issues, scope, 'Код, имя, грамматическая форма и ключевые school-поля должны быть заполнены.');
    }

    if (!archetypeCodes.has(school.starterArchetypeCode)) {
      pushIssue(issues, scope, `Школа ссылается на неизвестный стартовый архетип: ${school.starterArchetypeCode}.`);
      return;
    }

    const starterArchetype = runeArchetypes.find(({ code }) => code === school.starterArchetypeCode) ?? null;
    if (starterArchetype && starterArchetype.schoolCode !== school.code) {
      pushIssue(
        issues,
        scope,
        `Стартовый архетип ${school.starterArchetypeCode} привязан к школе ${starterArchetype.schoolCode}, а не ${school.code}.`,
      );
    }
  });

  abilities.forEach((ability) => {
    const scope = `ability:${ability.code}`;

    if (!isNonEmptyString(ability.code) || !isNonEmptyString(ability.name) || !isNonEmptyString(ability.description)) {
      pushIssue(issues, scope, 'Код, имя и описание способности должны быть заполнены.');
    }

    if (!archetypeCodes.has(ability.runeArchetypeCode)) {
      pushIssue(issues, scope, `Способность ссылается на неизвестный архетип: ${ability.runeArchetypeCode}.`);
    }

    if (!isNonNegativeInteger(ability.manaCost)) {
      pushIssue(issues, `${scope}.manaCost`, 'manaCost должен быть неотрицательным целым числом.');
    }

    if (!isNonNegativeInteger(ability.cooldownTurns)) {
      pushIssue(issues, `${scope}.cooldownTurns`, 'cooldownTurns должен быть неотрицательным целым числом.');
    }

    if (ability.kind === 'PASSIVE' && (ability.manaCost !== 0 || ability.cooldownTurns !== 0)) {
      pushIssue(issues, scope, 'Пассивная способность не должна требовать ману или перезарядку.');
    }

    if (ability.tags.some((tag) => !isNonEmptyString(tag))) {
      pushIssue(issues, `${scope}.tags`, 'Теги способности должны быть непустыми строками.');
    }

    if (collectDuplicateValues(ability.tags).length > 0) {
      pushIssue(issues, `${scope}.tags`, 'Теги способности не должны дублироваться.');
    }
  });

  runeArchetypes.forEach((runeArchetype) => {
    const scope = `archetype:${runeArchetype.code}`;

    if (
      !isNonEmptyString(runeArchetype.code)
      || !isNonEmptyString(runeArchetype.schoolCode)
      || !isNonEmptyString(runeArchetype.name)
      || !isNonEmptyString(runeArchetype.description)
    ) {
      pushIssue(issues, scope, 'Код, имя и описание архетипа должны быть заполнены.');
    }

    if (!schoolCodes.has(runeArchetype.schoolCode)) {
      pushIssue(issues, `${scope}.schoolCode`, `Архетип ссылается на неизвестную школу: ${runeArchetype.schoolCode}.`);
    }

    if (runeArchetype.preferredStats.length === 0) {
      pushIssue(issues, scope, 'Архетип должен иметь хотя бы один preferred stat.');
    }

    if (collectDuplicateValues(runeArchetype.preferredStats).length > 0) {
      pushIssue(issues, `${scope}.preferredStats`, 'preferredStats не должны содержать дубликаты.');
    }

    const referencedAbilityCodes = [...runeArchetype.passiveAbilityCodes, ...runeArchetype.activeAbilityCodes];

    if (collectDuplicateValues(referencedAbilityCodes).length > 0) {
      pushIssue(issues, `${scope}.abilities`, 'Архетип не должен повторно ссылаться на одну и ту же способность.');
    }

    validateArchetypeAbilityReferences(issues, {
      archetypeCode: runeArchetype.code,
      scope,
      abilityCodes: runeArchetype.passiveAbilityCodes,
      scopeSuffix: 'passiveAbilityCodes',
      expectedKind: 'PASSIVE',
      missingAbilityLabel: 'passive-способность',
      abilityByCode,
    });

    validateArchetypeAbilityReferences(issues, {
      archetypeCode: runeArchetype.code,
      scope,
      abilityCodes: runeArchetype.activeAbilityCodes,
      scopeSuffix: 'activeAbilityCodes',
      expectedKind: 'ACTIVE',
      missingAbilityLabel: 'active-способность',
      abilityByCode,
    });
  });
};

export const createGameContentValidationInput = (): GameContentValidationInput => ({
  biomes: biomeSeed,
  mobs: mobSeed,
  schools: schoolSeed,
  abilities: abilitySeed,
  runeArchetypes: runeArchetypeSeed,
  worldBalance: gameBalance.world,
  runeBalance: gameBalance.runes,
  envGameConfig: env.game,
});

export const validateGameContent = (
  input: GameContentValidationInput = createGameContentValidationInput(),
): GameContentValidationReport => {
  const issues: GameContentValidationIssue[] = [];

  validateWorldBalance(issues, input.worldBalance);
  validateBiomeSeed(issues, input.biomes, input.worldBalance);
  validateMobSeed(issues, input.biomes, input.mobs);
  validateRuneBalance(issues, input.runeBalance);
  validateEnvironmentGameConfig(issues, input.envGameConfig);
  validateRuneContent(issues, input.schools, input.abilities, input.runeArchetypes);

  return {
    isValid: issues.length === 0,
    issues,
  };
};

export const formatGameContentValidationReport = (report: GameContentValidationReport): readonly string[] => {
  if (report.isValid) {
    return ['✓ Контентные сиды и баланс валидны.'];
  }

  return report.issues.map(({ scope, message }) => `✗ ${scope} — ${message}`);
};

export const assertValidGameContent = (input: GameContentValidationInput = createGameContentValidationInput()): void => {
  const report = validateGameContent(input);

  if (report.isValid) {
    return;
  }

  throw new Error(
    [
      'Game content validation failed.',
      ...formatGameContentValidationReport(report),
    ].join('\n'),
  );
};
