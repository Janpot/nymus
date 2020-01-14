import icur from './index';
import { loader } from 'webpack';

const icurLoader: loader.Loader = function icurLoader(source) {
  const messages = JSON.parse(String(source));
  const { code } = icur(messages);
  return code;
};

export default icurLoader;
