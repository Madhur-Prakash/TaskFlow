const taskRepo = require('../repositories/taskRepo');
const orgRepo = require('../repositories/orgRepo');
const AppError = require('../utils/AppError');
const cache = require('../utils/cache');

// Cache key helpers
const keys = {
  orgTasks: (orgId) => `tasks:org:${orgId}`,
  assigneeTasks: (userId, orgId) => `tasks:assignee:${userId}:org:${orgId}`,
};

const invalidateOrgTasks = async (orgId) => {
  // Wipe the full-org list and all per-assignee lists for this org
  await Promise.all([
    cache.del(keys.orgTasks(orgId)),
    cache.delPattern(`tasks:assignee:*:org:${orgId}`),
  ]);
};

const assertOrgMember = async (orgId, userId) => {
  const org = await orgRepo.findByIdRaw(orgId);
  if (!org) throw new AppError('Organization not found', 404);
  const isMember = org.members.some((m) => m.user.toString() === userId) || org.owner.toString() === userId;
  if (!isMember) throw new AppError('Not a member of this organization', 403);
  const member = org.members.find((m) => m.user.toString() === userId);
  return org.owner.toString() === userId ? 'admin' : member?.role;
};

const getOrgTasks = async (orgId, userId) => {
  const role = await assertOrgMember(orgId, userId);

  if (role === 'admin') {
    const cacheKey = keys.orgTasks(orgId);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const tasks = await taskRepo.findByOrg(orgId);
    await cache.set(cacheKey, tasks);
    return tasks;
  }

  // Members only see their assigned tasks
  const cacheKey = keys.assigneeTasks(userId, orgId);
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const tasks = await taskRepo.findByAssignee(userId, orgId);
  await cache.set(cacheKey, tasks);
  return tasks;
};

const createTask = async (orgId, data, userId) => {
  await assertOrgMember(orgId, userId);
  const task = await taskRepo.create({ ...data, organization: orgId, createdBy: userId });
  await invalidateOrgTasks(orgId);
  return task;
};

const updateTask = async (taskId, data, userId) => {
  const task = await taskRepo.findById(taskId);
  if (!task) throw new AppError('Task not found', 404);

  const orgId = task.organization.toString();
  const role = await assertOrgMember(orgId, userId);
  const isAssignee = task.assignedTo?._id.toString() === userId;
  const isCreator = task.createdBy._id.toString() === userId;

  if (role !== 'admin' && !isAssignee && !isCreator) {
    throw new AppError('Not authorized to update this task', 403);
  }

  const updated = await taskRepo.update(taskId, data);
  await invalidateOrgTasks(orgId);
  return updated;
};

const deleteTask = async (taskId, userId) => {
  const task = await taskRepo.findById(taskId);
  if (!task) throw new AppError('Task not found', 404);

  const orgId = task.organization.toString();
  const role = await assertOrgMember(orgId, userId);

  if (role !== 'admin' && task.createdBy._id.toString() !== userId) {
    throw new AppError('Not authorized to delete this task', 403);
  }

  await taskRepo.delete(taskId);
  await invalidateOrgTasks(orgId);
};

module.exports = { getOrgTasks, createTask, updateTask, deleteTask };
