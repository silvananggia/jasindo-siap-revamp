const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  const target =
    process.env.PETAKGEN_PROXY_TARGET ||
    'https://petakgen.jasindo-eqi.cloud';

  app.use(
    '/petak-gen',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      secure: true,
      pathRewrite: {
        '^/petak-gen': '',
      },
      timeout: 60000,
      proxyTimeout: 60000,
    })
  );
};
