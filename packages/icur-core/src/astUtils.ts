import * as t from '@babel/types';

type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export function buildJsonAst(value: Json): t.Expression {
  if (typeof value === 'string') {
    return t.stringLiteral(value);
  } else if (typeof value === 'number') {
    return t.numericLiteral(value);
  } else if (Array.isArray(value)) {
    return t.arrayExpression(value.map(buildJsonAst));
  } else if (value === null) {
    return t.nullLiteral();
  } else if (typeof value === 'object') {
    return t.objectExpression(
      Object.entries(value).map(([propKey, propValue]) => {
        return t.objectProperty(
          t.identifier(propKey),
          buildJsonAst(propValue)
        );
      })
    );
  }
  throw new Error('value type not supported');
}
