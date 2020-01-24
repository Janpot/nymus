"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var types_1 = require("@babel/types");
var CONTEXT_VARIABLES = new Set([
    'arguments',
    'undefined',
    'Infinity',
    'NaN'
]);
var Scope = /** @class */ (function () {
    function Scope(parent) {
        this._parent = parent;
        this._bindings = new Map();
    }
    Scope.prototype.createBinding = function (name) {
        if (this.hasOwnBinding(name)) {
            throw new Error("Binding \"" + name + "\" already exists");
        }
        this._bindings.set(name, {});
        return name;
    };
    Scope.prototype.hasBinding = function (name) {
        return (CONTEXT_VARIABLES.has(name) ||
            this.hasOwnBinding(name) ||
            (this._parent && this._parent.hasBinding(name)) ||
            false);
    };
    Scope.prototype.hasOwnBinding = function (name) {
        return this._bindings.has(name);
    };
    Scope.prototype.generateUid = function (name) {
        if (name === void 0) { name = 'tmp'; }
        // remove leading and trailing underscores
        var idBase = types_1.toIdentifier(name)
            .replace(/^_+/, '')
            .replace(/_+$/, '');
        var uid;
        var i = 0;
        do {
            uid = "_" + idBase + (i > 0 ? "_" + i : '');
            i++;
        } while (this.hasBinding(uid));
        return uid;
    };
    Scope.prototype.createUniqueBinding = function (name) {
        var uniqueName = this.generateUid(name);
        return this.createBinding(uniqueName);
    };
    return Scope;
}());
exports.default = Scope;
