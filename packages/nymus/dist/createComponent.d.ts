import * as t from '@babel/types';
import Module from './Module';
import { UnifiedNumberFormatOptions } from '@formatjs/intl-unified-numberformat';
declare type ToType<F> = {
    [K in keyof F]: F[K];
};
export declare type FormatOptions = ToType<UnifiedNumberFormatOptions>;
interface Argument {
    localName?: string;
    type: ArgumentType;
}
declare type ArgumentType = 'string' | 'number' | 'Date' | 'React.Element';
export default function icuToReactComponent(componentName: string, icuStr: string, module: Module): {
    ast: t.FunctionExpression;
    args: Map<string, Argument>;
};
export {};
