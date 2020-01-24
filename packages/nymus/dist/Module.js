"use strict";
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var t = require("@babel/types");
var Scope_1 = require("./Scope");
var createComponent_1 = require("./createComponent");
var astUtil = require("./astUtil");
var formats_1 = require("./formats");
function getIntlFormatter(type) {
    switch (type) {
        case 'number':
            return 'NumberFormat';
        case 'date':
            return 'DateTimeFormat';
        case 'time':
            return 'DateTimeFormat';
    }
}
var Module = /** @class */ (function () {
    function Module(options) {
        this.react = options.react || false;
        this.scope = new Scope_1.default();
        if (this.react) {
            this.scope.createBinding('React');
        }
        this.exports = new Map();
        this.formatters = new Map();
        this._sharedConsts = new Map();
        this.locale = options.locale;
        this.formats = formats_1.mergeFormats(options.formats || {});
    }
    Module.prototype._useSharedConst = function (key, name, build) {
        var sharedConst = this._sharedConsts.get(key);
        if (sharedConst) {
            return t.identifier(sharedConst.localName);
        }
        var localName = this.scope.createUniqueBinding(name);
        this._sharedConsts.set(key, { localName: localName, init: build() });
        return t.identifier(localName);
    };
    Module.prototype.buildFormatterAst = function (constructor, options) {
        return t.newExpression(t.memberExpression(t.identifier('Intl'), t.identifier(constructor)), [
            this.locale ? t.stringLiteral(this.locale) : t.identifier('undefined'),
            options ? astUtil.buildJson(options) : t.identifier('undefined')
        ]);
    };
    Module.prototype.useFormatter = function (type, style) {
        var _this = this;
        var sharedKey = JSON.stringify(['formatter', type, style]);
        return this._useSharedConst(sharedKey, type, function () {
            return _this.buildFormatterAst(getIntlFormatter(type), typeof style === 'string' ? _this.formats[type][style] : style);
        });
    };
    Module.prototype.usePlural = function (type) {
        var _this = this;
        var sharedKey = JSON.stringify(['plural', type]);
        return this._useSharedConst(sharedKey, "p_" + type, function () {
            return _this.buildFormatterAst('PluralRules', type ? { type: type } : undefined);
        });
    };
    Module.prototype.addMessage = function (componentName, message) {
        if (this.exports.has(componentName)) {
            throw new Error("A component named \"" + componentName + "\" was already defined");
        }
        var localName = this.scope.hasBinding(componentName)
            ? this.scope.createUniqueBinding(componentName)
            : this.scope.createBinding(componentName);
        var ast = createComponent_1.default(localName, message, this).ast;
        this.exports.set(componentName, { localName: localName, ast: ast });
    };
    Module.prototype._buildSharedConstAst = function (sharedConst) {
        return t.variableDeclaration('const', [
            t.variableDeclarator(t.identifier(sharedConst.localName), sharedConst.init)
        ]);
    };
    Module.prototype.buildModuleAst = function () {
        var e_1, _a;
        var _this = this;
        var formatterDeclarations = Array.from(this._sharedConsts.values(), function (sharedConst) { return _this._buildSharedConstAst(sharedConst); });
        var componentDeclarations = [];
        var exportSpecifiers = [];
        try {
            for (var _b = __values(this.exports.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), componentName = _d[0], _e = _d[1], localName = _e.localName, ast = _e.ast;
                componentDeclarations.push(t.variableDeclaration('const', [
                    t.variableDeclarator(t.identifier(localName), ast)
                ]));
                exportSpecifiers.push(t.exportSpecifier(t.identifier(localName), t.identifier(componentName)));
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return __spread((this.react
            ? [
                t.importDeclaration([t.importNamespaceSpecifier(t.identifier('React'))], t.stringLiteral('react'))
            ]
            : []), formatterDeclarations, componentDeclarations, [
            t.exportNamedDeclaration(null, exportSpecifiers)
        ]);
    };
    return Module;
}());
exports.default = Module;
