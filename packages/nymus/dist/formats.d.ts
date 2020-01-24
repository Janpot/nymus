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
export declare function mergeFormats(...formattersList: Partial<Formats>[]): Formats;
export {};
