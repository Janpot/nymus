import { createModuleAst } from 'nymus';
import { format } from 'prettier/standalone';
import parserBabylon from 'prettier/parser-babylon';
import generate from '@babel/generator';

export default async function transform(input: {
  [key: string]: string;
}): Promise<string> {
  const ast = await createModuleAst(input, { typescript: true, react: true });
  const { code } = generate(ast, { concise: true });
  const formatted = format(code, {
    parser: 'babel',
    plugins: [parserBabylon]
  });
  return formatted;
}
