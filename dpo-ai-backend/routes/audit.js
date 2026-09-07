import express from 'express';
import { streamAudit } from '../Controllers/auditController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/audit-stream', protect, streamAudit);

export default router;
