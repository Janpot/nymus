const path = require('path');

const locale = process.env.LOCALE;
const locales = process.env.LOCALES.split(',');

const basePath = process.env.BASE_PATH || `/${locale}`;

module.exports = {
  distDir: `./.next/${locale}`,
  experimental: {
    basePath
  },
  env: {
    LOCALE: locale,
    LOCALES: locales.join(',')
  },
  webpack: (config, options) => {
    config.resolve.alias['@locale'] = path.resolve(
      __dirname,
      `./locales/${locale}`
    );

    config.module.rules.push({
      test: /\.json$/,
      include: [path.resolve(__dirname, './locales/')],
      type: 'javascript/auto',
      use: [
        options.defaultLoaders.babel,
        {
          loader: 'nymus/webpack',
          options: { locale, declarations: false }
        }
      ]
    });

    return config;
  }
};