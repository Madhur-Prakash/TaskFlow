const { createProxyMiddleware } = require('http-proxy-middleware');

const BACKEND = 'http://localhost:5000';

module.exports = function (app) {
  app.use(
    ['/api', '/socket.io'],
    createProxyMiddleware({
      target: BACKEND,
      changeOrigin: true,
      ws: true,
    })
  );
};
