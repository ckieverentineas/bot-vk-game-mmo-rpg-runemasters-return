export interface RuneSchoolPresentation {
  readonly name: string;
  readonly styleLine: string;
  readonly battleLine: string;
  readonly passiveLine: string;
}

const schoolPresentationMap: Readonly<Record<string, RuneSchoolPresentation>> = {
  ember: {
    name: 'Уголь',
    styleLine: 'Школа давления: усиливает прямой урон и дожим.',
    battleLine: 'В бою: базовая атака и рунный удар давят сильнее обычного.',
    passiveLine: 'Пассивно: усиливает атакующее давление в каждом ходу.',
  },
  stone: {
    name: 'Камень',
    styleLine: 'Школа стойкости: переживает угрозы и усиливает защиту.',
    battleLine: 'В бою: защита и guard-ответы становятся надёжнее.',
    passiveLine: 'Пассивно: делает защиту и переживание телеграфов заметно сильнее.',
  },
  gale: {
    name: 'Шквал',
    styleLine: 'Школа темпа: бьёт и одновременно готовит следующий ответ.',
    battleLine: 'В бою: активное действие совмещает давление и защиту.',
    passiveLine: 'Пассивно: стиль школы строится вокруг темпа и окна наказания.',
  },
  echo: {
    name: 'Эхо',
    styleLine: 'Школа чтения боя: превращает намерения врага в выгоду.',
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
