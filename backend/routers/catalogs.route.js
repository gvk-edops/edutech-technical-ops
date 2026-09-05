import express from 'express';
import { verifyAdmin, verifyTechnician } from '../middleware/auth.js';
import { getAll, create, update, remove, getOpsCpuSpecs, updateOpsCpuSpecs } from '../controllers/catalogs.controller.js';

const router = express.Router();

// All authenticated users can read catalogs (needed for dropdowns in jobs/assembly)
router.get('/ops-cpu-specs', ...verifyTechnician, getOpsCpuSpecs);
router.get('/:catalog', ...verifyTechnician, getAll);

// Only admin can modify catalogs
router.put('/ops-cpu-specs', ...verifyAdmin, updateOpsCpuSpecs);
router.post('/:catalog', ...verifyAdmin, create);
router.put('/:catalog/:id', ...verifyAdmin, update);
router.delete('/:catalog/:id', ...verifyAdmin, remove);

export default router;
