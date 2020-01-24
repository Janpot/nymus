import { ModeFactory } from 'codemirror';
declare type Frame = {
    type: 'argument';
    indentation: number;
    formatType?: string;
    argPos: number;
} | {
    type: 'escaped';
} | {
    type: 'text';
};
interface ModeState {
    stack: Frame[];
}
declare const mode: ModeFactory<ModeState>;
export default mode;
