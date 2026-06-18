const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticate, adminOrLead } = require('../middleware/auth');
const { generateKey, listKeys, revokeKey, deleteKey } = require('../controllers/apiKeyController');

router.get('/', authenticate, adminOrLead, listKeys);
router.post('/', authenticate, adminOrLead, generateKey);
router.patch('/:keyId/revoke', authenticate, adminOrLead, revokeKey);
router.delete('/:keyId', authenticate, adminOrLead, deleteKey);

module.exports = router;
