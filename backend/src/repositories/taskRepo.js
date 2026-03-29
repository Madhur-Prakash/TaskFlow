const Task = require('../models/Task');

const taskRepo = {
  create: (data) => Task.create(data),
  findById: (id) => Task.findById(id).populate('assignedTo', 'name email').populate('createdBy', 'name email'),
  findByOrg: (orgId) => Task.find({ organization: orgId }).populate('assignedTo', 'name email').populate('createdBy', 'name email'),
  findByAssignee: (userId, orgId) => Task.find({ assignedTo: userId, organization: orgId }).populate('assignedTo', 'name email'),
  update: (id, data) => Task.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate('assignedTo', 'name email'),
  delete: (id) => Task.findByIdAndDelete(id),
};

module.exports = taskRepo;
