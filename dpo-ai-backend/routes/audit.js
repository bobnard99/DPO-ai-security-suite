import express from 'express';
import { analyzeAuditText, streamAudit } from '../Controllers/auditController.js';
import { authMiddleware, protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/audit-stream', protect, streamAudit);
router.post('/analyze', authMiddleware, analyzeAuditText);

export default router;
