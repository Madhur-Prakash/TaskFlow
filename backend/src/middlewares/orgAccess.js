const Organization = require('../models/Organization');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// Attaches org to req and checks membership
const requireOrgMember = asyncHandler(async (req, res, next) => {
  const org = await Organization.findById(req.params.orgId).populate('members.user', 'name email');
  if (!org) throw new AppError('Organization not found', 404);

  const member = org.members.find((m) => m.user._id.toString() === req.user._id.toString());
  const isOwner = org.owner.toString() === req.user._id.toString();

  if (!member && !isOwner) throw new AppError('You are not a member of this organization', 403);

  req.org = org;
  req.orgRole = isOwner ? 'admin' : member.role;
  next();
});

const requireOrgAdmin = asyncHandler(async (req, res, next) => {
  await requireOrgMember(req, res, () => {});
  if (req.orgRole !== 'admin') throw new AppError('Organization admin access required', 403);
  next();
});

module.exports = { requireOrgMember, requireOrgAdmin };
