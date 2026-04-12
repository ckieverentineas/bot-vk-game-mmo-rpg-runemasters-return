import { formatGameContentValidationReport, validateGameContent } from '../../content/validation/validate-game-content';

const report = validateGameContent();

console.log(
  [
    'Runemasters Return — content validation',
    '',
    ...formatGameContentValidationReport(report),
    '',
    report.isValid
      ? 'Статус: content validation пройдена.'
      : 'Статус: content validation не пройдена. Исправьте контентные данные и баланс.',
  ].join('\n'),
);

if (!report.isValid) {
  process.exitCode = 1;
}
