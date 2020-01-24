import * as t from '@babel/types';
export declare type Json = undefined | string | number | boolean | null | Json[] | {
    [key: string]: Json;
};
/**
 * Build an AST for a literal JSON value
 */
export declare function buildJson(value: Json): t.Expression;
/**
 * Build an AST for the expression: `React.createElement(element, null, ...children)`
 */
export declare function buildReactElement(element: t.Expression, children: t.Expression[]): t.CallExpression;
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
export declare function buildTernaryChain(cases: [t.Expression, t.Expression][], alternate: t.Expression): t.Expression;
/**
 * Build an AST for chaining binary expressions
 * @example
 * a + b + c + d + e + ...
 */
export declare function buildBinaryChain(operator: t.BinaryExpression['operator'], ...operands: t.Expression[]): t.BinaryExpression;
