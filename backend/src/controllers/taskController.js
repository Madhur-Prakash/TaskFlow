const taskService = require('../services/taskService');
const asyncHandler = require('../utils/asyncHandler');

exports.getTasks = asyncHandler(async (req, res) => {
  const tasks = await taskService.getOrgTasks(req.params.orgId, req.user._id.toString());
  res.json({ success: true, data: tasks });
});

exports.createTask = asyncHandler(async (req, res) => {
  const task = await taskService.createTask(req.params.orgId, req.body, req.user._id.toString());
  const io = req.app.get('io');
  if (io) {
    console.log(`[Socket] Emitting task:created to org_${req.params.orgId}`, task._id);
    io.to(`org_${req.params.orgId}`).emit('task:created', task);
  }
  res.status(201).json({ success: true, data: task });
});

exports.updateTask = asyncHandler(async (req, res) => {
  const task = await taskService.updateTask(req.params.taskId, req.body, req.user._id.toString());
  const io = req.app.get('io');
  if (io && task) {
    // organization is populated as object by taskRepo.update
    const orgId = (task.organization?._id ?? task.organization)?.toString();
    if (orgId) io.to(`org_${orgId}`).emit('task:updated', task);
  }
  res.json({ success: true, data: task });
});

exports.deleteTask = asyncHandler(async (req, res) => {
  const orgId = await taskService.deleteTask(req.params.taskId, req.user._id.toString());
  const io = req.app.get('io');
  if (io && orgId) {
    console.log(`[Socket] Emitting task:deleted to org_${orgId}`, req.params.taskId);
    io.to(`org_${orgId}`).emit('task:deleted', { taskId: req.params.taskId });
  }
  res.json({ success: true, message: 'Task deleted' });
});

