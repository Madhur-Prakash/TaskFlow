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

// Validate that a provided assignee is either the org owner or a listed member
const validateAssignee = async (orgId, assigneeId) => {
  if (!assigneeId) return;
  const org = await orgRepo.findByIdRaw(orgId);
  if (!org) throw new AppError('Organization not found', 404);
  const isMember = org.owner.toString() === assigneeId || org.members.some((m) => m.user.toString() === assigneeId);
  if (!isMember) throw new AppError('Assignee must be a member of this organization', 400);
};

const getOrgTasks = async (orgId, userId) => {
  // Any org member (admin or member) can see all tasks in the organization.
  // Keep caching per-organization for performance.
  await assertOrgMember(orgId, userId);
  const cacheKey = keys.orgTasks(orgId);
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const tasks = await taskRepo.findByOrg(orgId);
  await cache.set(cacheKey, tasks);
  return tasks;
};

const createTask = async (orgId, data, userId) => {
  const role = await assertOrgMember(orgId, userId);

  if (role === 'member') {
    // Members can only assign tasks to themselves
    const assignee = data.assignedTo ? data.assignedTo.toString() : null;
    const userIdStr = userId.toString();
    if (assignee && assignee !== userIdStr) {
      throw new AppError('Members can only assign tasks to themselves', 403);
    }
    // Auto-assign to self if not specified
    data.assignedTo = userId;
  } else if (role === 'admin') {
    // Admins may optionally assign a task. If they provide an assignee, ensure it's part of the org (owner or member).
    const assignee = data.assignedTo ? data.assignedTo.toString() : null;
    if (assignee) {
      await validateAssignee(orgId, assignee);
    } else {
      // Default to the creating admin when no assignee is provided
      data.assignedTo = userId;
    }
  }

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

  // Only admins can change the assignee field
  if (Object.prototype.hasOwnProperty.call(data, 'assignedTo')) {
    const newAssignee = data.assignedTo ? data.assignedTo.toString() : null;
    const currentAssignee = task.assignedTo?._id?.toString() || null;
    if (newAssignee !== currentAssignee && role !== 'admin') {
      throw new AppError('Only admins can change task assignee', 403);
    }
  }

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
  return orgId;
};

module.exports = { getOrgTasks, createTask, updateTask, deleteTask, invalidateOrgTasks };
