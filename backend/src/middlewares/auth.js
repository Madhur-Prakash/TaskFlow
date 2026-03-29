const { verifyToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.accessToken;

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) throw new AppError('Not authenticated', 401);

  const decoded = verifyToken(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  if (!user) throw new AppError('User no longer exists', 401);

  req.user = user;
  next();
});

const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission', 403));
  }
  next();
};

module.exports = { protect, restrictTo };
