const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middlewares/auth');

// Prevent rapid user enumeration by authenticated accounts
const userListLimiter = rateLimit({
  windowMs: 60 * 1000 * 5, // 5 minutes
  max: 30, // Limit to 30 requests per 5 minutes per user
  message: 'Too many requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(protect);
router.get('/', userListLimiter, userController.getAllUsers);
router.get('/admin', restrictTo('admin'), userController.getAllUsers);

module.exports = router;
