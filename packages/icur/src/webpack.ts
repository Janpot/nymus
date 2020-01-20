import createModule from './index';
import { loader } from 'webpack';

const icuLoader: loader.Loader = function icuLoader(source) {
  const callback = this.async();
  const messages = JSON.parse(String(source));
  createModule(messages, { react: true })
    .then(({ code }) => callback!(null, code))
    .catch(callback);
};

export default icuLoader;
