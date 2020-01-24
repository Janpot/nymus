import * as t from '@babel/types';
import { Formats } from './formats';
import { BabelCodeFrameOptions } from '@babel/code-frame';
interface Messages {
    [key: string]: string;
}
export interface CreateModuleOptions {
    locale?: string;
    formats?: Partial<Formats>;
    ast?: boolean;
    react?: boolean;
    typescript?: boolean;
    declarations?: boolean;
}
interface Location {
    start: Position;
    end: Position;
}
interface Position {
    offset: number;
    line: number;
    column: number;
}
export declare function formatError(input: string, err: Error & {
    location?: Location;
    loc?: Position;
}, options?: Omit<BabelCodeFrameOptions, 'message'>): string;
export declare function createModuleAst(messages: Messages, options?: CreateModuleOptions): Promise<t.Program>;
export default function createModule(messages: Messages, options?: CreateModuleOptions): Promise<{
    code: string;
    ast: t.File | null | undefined;
    declarations: string | undefined;
}>;
export {};
