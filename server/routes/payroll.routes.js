import { Router } from 'express';
import {
  processPayroll, getPayroll, getPayslip, getPayrollSummary, downloadPayslipPDF
} from '../controllers/payroll.controller.js';
import { getPayrollConfig, updatePayrollConfig } from '../controllers/payrollConfig.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/config', protect, authorize('super_admin', 'hr'), getPayrollConfig);
router.put('/config', protect, authorize('super_admin', 'hr'), updatePayrollConfig);
router.post('/process', protect, authorize('hr'), processPayroll);
router.get('/', protect, getPayroll);
router.get('/summary', protect, authorize('super_admin', 'hr'), getPayrollSummary);
router.get('/:id/payslip', protect, getPayslip);
router.get('/:id/pdf', protect, downloadPayslipPDF);

export default router;
