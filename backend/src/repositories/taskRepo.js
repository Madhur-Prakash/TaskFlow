const Task = require('../models/Task');
const mongoose = require('mongoose');

const taskRepo = {
  create: (data) => Task.create(data),
  findById: (id) => Task.findById(id).populate('assignedTo', 'name email').populate('createdBy', 'name email'),
  findByOrg: (orgId) => Task.find({ organization: orgId }).populate('assignedTo', 'name email').populate('createdBy', 'name email'),
  findByAssignee: (userId, orgId) => {
    // Ensure we query with an ObjectId so string ids match reliably
    let assignee = null;
    try {
      assignee = mongoose.Types.ObjectId(userId);
    } catch (e) {
      assignee = userId;
    }
    return Task.find({ assignedTo: assignee, organization: orgId }).populate('assignedTo', 'name email').populate('createdBy', 'name email');
  },
  update: (id, data) => Task.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate('assignedTo', 'name email').populate('createdBy', 'name email').populate('organization'),
  delete: (id) => Task.findByIdAndDelete(id),
};

module.exports = taskRepo;
