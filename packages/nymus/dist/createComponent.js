"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
Object.defineProperty(exports, "__esModule", { value: true });
var mf = require("intl-messageformat-parser");
var t = require("@babel/types");
var babylon = require("@babel/parser");
var Scope_1 = require("./Scope");
var TransformationError_1 = require("./TransformationError");
var astUtil = require("./astUtil");
function interpolateJsxFragment(jsxFragment, fragments, context) {
    var fragment = interpolateJsxFragmentChildren(jsxFragment.children, fragments, context, 0);
    if (fragment.length <= 0) {
        return { elm: false, ast: t.stringLiteral('') };
    }
    else if (fragment.length === 1) {
        return fragment[0];
    }
    else {
        var elm = fragment.some(function (frag) { return frag.elm; });
        if (elm) {
            return {
                elm: elm,
                ast: astUtil.buildReactElement(t.memberExpression(t.identifier('React'), t.identifier('Fragment')), fragment.map(function (frag) { return frag.ast; }))
            };
        }
        else {
            var operands = fragment.map(function (fragment) { return fragment.ast; });
            if (!t.isStringLiteral(operands[0])) {
                operands.unshift(t.stringLiteral(''));
            }
            return {
                elm: elm,
                ast: astUtil.buildBinaryChain.apply(astUtil, __spread(['+'], operands))
            };
        }
    }
}
function interpolateJsxFragmentChildren(jsx, fragments, context, index) {
    var e_1, _a;
    var result = [];
    try {
        for (var jsx_1 = __values(jsx), jsx_1_1 = jsx_1.next(); !jsx_1_1.done; jsx_1_1 = jsx_1.next()) {
            var child = jsx_1_1.value;
            if (t.isJSXFragment(child)) {
                throw new TransformationError_1.default('Fragments are not allowed', child.loc);
            }
            else if (t.isJSXExpressionContainer(child)) {
                var fragment = fragments[index];
                index++;
                result.push(fragment);
            }
            else if (t.isJSXElement(child)) {
                var identifier = child.openingElement.name;
                if (!t.isJSXIdentifier(identifier)) {
                    throw new TransformationError_1.default('Invalid JSX element', child.openingElement.name.loc);
                }
                if (child.openingElement.attributes.length > 0) {
                    throw new TransformationError_1.default('JSX attributes are not allowed', child.openingElement.attributes[0].loc);
                }
                var localName = context.addArgument(identifier.name, 'React.Element');
                var fragment = interpolateJsxFragmentChildren(child.children, fragments, context, index);
                var interpolatedChild = astUtil.buildReactElement(localName, fragment.map(function (frag) { return frag.ast; }));
                result.push({ elm: true, ast: interpolatedChild });
            }
            else if (t.isJSXText(child)) {
                result.push({ elm: false, ast: t.stringLiteral(child.value) });
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (jsx_1_1 && !jsx_1_1.done && (_a = jsx_1.return)) _a.call(jsx_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return result;
}
function icuNodesToJsExpression(icuNodes, context) {
    if (icuNodes.length <= 0) {
        return { ast: t.stringLiteral(''), elm: false };
    }
    var jsxContent = icuNodes
        .map(function (icuNode, i) {
        if (mf.isLiteralElement(icuNode)) {
            return icuNode.value;
        }
        // replace anything that is not a literal with an expression container placeholder
        // of the same length to preserve location
        var lines = icuNode.location.end.line - icuNode.location.start.line;
        var columns = lines > 0
            ? icuNode.location.end.column
            : icuNode.location.end.column - icuNode.location.start.column;
        return "{" + ('_' + '\n'.repeat(lines) + ' '.repeat(columns)) + "}";
    })
        .join('');
    // Wrap in a root element to turn it into valid JSX
    var jsxElement = "<>" + jsxContent + "</>";
    var jsxAst = babylon.parseExpression(jsxElement, {
        plugins: ['jsx']
    });
    var interpollatedIcuNodes = icuNodes.filter(function (node) { return !mf.isLiteralElement(node); });
    var fragments = interpollatedIcuNodes.map(function (icuNode) {
        return icuNodeToJsExpression(icuNode, context);
    });
    return interpolateJsxFragment(jsxAst, fragments, context);
}
function buildFormatterCall(formatter, value) {
    return t.callExpression(t.memberExpression(formatter, t.identifier('format')), [value]);
}
function buildPluralRulesCall(formatter, value) {
    return t.callExpression(t.memberExpression(formatter, t.identifier('select')), [value]);
}
function icuNodeToJsExpression(icuNode, context) {
    if (mf.isLiteralElement(icuNode)) {
        return { elm: false, ast: t.stringLiteral(icuNode.value) };
    }
    else if (mf.isArgumentElement(icuNode)) {
        var argIdentifier = context.addArgument(icuNode.value, 'string');
        return { elm: false, ast: argIdentifier };
    }
    else if (mf.isSelectElement(icuNode)) {
        var argIdentifier_1 = context.addArgument(icuNode.value, 'string');
        if (!icuNode.options.hasOwnProperty('other')) {
            throw new TransformationError_1.default('A select element requires an "other"', icuNode.location || null);
        }
        var _a = icuNode.options, other = _a.other, options = __rest(_a, ["other"]);
        var caseFragments = Object.entries(options).map(function (_a) {
            var _b = __read(_a, 2), name = _b[0], caseNode = _b[1];
            return [name, icuNodesToJsExpression(caseNode.value, context)];
        });
        var cases = caseFragments.map(function (_a) {
            var _b = __read(_a, 2), name = _b[0], fragment = _b[1];
            return [
                t.binaryExpression('===', argIdentifier_1, t.stringLiteral(name)),
                fragment.ast
            ];
        });
        var otherFragment = icuNodesToJsExpression(other.value, context);
        return {
            elm: caseFragments.some(function (_a) {
                var _b = __read(_a, 2), fragment = _b[1];
                return fragment.elm;
            }) || otherFragment.elm,
            ast: astUtil.buildTernaryChain(cases, otherFragment.ast)
        };
    }
    else if (mf.isPluralElement(icuNode)) {
        var argIdentifier = context.addArgument(icuNode.value, 'number');
        var formatted = context.useFormattedValue(argIdentifier, 'number', 'decimal');
        context.enterPlural(formatted);
        if (!icuNode.options.hasOwnProperty('other')) {
            throw new TransformationError_1.default('A plural element requires an "other"', icuNode.location || null);
        }
        var _b = icuNode.options, other = _b.other, options = __rest(_b, ["other"]);
        var otherFragment = icuNodesToJsExpression(other.value, context);
        var withOffset_1 = context.useWithOffset(argIdentifier, icuNode.offset);
        var localized_1 = context.useLocalizedMatcher(withOffset_1, icuNode.pluralType);
        var caseFragments = Object.entries(options).map(function (_a) {
            var _b = __read(_a, 2), name = _b[0], caseNode = _b[1];
            return [name, icuNodesToJsExpression(caseNode.value, context)];
        });
        var cases = caseFragments.map(function (_a) {
            var _b = __read(_a, 2), name = _b[0], fragment = _b[1];
            var test = name.startsWith('=')
                ? t.binaryExpression('===', withOffset_1, t.numericLiteral(Number(name.slice(1))))
                : t.binaryExpression('===', localized_1, t.stringLiteral(name));
            return [test, fragment.ast];
        });
        var ast = astUtil.buildTernaryChain(cases, otherFragment.ast);
        context.exitPlural();
        return {
            elm: caseFragments.some(function (_a) {
                var _b = __read(_a, 2), fragment = _b[1];
                return fragment.elm;
            }) || otherFragment.elm,
            ast: ast
        };
    }
    else if (mf.isNumberElement(icuNode)) {
        var value = context.addArgument(icuNode.value, 'number');
        if (mf.isNumberSkeleton(icuNode.style)) {
            var formattedValue = context.useFormattedValue(value, 'number', mf.convertNumberSkeletonToNumberFormatOptions(icuNode.style.tokens));
            return { elm: false, ast: formattedValue };
        }
        else {
            var formattedValue = context.useFormattedValue(value, 'number', icuNode.style || 'decimal');
            return { elm: false, ast: formattedValue };
        }
    }
    else if (mf.isDateElement(icuNode)) {
        var value = context.addArgument(icuNode.value, 'Date');
        var formattedValue = context.useFormattedValue(value, 'date', icuNode.style || 'medium');
        return { elm: false, ast: formattedValue };
    }
    else if (mf.isTimeElement(icuNode)) {
        var value = context.addArgument(icuNode.value, 'Date');
        var formattedValue = context.useFormattedValue(value, 'time', icuNode.style || 'medium');
        return { elm: false, ast: formattedValue };
    }
    else if (mf.isPoundElement(icuNode)) {
        return { elm: false, ast: context.getPound() };
    }
    else {
        throw new Error("Unknown AST node type");
    }
}
function createContext(module) {
    return new ComponentContext(module);
}
function getTypeAnnotation(type) {
    switch (type) {
        case 'string':
            return t.tsStringKeyword();
        case 'number':
            return t.tsNumberKeyword();
        case 'Date':
            return t.tsTypeReference(t.identifier('Date'));
        case 'React.Element':
            return t.tsTypeReference(t.tsQualifiedName(t.identifier('React'), t.identifier('Element')));
    }
}
var ComponentContext = /** @class */ (function () {
    function ComponentContext(module) {
        this._module = module;
        this._scope = new Scope_1.default(module.scope);
        this.args = new Map();
        this._poundStack = [];
        this._sharedConsts = new Map();
    }
    ComponentContext.prototype.enterPlural = function (identifier) {
        this._poundStack.unshift(identifier);
    };
    ComponentContext.prototype.exitPlural = function () {
        this._poundStack.shift();
    };
    ComponentContext.prototype.getPound = function () {
        return this._poundStack[0];
    };
    Object.defineProperty(ComponentContext.prototype, "locale", {
        get: function () {
            return this._module.locale;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ComponentContext.prototype, "formats", {
        get: function () {
            return this._module.formats;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ComponentContext.prototype, "react", {
        get: function () {
            return this._module.react;
        },
        enumerable: true,
        configurable: true
    });
    ComponentContext.prototype.addArgument = function (name, type) {
        var arg = { type: type };
        if (this._scope.hasBinding(name)) {
            arg.localName = this._scope.createUniqueBinding(name);
        }
        this.args.set(name, arg);
        return t.identifier(arg.localName || name);
    };
    ComponentContext.prototype.useFormatter = function (type, style) {
        return this._module.useFormatter(type, style);
    };
    ComponentContext.prototype.useFormattedValue = function (value, type, style) {
        var formatterId = this.useFormatter(type, style);
        var key = JSON.stringify(['formattedValue', value.name, type, style]);
        return this._useSharedConst(key, value.name, function () {
            return buildFormatterCall(formatterId, value);
        });
    };
    ComponentContext.prototype.useWithOffset = function (value, offset) {
        if (offset === void 0) { offset = 0; }
        if (offset === 0) {
            return value;
        }
        var key = JSON.stringify(['withOffset', value.name, offset]);
        return this._useSharedConst(key, value.name + "_offset_" + offset, function () {
            return t.binaryExpression('-', value, t.numericLiteral(offset));
        });
    };
    ComponentContext.prototype.useLocalizedMatcher = function (value, pluralType) {
        if (pluralType === void 0) { pluralType = 'cardinal'; }
        var key = JSON.stringify(['localizedMatcher', value.name, pluralType]);
        var pluralRules = this.usePlural(pluralType);
        return this._useSharedConst(key, value.name + "_loc", function () {
            return buildPluralRulesCall(pluralRules, value);
        });
    };
    ComponentContext.prototype.usePlural = function (type) {
        if (type === void 0) { type = 'cardinal'; }
        return this._module.usePlural(type);
    };
    ComponentContext.prototype._useSharedConst = function (key, name, build) {
        var sharedConst = this._sharedConsts.get(key);
        if (sharedConst) {
            return t.identifier(sharedConst.localName);
        }
        var localName = this._scope.createUniqueBinding(name);
        this._sharedConsts.set(key, { localName: localName, init: build() });
        return t.identifier(localName);
    };
    ComponentContext.prototype.buildArgsAst = function () {
        if (this.args.size <= 0) {
            return [];
        }
        else {
            var argsObjectPattern = t.objectPattern(Array.from(this.args.entries(), function (_a) {
                var _b = __read(_a, 2), name = _b[0], arg = _b[1];
                var key = t.identifier(name);
                var value = arg.localName ? t.identifier(arg.localName) : key;
                return t.objectProperty(key, value, false, !arg.localName);
            }));
            argsObjectPattern.typeAnnotation = t.tsTypeAnnotation(t.tsTypeLiteral(Array.from(this.args.entries(), function (_a) {
                var _b = __read(_a, 2), name = _b[0], arg = _b[1];
                return t.tsPropertySignature(t.identifier(name), t.tsTypeAnnotation(getTypeAnnotation(arg.type)));
            })));
            return [argsObjectPattern];
        }
    };
    ComponentContext.prototype._buildSharedConstAst = function (sharedConst) {
        return t.variableDeclaration('const', [
            t.variableDeclarator(t.identifier(sharedConst.localName), sharedConst.init)
        ]);
    };
    ComponentContext.prototype.buildSharedConstsAst = function () {
        var _this = this;
        return Array.from(this._sharedConsts.values(), function (sharedConst) {
            return _this._buildSharedConstAst(sharedConst);
        });
    };
    return ComponentContext;
}());
function icuToReactComponent(componentName, icuStr, module) {
    var context = createContext(module);
    var icuAst = mf.parse(icuStr, {
        captureLocation: true
    });
    var returnValue = icuNodesToJsExpression(icuAst, context);
    var ast = t.functionExpression(t.identifier(componentName), context.buildArgsAst(), t.blockStatement(__spread(context.buildSharedConstsAst(), [
        t.returnStatement(returnValue.ast)
    ])));
    return {
        ast: ast,
        args: context.args
    };
}
exports.default = icuToReactComponent;
