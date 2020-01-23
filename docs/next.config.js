module.exports = {
  typescript: {
    ignoreDevErrors: true
  },
  experimental: {
    redirects: async () => {
      return [
        {
          source: '/docs',
          destination: '/docs/getting-started',
          permanent: true
        }
      ];
    }
  },
  webpack: (config, options) => {
    if (!options.isServer) {
      // Hack to make importing @babel/core not fail
      // TODO: Come up with a better alternative
      config.externals = config.externals || {};
      config.externals.fs = 'fs';
    }
    return config;
  }
};
