import * as t from '@babel/types';

export type Json =
  | undefined
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

/**
 * Build an AST for a literal JSON value
 */
export function buildJson(value: Json): t.Expression {
  if (typeof value === 'string') {
    return t.stringLiteral(value);
  } else if (typeof value === 'number') {
    return t.numericLiteral(value);
  } else if (typeof value === 'boolean') {
    return t.booleanLiteral(value);
  } else if (Array.isArray(value)) {
    return t.arrayExpression(value.map(buildJson));
  } else if (value === null) {
    return t.nullLiteral();
  } else if (value === undefined) {
    return t.identifier('undefined');
  } else if (typeof value === 'object') {
    return t.objectExpression(
      Object.entries(value).map(([propKey, propValue]) => {
        return t.objectProperty(t.identifier(propKey), buildJson(propValue));
      })
    );
  }
  throw new Error(`value type not supported "${value}"`);
}

/**
 * Build an AST for the expression: `React.createElement(element, null, ...children)`
 */
export function buildReactElement(
  element: t.Expression,
  children: t.Expression[]
) {
  return t.callExpression(
    t.memberExpression(t.identifier('React'), t.identifier('createElement')),
    [element, t.nullLiteral(), ...children]
  );
}

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
export function buildTernaryChain(
  cases: Map<t.Expression, t.Expression>,
  alternate: t.Expression
): t.Expression {
  if (cases.size <= 0) {
    return alternate;
  }
  const [[test, consequent], ...restCases] = cases;
  return t.conditionalExpression(
    test,
    consequent,
    buildTernaryChain(new Map(restCases), alternate)
  );
}

/**
 * Build an AST for chaining binary expressions
 * @example
 * a + b + c + d + e + ...
 */
export function buildBinaryChain(
  operator: t.BinaryExpression['operator'],
  ...operands: t.Expression[]
): t.BinaryExpression {
  if (operands.length < 2) {
    throw new Error(
      'buildBinaryChain should be called with at least 2 operands'
    );
  } else if (operands.length === 2) {
    return t.binaryExpression(operator, operands[0], operands[1]);
  } else {
    const rest = operands.slice(0, -1);
    const last = operands[operands.length - 1];
    return t.binaryExpression(
      operator,
      buildBinaryChain(operator, ...rest),
      last
    );
  }
}
