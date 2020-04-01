const DEFAULTS = {
  number: {
    currency: {
      style: 'currency',
    },

    percent: {
      style: 'percent',
    },
  },

  date: {
    short: {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
    },

    medium: {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },

    long: {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    },

    full: {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    },
  },

  time: {
    short: {
      hour: 'numeric',
      minute: 'numeric',
    },

    medium: {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    },

    long: {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      timeZoneName: 'short',
    },

    full: {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      timeZoneName: 'short',
    },
  },
};

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
      DEFAULTS.number,
      ...formattersList.map((formatters) => formatters.number)
    ),
    date: Object.assign(
      {},
      DEFAULTS.date,
      ...formattersList.map((formatters) => formatters.date)
    ),
    time: Object.assign(
      {},
      DEFAULTS.time,
      ...formattersList.map((formatters) => formatters.time)
    ),
  };
}
