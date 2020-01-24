import * as t from '@babel/types';
import Scope from './Scope';
import { CreateModuleOptions } from '.';
import { FormatOptions } from './createComponent';
import * as astUtil from './astUtil';
import { Formats } from './formats';
interface Export {
    localName: string;
    ast: t.Expression;
}
interface Formatter {
    localName: string;
    type: keyof Formats;
    style: string;
}
interface SharedConst {
    localName: string;
    init: t.Expression;
}
export default class Module {
    readonly react: boolean;
    readonly scope: Scope;
    readonly exports: Map<string, Export>;
    readonly formatters: Map<string, Formatter>;
    readonly _sharedConsts: Map<string, SharedConst>;
    readonly locale?: string;
    readonly formats: Formats;
    constructor(options: CreateModuleOptions);
    _useSharedConst(key: string, name: string, build: () => t.Expression): t.Identifier;
    buildFormatterAst(constructor: string, options?: astUtil.Json): t.NewExpression;
    useFormatter(type: keyof Formats, style: string | FormatOptions): t.Identifier;
    usePlural(type?: 'ordinal' | 'cardinal'): t.Identifier;
    addMessage(componentName: string, message: string): void;
    _buildSharedConstAst(sharedConst: SharedConst): t.Statement;
    buildModuleAst(): t.Statement[];
}
export {};
