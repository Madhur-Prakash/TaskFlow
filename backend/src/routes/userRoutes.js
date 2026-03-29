const router = require('express').Router();
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middlewares/auth');

router.use(protect);
router.get('/', userController.getAllUsers);          // any authenticated user (needed for add-member UI)
router.get('/admin', restrictTo('admin'), userController.getAllUsers); // full list, admin only

module.exports = router;
