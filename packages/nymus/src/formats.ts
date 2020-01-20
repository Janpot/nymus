interface FormatterStyles {
  [style: string]: {
    [key: string]: string;
  };
}

export interface Formats {
  number: FormatterStyles;
  date: FormatterStyles;
  time: FormatterStyles;
}

export function mergeFormats(...formattersList: Partial<Formats>[]): Formats {
  return {
    number: Object.assign(
      {},
      ...formattersList.map(formatters => formatters.number)
    ),
    date: Object.assign(
      {},
      ...formattersList.map(formatters => formatters.date)
    ),
    time: Object.assign(
      {},
      ...formattersList.map(formatters => formatters.time)
    )
  };
}
