const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const msg = error.details.map((d) => d.message).join(', ');
    return res.status(400).json({ success: false, message: msg });
  }
  next();
};

const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  createOrg: Joi.object({
    name: Joi.string().min(2).max(100).required(),
  }),

  addMember: Joi.object({
    userId: Joi.string().required(),
    role: Joi.string().valid('admin', 'member').default('member'),
  }),

  createTask: Joi.object({
    title: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(1000).allow('').optional(),
    status: Joi.string().valid('todo', 'in-progress', 'done').optional(),
    priority: Joi.string().valid('low', 'medium', 'high').optional(),
    assignedTo: Joi.string().optional().allow(null, ''),
  }),

  updateTask: Joi.object({
    title: Joi.string().min(1).max(200).optional(),
    description: Joi.string().max(1000).allow('').optional(),
    status: Joi.string().valid('todo', 'in-progress', 'done').optional(),
    priority: Joi.string().valid('low', 'medium', 'high').optional(),
    assignedTo: Joi.string().optional().allow(null, ''),
  }),
};

module.exports = { validate, schemas };
