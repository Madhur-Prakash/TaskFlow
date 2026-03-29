const orgRepo = require('../repositories/orgRepo');
const userRepo = require('../repositories/userRepo');
const AppError = require('../utils/AppError');
const cache = require('../utils/cache');

// Cache key helpers
const keys = {
  userOrgs: (userId) => `orgs:user:${userId}`,
  org: (orgId) => `orgs:${orgId}`,
};

// Invalidate all cache entries that could be affected by a change to an org
const invalidateOrg = async (orgId, memberUserIds = []) => {
  const patterns = [keys.org(orgId), ...memberUserIds.map(keys.userOrgs)];
  await cache.del(...patterns);
};

const createOrg = async (name, ownerId) => {
  const org = await orgRepo.create({
    name,
    owner: ownerId,
    members: [{ user: ownerId, role: 'admin' }],
  });
  await cache.del(keys.userOrgs(ownerId.toString()));
  return orgRepo.findById(org._id);
};

const getUserOrgs = async (userId) => {
  const cacheKey = keys.userOrgs(userId.toString());
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const orgs = await orgRepo.findByOwnerOrMember(userId);
  await cache.set(cacheKey, orgs);
  return orgs;
};

const getOrgById = async (orgId) => {
  const cacheKey = keys.org(orgId.toString());
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const org = await orgRepo.findById(orgId);
  if (!org) throw new AppError('Organization not found', 404);
  await cache.set(cacheKey, org);
  return org;
};

const addMember = async (orgId, userId, role = 'member') => {
  const org = await orgRepo.findByIdRaw(orgId);
  if (!org) throw new AppError('Organization not found', 404);

  const user = await userRepo.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  const alreadyMember = org.members.some((m) => m.user.toString() === userId);
  if (alreadyMember) throw new AppError('User is already a member', 409);

  org.members.push({ user: userId, role });
  await orgRepo.save(org);

  const allMemberIds = org.members.map((m) => m.user.toString());
  await invalidateOrg(orgId, allMemberIds);

  return orgRepo.findById(orgId);
};

const removeMember = async (orgId, userId) => {
  const org = await orgRepo.findByIdRaw(orgId);
  if (!org) throw new AppError('Organization not found', 404);
  if (org.owner.toString() === userId) throw new AppError('Cannot remove the owner', 400);

  const allMemberIds = org.members.map((m) => m.user.toString());
  org.members = org.members.filter((m) => m.user.toString() !== userId);
  await orgRepo.save(org);

  await invalidateOrg(orgId, allMemberIds);
  return orgRepo.findById(orgId);
};

const updateMemberRole = async (orgId, userId, role) => {
  const org = await orgRepo.findByIdRaw(orgId);
  if (!org) throw new AppError('Organization not found', 404);

  const member = org.members.find((m) => m.user.toString() === userId);
  if (!member) throw new AppError('Member not found', 404);

  member.role = role;
  await orgRepo.save(org);

  const allMemberIds = org.members.map((m) => m.user.toString());
  await invalidateOrg(orgId, allMemberIds);

  return orgRepo.findById(orgId);
};

const deleteOrg = async (orgId) => {
  const org = await orgRepo.findByIdRaw(orgId);
  if (org) {
    const allMemberIds = org.members.map((m) => m.user.toString());
    await invalidateOrg(orgId, allMemberIds);
  }
  return orgRepo.delete(orgId);
};

module.exports = { createOrg, getUserOrgs, getOrgById, addMember, removeMember, updateMemberRole, deleteOrg };
