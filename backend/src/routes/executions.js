const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/executionController');
const { authenticate, canExecute } = require('../middleware/auth');
const { sanitizeBody } = require('../middleware/validate');
const { executionLimiter } = require('../middleware/rateLimiter');

router.use(authenticate);

router.get('/', ctrl.getExecutions);
router.post('/', executionLimiter, canExecute, sanitizeBody, ctrl.createExecution);
router.post('/suite', executionLimiter, canExecute, sanitizeBody, ctrl.executeSuite);

module.exports = router;
