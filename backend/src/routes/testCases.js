const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/testCaseController');
const exportCtrl = require('../controllers/exportImportController');
const { authenticate, adminOrLead } = require('../middleware/auth');
const { sanitizeBody } = require('../middleware/validate');
const { testCaseLimiter } = require('../middleware/rateLimiter');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);

// Export — must come before /:id
router.get('/export/csv',   exportCtrl.exportCSV);
router.get('/export/excel', exportCtrl.exportExcel);

// Import
router.post('/import/csv',   adminOrLead, upload.single('file'), exportCtrl.importCSV);
router.post('/import/excel', adminOrLead, upload.single('file'), exportCtrl.importExcel);

// Standard CRUD
router.get('/',      testCaseLimiter, ctrl.getTestCases);
router.get('/:id',   ctrl.getTestCase);
router.post('/',     adminOrLead, sanitizeBody, ctrl.createTestCase);
router.put('/:id',   adminOrLead, sanitizeBody, ctrl.updateTestCase);
router.delete('/:id', adminOrLead, ctrl.deleteTestCase);
router.post('/bulk', adminOrLead, ctrl.bulkUpdate);

// Sub-resources
router.use('/:caseId/comments', require('./comments'));
router.use('/:caseId/versions', require('./versions'));

module.exports = router;
