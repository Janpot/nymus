import createModule from './index';
import { loader } from 'webpack';
import * as loaderUtils from 'loader-utils';
import * as fs from 'fs';
import { promisify } from 'util';

const fsWriteFile = promisify(fs.writeFile);

const icuLoader: loader.Loader = function icuLoader(source) {
  const options = loaderUtils.getOptions(this);
  const callback = this.async();
  const messages = JSON.parse(String(source));
  createModule(messages, { ...options, react: true })
    .then(async ({ code, declarations }) => {
      if (options.declarations && declarations) {
        const declarationsPath = this.resourcePath + '.d.ts';
        await fsWriteFile(declarationsPath, declarations, {
          encoding: 'utf-8',
        });
      }
      callback!(null, code);
    })
    .catch(callback);
};

export default icuLoader;
