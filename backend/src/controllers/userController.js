const userRepo = require('../repositories/userRepo');
const asyncHandler = require('../utils/asyncHandler');

exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await userRepo.findAll();
  res.json({ success: true, data: users });
});
