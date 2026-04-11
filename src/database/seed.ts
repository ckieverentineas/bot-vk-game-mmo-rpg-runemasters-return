import { biomeSeed, mobSeed } from '../content/world';
import { Logger } from '../utils/logger';
import { prisma } from './client';

async function seed(): Promise<void> {
  Logger.info('🌱 Seeding new Runemasters Return database...');

  await prisma.battleSession.deleteMany();
  await prisma.playerProgress.updateMany({
    data: {
      activeBattleId: null,
    },
  });
  await prisma.mobTemplate.deleteMany();
  await prisma.biome.deleteMany();

  await prisma.biome.createMany({
    data: biomeSeed.map((biome) => ({
      code: biome.code,
      name: biome.name,
      description: biome.description,
      minLevel: biome.minLevel,
      maxLevel: biome.maxLevel,
    })),
  });

  const biomeRows = await prisma.biome.findMany();
  const biomeIdByCode = new Map(biomeRows.map((biome) => [biome.code, biome.id]));

  await prisma.mobTemplate.createMany({
    data: mobSeed.map((mob) => ({
      biomeId: biomeIdByCode.get(mob.biomeCode) ?? 0,
      code: mob.code,
      name: mob.name,
      kind: mob.kind,
      isElite: mob.isElite,
      isBoss: mob.isBoss,
      baseHealth: mob.baseHealth,
      baseAttack: mob.baseAttack,
      baseDefence: mob.baseDefence,
      baseMagicDefence: mob.baseMagicDefence,
      baseDexterity: mob.baseDexterity,
      baseIntelligence: mob.baseIntelligence,
      healthScale: mob.healthScale,
      attackScale: mob.attackScale,
      defenceScale: mob.defenceScale,
      magicDefenceScale: mob.magicDefenceScale,
      dexterityScale: mob.dexterityScale,
      intelligenceScale: mob.intelligenceScale,
      baseExperience: mob.baseExperience,
      baseGold: mob.baseGold,
      runeDropChance: mob.runeDropChance,
      lootTable: mob.lootTable,
      attackText: mob.attackText,
    })),
  });

  Logger.info(`✅ Refreshed ${biomeSeed.length} biomes and ${mobSeed.length} mob templates without wiping player progress.`);
}

void seed()
  .catch((error) => {
    Logger.error('❌ Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
