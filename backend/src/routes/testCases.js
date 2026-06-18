const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/testCaseController');
const { authenticate, adminOrLead } = require('../middleware/auth');
const { sanitizeBody } = require('../middleware/validate');
const { testCaseLimiter } = require('../middleware/rateLimiter');

router.use(authenticate);

router.get('/', testCaseLimiter, ctrl.getTestCases);
router.get('/:id', ctrl.getTestCase);
router.post('/', adminOrLead, sanitizeBody, ctrl.createTestCase);
router.put('/:id', adminOrLead, sanitizeBody, ctrl.updateTestCase);
router.delete('/:id', adminOrLead, ctrl.deleteTestCase);
router.post('/bulk', adminOrLead, ctrl.bulkUpdate);

module.exports = router;
