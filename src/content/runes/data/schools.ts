import type { SchoolSeedDefinition } from '../types';

export const schoolSeed = [
  {
    code: 'ember',
    name: 'Пламя',
    nameGenitive: 'Пламени',
    starterArchetypeCode: 'ember',
    styleLine: 'Путь давления: усиливает прямой урон и дожим.',
    playPatternLine: 'Играй так: дави уроном и добивай, когда враг проседает.',
    battleLine: 'В бою: базовая атака и рунный удар давят сильнее обычного.',
    passiveLine: 'Пассивно: усиливает атакующее давление в каждом ходу.',
  },
  {
    code: 'stone',
    name: 'Твердь',
    nameGenitive: 'Тверди',
    starterArchetypeCode: 'stone',
    styleLine: 'Путь стойкости: переживает угрозы и усиливает защиту.',
    playPatternLine: 'Играй так: читай опасный ход и переживай его через защиту или каменный отпор.',
    battleLine: 'В бою: защита и каменный отпор переживают телеграфы надёжнее обычного.',
    passiveLine: 'Пассивно: делает защиту и переживание телеграфов заметно сильнее.',
  },
  {
    code: 'gale',
    name: 'Буря',
    nameGenitive: 'Бури',
    starterArchetypeCode: 'gale',
    styleLine: 'Путь темпа: бьёт и одновременно готовит следующий ответ.',
    playPatternLine: 'Играй так: чередуй давление и подготовку ответа на следующий ход.',
    battleLine: 'В бою: активное действие совмещает давление и защиту.',
    passiveLine: 'Пассивно: стиль школы строится вокруг темпа и окна наказания.',
  },
  {
    code: 'echo',
    name: 'Прорицание',
    nameGenitive: 'Прорицания',
    starterArchetypeCode: 'echo',
    styleLine: 'Путь чтения боя: превращает намерения врага в выгоду.',
    playPatternLine: 'Играй так: наказывай врага за заранее раскрытые намерения.',
    battleLine: 'В бою: лучше всего отвечает на телеграфы и открытые окна.',
    passiveLine: 'Пассивно: усиливает ответы на заранее раскрытые угрозы.',
  },
] satisfies readonly SchoolSeedDefinition[];
