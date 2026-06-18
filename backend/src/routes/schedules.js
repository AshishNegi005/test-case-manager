const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticate, adminOrLead } = require('../middleware/auth');
const { getSchedules, createSchedule, updateSchedule, deleteSchedule } = require('../controllers/scheduleController');

router.get('/', authenticate, getSchedules);
router.post('/', authenticate, adminOrLead, createSchedule);
router.put('/:scheduleId', authenticate, adminOrLead, updateSchedule);
router.delete('/:scheduleId', authenticate, adminOrLead, deleteSchedule);

module.exports = router;
