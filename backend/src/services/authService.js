const userRepo = require('../repositories/userRepo');
const AppError = require('../utils/AppError');
const { generateTokens } = require('../utils/jwt');
const { verifyToken } = require('../utils/jwt');

const register = async ({ name, email, password }) => {
  const existing = await userRepo.findByEmail(email);
  if (existing) throw new AppError('Email already registered', 409);
  const user = await userRepo.create({ name, email, password });
  const tokens = generateTokens(user._id, user.role);
  await userRepo.updateRefreshToken(user._id, tokens.refreshToken);
  return { user, tokens };
};

const login = async ({ email, password }) => {
  const user = await userRepo.findByEmail(email);
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }
  const tokens = generateTokens(user._id, user.role);
  await userRepo.updateRefreshToken(user._id, tokens.refreshToken);
  return { user, tokens };
};

const refresh = async (token) => {
  if (!token) throw new AppError('No refresh token', 401);
  const decoded = verifyToken(token, process.env.JWT_REFRESH_SECRET);
  const user = await userRepo.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== token) throw new AppError('Invalid refresh token', 401);
  const tokens = generateTokens(user._id, user.role);
  await userRepo.updateRefreshToken(user._id, tokens.refreshToken);
  return tokens;
};

const logout = async (userId) => {
  await userRepo.updateRefreshToken(userId, null);
};

module.exports = { register, login, refresh, logout };
