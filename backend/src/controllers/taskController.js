const taskService = require('../services/taskService');
const asyncHandler = require('../utils/asyncHandler');

exports.getTasks = asyncHandler(async (req, res) => {
  const tasks = await taskService.getOrgTasks(req.params.orgId, req.user._id.toString());
  res.json({ success: true, data: tasks });
});

exports.createTask = asyncHandler(async (req, res) => {
  const task = await taskService.createTask(req.params.orgId, req.body, req.user._id.toString());
  res.status(201).json({ success: true, data: task });
});

exports.updateTask = asyncHandler(async (req, res) => {
  const task = await taskService.updateTask(req.params.taskId, req.body, req.user._id.toString());
  res.json({ success: true, data: task });
});

exports.deleteTask = asyncHandler(async (req, res) => {
  await taskService.deleteTask(req.params.taskId, req.user._id.toString());
  res.json({ success: true, message: 'Task deleted' });
});
