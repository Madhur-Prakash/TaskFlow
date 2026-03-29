const router = require('express').Router();
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const { validate, schemas } = require('../validators');

router.post('/register', validate(schemas.register), authController.register);
router.post('/login', validate(schemas.login), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.me);

module.exports = router;
