export interface RuneSchoolPresentation {
  readonly name: string;
  readonly schoolLine: string;
  readonly runeTitle: string;
  readonly roleName: string;
  readonly styleLine: string;
  readonly playPatternLine: string;
  readonly battleLine: string;
  readonly passiveLine: string;
}

const schoolPresentationMap: Readonly<Record<string, RuneSchoolPresentation>> = {
  ember: {
    name: 'Пламя',
    schoolLine: 'Школа Пламени',
    runeTitle: 'Пламени',
    roleName: 'Штурм',
    styleLine: 'Путь давления: усиливает прямой урон и дожим.',
    playPatternLine: 'Играй так: дави уроном и добивай, когда враг проседает.',
    battleLine: 'В бою: базовая атака и рунный удар давят сильнее обычного.',
    passiveLine: 'Пассивно: усиливает атакующее давление в каждом ходу.',
  },
  stone: {
    name: 'Твердь',
    schoolLine: 'Школа Тверди',
    runeTitle: 'Тверди',
    roleName: 'Страж',
    styleLine: 'Путь стойкости: переживает угрозы и усиливает защиту.',
    playPatternLine: 'Играй так: читай опасный ход и переживай его через защиту или каменный отпор.',
    battleLine: 'В бою: защита и каменный отпор переживают телеграфы надёжнее обычного.',
    passiveLine: 'Пассивно: делает защиту и переживание телеграфов заметно сильнее.',
  },
  gale: {
    name: 'Буря',
    schoolLine: 'Школа Бури',
    runeTitle: 'Бури',
    roleName: 'Налётчик',
    styleLine: 'Путь темпа: бьёт и одновременно готовит следующий ответ.',
    playPatternLine: 'Играй так: чередуй давление и подготовку ответа на следующий ход.',
    battleLine: 'В бою: активное действие совмещает давление и защиту.',
    passiveLine: 'Пассивно: стиль школы строится вокруг темпа и окна наказания.',
  },
  echo: {
    name: 'Прорицание',
    schoolLine: 'Школа Прорицания',
    runeTitle: 'Прорицания',
    roleName: 'Провидец',
    styleLine: 'Путь чтения боя: превращает намерения врага в выгоду.',
    playPatternLine: 'Играй так: наказывай врага за заранее раскрытые намерения.',
    battleLine: 'В бою: лучше всего отвечает на телеграфы и открытые окна.',
    passiveLine: 'Пассивно: усиливает ответы на заранее раскрытые угрозы.',
  },
};

export const getRuneSchoolPresentation = (code: string | null | undefined): RuneSchoolPresentation | null => {
  if (!code) {
    return null;
  }

  return schoolPresentationMap[code] ?? null;
};
