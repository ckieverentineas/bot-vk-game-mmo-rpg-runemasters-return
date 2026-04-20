import { assertValidGameContent } from '../content/validation/validate-game-content';
import { Logger } from '../utils/logger';

async function seed(): Promise<void> {
  Logger.info('🌱 Validating Runemasters Return static content...');
  assertValidGameContent();

  Logger.info('✅ Static content is valid. Runtime now reads world and rune content directly from code, not from seeded DB tables.');
}

void seed()
  .catch((error) => {
    Logger.error('❌ Seed failed:', error);
    process.exitCode = 1;
  });
