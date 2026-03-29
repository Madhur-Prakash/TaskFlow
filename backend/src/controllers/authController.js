const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');
const { setTokenCookies } = require('../utils/jwt');

exports.register = asyncHandler(async (req, res) => {
  const { user, tokens } = await authService.register(req.body);
  setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
  res.status(201).json({ success: true, data: { user, accessToken: tokens.accessToken } });
});

exports.login = asyncHandler(async (req, res) => {
  const { user, tokens } = await authService.login(req.body);
  setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
  res.json({ success: true, data: { user, accessToken: tokens.accessToken } });
});

exports.refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  const tokens = await authService.refresh(token);
  setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
  res.json({ success: true, data: { accessToken: tokens.accessToken } });
});

exports.logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user._id);
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out' });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});
