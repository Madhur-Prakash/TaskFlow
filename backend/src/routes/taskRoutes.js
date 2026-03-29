const router = require('express').Router();
const taskController = require('../controllers/taskController');
const { protect } = require('../middlewares/auth');
const { validate, schemas } = require('../validators');

router.use(protect);

router.route('/orgs/:orgId/tasks')
  .get(taskController.getTasks)
  .post(validate(schemas.createTask), taskController.createTask);

router.route('/tasks/:taskId')
  .patch(validate(schemas.updateTask), taskController.updateTask)
  .delete(taskController.deleteTask);

module.exports = router;
