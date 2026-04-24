import type { SchoolSeedDefinition } from '../types';

export const schoolSeed = [
  {
    code: 'ember',
    name: 'Пламя',
    nameGenitive: 'Пламени',
    starterArchetypeCode: 'ember',
    styleLine: 'Путь давления: усиливает прямой урон и дожим.',
    playPatternLine: 'Пламя любит давление: бейте чаще и добивайте просевшего врага.',
    battleLine: 'В бою: базовая атака и рунный удар сильнее давят на раненого врага.',
    passiveLine: 'Пассивно: усиливает атакующее давление в каждом ходу.',
  },
  {
    code: 'stone',
    name: 'Твердь',
    nameGenitive: 'Тверди',
    starterArchetypeCode: 'stone',
    styleLine: 'Путь стойкости: переживает угрозы и усиливает защиту.',
    playPatternLine: 'Твердь любит выдержку: примите опасный ход защитой и ответьте камнем.',
    battleLine: 'В бою: защита и каменный отпор надёжнее встречают опасные удары.',
    passiveLine: 'Пассивно: делает защиту и ответ после угрозы сильнее.',
  },
  {
    code: 'gale',
    name: 'Буря',
    nameGenitive: 'Бури',
    starterArchetypeCode: 'gale',
    styleLine: 'Путь темпа: бьёт и одновременно готовит следующий ответ.',
    playPatternLine: 'Буря любит темп: бейте сейчас и оставляйте себе ответ на потом.',
    battleLine: 'В бою: активное действие совмещает давление и защиту.',
    passiveLine: 'Пассивно: школа ищет ход, который бьёт сейчас и готовит следующий ответ.',
  },
  {
    code: 'echo',
    name: 'Прорицание',
    nameGenitive: 'Прорицания',
    starterArchetypeCode: 'echo',
    styleLine: 'Путь чтения боя: превращает раскрытую угрозу в выгоду.',
    playPatternLine: 'Прорицание любит ясность: дождитесь раскрытой угрозы и бейте точно.',
    battleLine: 'В бою: лучше всего отвечает на явные угрозы и открытые окна.',
    passiveLine: 'Пассивно: усиливает ответы на заранее раскрытые угрозы.',
  },
] satisfies readonly SchoolSeedDefinition[];
