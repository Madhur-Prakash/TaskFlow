const jwt = require('jsonwebtoken');

const signToken = (payload, secret, expiresIn) =>
  jwt.sign(payload, secret, { expiresIn });

const verifyToken = (token, secret) => jwt.verify(token, secret);

const generateTokens = (userId, role) => ({
  accessToken: signToken({ id: userId, role }, process.env.JWT_SECRET, process.env.JWT_EXPIRES_IN),
  refreshToken: signToken({ id: userId }, process.env.JWT_REFRESH_SECRET, process.env.JWT_REFRESH_EXPIRES_IN),
});

const setTokenCookies = (res, accessToken, refreshToken) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

module.exports = { generateTokens, setTokenCookies, verifyToken };
