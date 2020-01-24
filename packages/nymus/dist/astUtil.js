"use strict";
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
/**
 * Build an AST for a literal JSON value
 */
function buildJson(value) {
    if (typeof value === 'string') {
        return t.stringLiteral(value);
    }
    else if (typeof value === 'number') {
        return t.numericLiteral(value);
    }
    else if (typeof value === 'boolean') {
        return t.booleanLiteral(value);
    }
    else if (Array.isArray(value)) {
        return t.arrayExpression(value.map(buildJson));
    }
    else if (value === null) {
        return t.nullLiteral();
    }
    else if (value === undefined) {
        return t.identifier('undefined');
    }
    else if (typeof value === 'object') {
        return t.objectExpression(Object.entries(value).map(function (_a) {
            var _b = __read(_a, 2), propKey = _b[0], propValue = _b[1];
            return t.objectProperty(t.identifier(propKey), buildJson(propValue));
        }));
    }
    throw new Error("value type not supported \"" + value + "\"");
}
exports.buildJson = buildJson;
/**
 * Build an AST for the expression: `React.createElement(element, null, ...children)`
 */
function buildReactElement(element, children) {
    return t.callExpression(t.memberExpression(t.identifier('React'), t.identifier('createElement')), __spread([element, t.nullLiteral()], children));
}
exports.buildReactElement = buildReactElement;
/**
 * builds the AST for chained ternaries:
 * @example
 * test1
 *   ? consequent1
 *   : test2
 *     ? consequent2
 *     // ...
 *     : alternate
 */
function buildTernaryChain(cases, alternate) {
    if (cases.length <= 0) {
        return alternate;
    }
    var _a = __read(cases), _b = __read(_a[0], 2), test = _b[0], consequent = _b[1], restCases = _a.slice(1);
    return t.conditionalExpression(test, consequent, buildTernaryChain(restCases, alternate));
}
exports.buildTernaryChain = buildTernaryChain;
/**
 * Build an AST for chaining binary expressions
 * @example
 * a + b + c + d + e + ...
 */
function buildBinaryChain(operator) {
    var operands = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        operands[_i - 1] = arguments[_i];
    }
    if (operands.length < 2) {
        throw new Error('buildBinaryChain should be called with at least 2 operands');
    }
    else if (operands.length === 2) {
        return t.binaryExpression(operator, operands[0], operands[1]);
    }
    else {
        var rest = operands.slice(0, -1);
        var last = operands[operands.length - 1];
        return t.binaryExpression(operator, buildBinaryChain.apply(void 0, __spread([operator], rest)), last);
    }
}
exports.buildBinaryChain = buildBinaryChain;
