const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticate, adminOrLead } = require('../middleware/auth');
const { getVersions, restoreVersion } = require('../controllers/versionController');

router.get('/', authenticate, getVersions);
router.post('/:versionId/restore', authenticate, adminOrLead, restoreVersion);

module.exports = router;
