    const express    = require('express');
    const router     = express.Router();
    const ctrl       = require('../controllers/fieldController');
    const authMiddleware = require('../middleware/authMiddleware');

   
    router.get('/',              ctrl.getFields);
    router.get('/:id',           ctrl.getFieldById);
    router.get('/:id/slots',     ctrl.getSlots);

    
    router.post('/',             authMiddleware, ctrl.createField);
    router.get('/dashboard/owner', authMiddleware, ctrl.ownerDashboard);

    
    router.patch('/slots/:slot_id/unavailable', ctrl.markUnavailable);
    router.patch('/slots/:slot_id/available',   ctrl.markAvailable);

    module.exports = router;