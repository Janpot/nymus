import * as t from '@babel/types';

type Literal =
  | string
  | number
  | boolean
  | null
  | Literal[]
  | { [key: string]: Literal };

export function buildLiteralAst(value: Literal): t.Expression {
  if (typeof value === 'string') {
    return t.stringLiteral(value);
  } else if (typeof value === 'number') {
    return t.numericLiteral(value);
  } else if (Array.isArray(value)) {
    return t.arrayExpression(value.map(buildLiteralAst));
  } else if (value === null) {
    return t.nullLiteral();
  } else if (typeof value === 'object') {
    return t.objectExpression(
      Object.entries(value).map(([propKey, propValue]) => {
        return t.objectProperty(
          t.identifier(propKey),
          buildLiteralAst(propValue)
        );
      })
    );
  }
  throw new Error('value type not supported');
}
