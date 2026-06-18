const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');
const { analyticsLimiter } = require('../middleware/rateLimiter');

router.use(authenticate, analyticsLimiter);

router.get('/summary', ctrl.getSummary);
router.get('/trends', ctrl.getTrends);
router.get('/testers', ctrl.getTesterProgress);
router.get('/defects', ctrl.getDefectDensity);
router.get('/suites', ctrl.getSuiteReport);

module.exports = router;
