import * as path from 'path';
import icur from './index';
import { loader } from 'webpack';

const icurLoader: loader.Loader = function icurLoader(source) {
  const locale = path.basename(this.resourcePath, '.json');
  const messages = JSON.parse(String(source));
  const { code } = icur(messages, { locale });
  return code;
};

export default icurLoader;
