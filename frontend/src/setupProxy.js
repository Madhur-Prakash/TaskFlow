const { createProxyMiddleware } = require('http-proxy-middleware');

const BACKEND = 'http://localhost:5000';

module.exports = function (app) {
  app.use(
    ['/api', '/socket.io'],
    createProxyMiddleware({
      target: BACKEND,
      changeOrigin: true,
      ws: true,
      // Inject a shared secret so the backend can reject requests that arrive
      // without going through this proxy (i.e. direct API access bypassing the frontend).
      // The secret must match INTERNAL_PROXY_SECRET in backend/.env
      onProxyReq: (proxyReq) => {
        const secret = process.env.REACT_APP_INTERNAL_PROXY_SECRET;
        if (secret) proxyReq.setHeader('X-Internal-Proxy', secret);
      },
    })
  );
};
