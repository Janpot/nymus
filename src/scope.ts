import * as t from '@babel/types';

interface Binding {}

const CONTEXT_VARIABLES = new Set(['arguments', 'undefined', 'Infinity', 'NaN']);

export default class Scope {
  _parent?: Scope
  _bindings: Map<string, Binding>

  constructor(parent?: Scope) {
    this._parent = parent;
    this._bindings = new Map();
  }

  registerBinding (name: string): void {
    if (this.hasOwnBinding(name)) {
      throw new Error(`Binding "${name}" already exists`);
    }
    this._bindings.set(name, {});
  }

  hasBinding (name: string): boolean {
    return (
      CONTEXT_VARIABLES.has(name) ||
      this.hasOwnBinding(name) ||
      (this._parent && this._parent.hasBinding(name)) ||
      false
    );
  }

  hasOwnBinding (name: string): boolean {
    return this._bindings.has(name);
  }

  generateUid (name: string = 'tmp'): string {
    // remove leading and trailing underscores
    const idBase = t.toIdentifier(name).replace(/^_+/, '').replace(/_+$/, '');
    let uid;
    let i = 0;
    do {
      uid = `_${idBase}${i > 0 ? `_${i}` : ''}`;
      i++;
    } while (
      this.hasBinding(uid)
    );
    return uid;
  }
}
