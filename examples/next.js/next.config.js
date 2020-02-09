const path = require('path');
const fs = require('fs');

const locale = process.env.LOCALE || 'en';

const basePath = process.env.BASE_PATH || `/${locale}`;
const localesFolder = path.resolve(__dirname, './locales/');
const locales = fs.readdirSync(localesFolder);

module.exports = {
  experimental: {
    basePath,
    rewrites: async () => {
      const localeRewrites = [];
      for (const locale of locales) {
        const localeUrl = process.env[`LOCALE_URL_${locale}`];
        if (localeUrl) {
          const destination = new URL(`/${locale}/:path*`, localeUrl);
          localeRewrites.push({
            source: `/${locale}/:path*`,
            destination: destination.toString()
          });
        }
      }
      return localeRewrites;
    }
  },
  assetPrefix: basePath,
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
      include: [localesFolder],
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
