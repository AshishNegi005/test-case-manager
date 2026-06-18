const router = require('express').Router();
const ctrl = require('../controllers/projectController');
const { authenticate, adminOrLead, adminOnly } = require('../middleware/auth');
const { sanitizeBody } = require('../middleware/validate');

router.use(authenticate);

router.get('/', ctrl.getProjects);
router.get('/:id', ctrl.getProject);
router.post('/', adminOrLead, sanitizeBody, ctrl.createProject);
router.put('/:id', adminOrLead, sanitizeBody, ctrl.updateProject);
router.delete('/:id', adminOnly, ctrl.deleteProject);
router.post('/:id/members', adminOrLead, ctrl.addMember);
router.delete('/:id/members/:userId', adminOrLead, ctrl.removeMember);

module.exports = router;
