module.exports = {
  typescript: {
    ignoreDevErrors: true,
  },
  experimental: {
    polyfillsOptimization: true,
    redirects: async () => {
      return [
        {
          source: '/docs',
          destination: '/docs/getting-started',
          permanent: true,
        },
      ];
    },
  },
  webpack: (config, options) => {
    if (!options.isServer) {
      // Hack to make importing @babel/core not fail
      // TODO: Come up with a better alternative
      config.externals = config.externals || {};
      config.externals.fs = 'null';
      config.externals.typescript = 'null';
    }
    return config;
  },
};
