const Organization = require('../models/Organization');

const orgRepo = {
  create: (data) => Organization.create(data),
  findById: (id) => Organization.findById(id).populate('owner', 'name email').populate('members.user', 'name email'),
  findByOwnerOrMember: (userId) =>
    Organization.find({
      $or: [{ owner: userId }, { 'members.user': userId }],
    }).populate('owner', 'name email'),
  findByIdRaw: (id) => Organization.findById(id),
  save: (org) => org.save(),
  delete: (id) => Organization.findByIdAndDelete(id),
};

module.exports = orgRepo;
