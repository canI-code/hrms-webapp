import { Router } from 'express';
import { uploadDocument, getDocuments, deleteDocument, viewDocument, downloadDocument } from '../controllers/document.controller.js';
import { protect } from '../middleware/auth.js';
import { uploadDocument as uploadDoc } from '../middleware/upload.js';

const router = Router();

router.get('/view/:id', protect, viewDocument);
router.get('/download/:id', protect, downloadDocument);
router.get('/:employeeId', protect, getDocuments);
router.post('/:employeeId', protect, uploadDoc.single('document'), uploadDocument);
router.delete('/:id', protect, deleteDocument);

export default router;
