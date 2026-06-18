const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/testSuiteController');
const { authenticate, adminOrLead } = require('../middleware/auth');
const { sanitizeBody } = require('../middleware/validate');

router.use(authenticate);

router.get('/', ctrl.getSuites);
router.get('/:id', ctrl.getSuite);
router.post('/', adminOrLead, sanitizeBody, ctrl.createSuite);
router.put('/:id', adminOrLead, sanitizeBody, ctrl.updateSuite);
router.delete('/:id', adminOrLead, ctrl.deleteSuite);
router.post('/:id/cases', adminOrLead, ctrl.addCaseToSuite);
router.delete('/:id/cases/:caseId', adminOrLead, ctrl.removeCaseFromSuite);

module.exports = router;
