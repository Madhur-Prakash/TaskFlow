const orgService = require('../services/orgService');
const asyncHandler = require('../utils/asyncHandler');

exports.createOrg = asyncHandler(async (req, res) => {
  const org = await orgService.createOrg(req.body.name, req.user._id);
  res.status(201).json({ success: true, data: org });
});

exports.getMyOrgs = asyncHandler(async (req, res) => {
  const orgs = await orgService.getUserOrgs(req.user._id);
  res.json({ success: true, data: orgs });
});

exports.getOrg = asyncHandler(async (req, res) => {
  const org = await orgService.getOrgById(req.params.orgId);
  res.json({ success: true, data: org });
});

exports.addMember = asyncHandler(async (req, res) => {
  const org = await orgService.addMember(req.params.orgId, req.body.userId, req.body.role);
  const io = req.app.get('io');
  if (io) io.to(`org_${req.params.orgId}`).emit('org:memberAdded', { orgId: req.params.orgId, userId: req.body.userId, role: req.body.role });
  res.status(201).json({ success: true, data: org });
});

exports.removeMember = asyncHandler(async (req, res) => {
  const org = await orgService.removeMember(req.params.orgId, req.params.userId);
  const io = req.app.get('io');
  if (io) io.to(`org_${req.params.orgId}`).emit('org:memberRemoved', { orgId: req.params.orgId, userId: req.params.userId });
  res.json({ success: true, data: org });
});

exports.updateMemberRole = asyncHandler(async (req, res) => {
  const org = await orgService.updateMemberRole(req.params.orgId, req.params.userId, req.body.role);
  const io = req.app.get('io');
  if (io) io.to(`org_${req.params.orgId}`).emit('org:memberRoleUpdated', { orgId: req.params.orgId, userId: req.params.userId, role: req.body.role });
  res.json({ success: true, data: org });
});

exports.deleteOrg = asyncHandler(async (req, res) => {
  await orgService.deleteOrg(req.params.orgId);
  const io = req.app.get('io');
  if (io) io.to(`org_${req.params.orgId}`).emit('org:deleted', { orgId: req.params.orgId });
  res.json({ success: true, message: 'Organization deleted' });
});
