const User = require('../models/User');

const userRepo = {
  findByEmail: (email) => User.findOne({ email }).select('+password +refreshToken'),
  findById: (id) => User.findById(id),
  create: (data) => User.create(data),
  updateRefreshToken: (id, token) => User.findByIdAndUpdate(id, { refreshToken: token }),
  findAll: () => User.find().select('-password'),
};

module.exports = userRepo;
