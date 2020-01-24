interface Binding {
}
export default class Scope {
    _parent?: Scope;
    _bindings: Map<string, Binding>;
    constructor(parent?: Scope);
    createBinding(name: string): string;
    hasBinding(name: string): boolean;
    hasOwnBinding(name: string): boolean;
    generateUid(name?: string): string;
    createUniqueBinding(name: string): string;
}
export {};
