import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/admin';
import { validateRequest } from '../../middleware/validate';
import { getAuthUser } from '../auth/auth.service';
import {
  CreatePresetSchema,
  CreatePresetInput,
  UpdatePresetSchema,
  UpdatePresetInput,
  ApplyPresetSchema,
  ApplyPresetInput,
} from './preset.type';
import {
  listPresets,
  getPresetById,
  createPreset,
  updatePreset,
  deletePreset,
  applyPreset,
} from './preset.service';

const router = Router();

// ==========================================
// 1. PUBLIC (AUTHENTICATED) ROUTES
// ==========================================

// GET all presets (accessible publicly)
router.get('/', async (req: Request, res: Response) => {
  try {
    const forLanguage = (req.query.for_language || req.query.forLanguage) as string | undefined;
    const presets = await listPresets(forLanguage ? { forLanguage } : undefined);
    res.json({ presets });
  } catch (error) {
    console.error('List presets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST apply preset to dictionary (accessible to all authenticated users)
router.post('/apply_preset', authMiddleware, validateRequest(ApplyPresetSchema), async (req: Request<{}, {}, ApplyPresetInput>, res: Response) => {
  const { id: userId, username } = getAuthUser(req);
  const { dictionaryId, presetId } = req.body;

  try {
    const result = await applyPreset(userId, username, dictionaryId, presetId);
    res.json({
      message: 'Preset applied successfully',
      ...result,
    });
  } catch (error: any) {
    const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500;
    if (statusCode >= 500) {
      console.error('Apply preset error:', error);
    }
    res.status(statusCode).json({ error: error.message || 'Failed to apply preset' });
  }
});

// Alias: POST /:id/apply
router.post('/:id/apply', authMiddleware, async (req: Request, res: Response) => {
  const { id: userId, username } = getAuthUser(req);
  const presetId = parseInt(String(req.params.id), 10);
  const dictionaryId = Number(req.body.dictionaryId);

  if (!dictionaryId) {
    return res.status(400).json({ error: 'dictionaryId is required' });
  }

  try {
    const result = await applyPreset(userId, username, dictionaryId, presetId);
    res.json({
      message: 'Preset applied successfully',
      ...result,
    });
  } catch (error: any) {
    const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500;
    if (statusCode >= 500) {
      console.error('Apply preset error:', error);
    }
    res.status(statusCode).json({ error: error.message || 'Failed to apply preset' });
  }
});

// GET single preset by ID (accessible publicly)
router.get('/:id', async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  try {
    const preset = await getPresetById(id);
    if (!preset) {
      return res.status(404).json({ error: 'Preset not found' });
    }
    res.json({ preset });
  } catch (error) {
    console.error('Get preset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// 2. ADMIN-ONLY ROUTES
// ==========================================

// POST create preset (Admin only)
router.post('/', authMiddleware, adminMiddleware, validateRequest(CreatePresetSchema), async (req: Request<{}, {}, CreatePresetInput>, res: Response) => {
  try {
    const preset = await createPreset(req.body);
    res.status(201).json({ preset });
  } catch (error: any) {
    console.error('Create preset error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// PUT update preset (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, validateRequest(UpdatePresetSchema), async (req: Request<{ id: string }, {}, UpdatePresetInput>, res: Response) => {
  const id = parseInt(req.params.id, 10);
  try {
    const existing = await getPresetById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    const preset = await updatePreset(id, req.body);
    res.json({ preset });
  } catch (error: any) {
    console.error('Update preset error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// PATCH update preset (Admin only)
router.patch('/:id', authMiddleware, adminMiddleware, validateRequest(UpdatePresetSchema), async (req: Request<{ id: string }, {}, UpdatePresetInput>, res: Response) => {
  const id = parseInt(req.params.id, 10);
  try {
    const existing = await getPresetById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    const preset = await updatePreset(id, req.body);
    res.json({ preset });
  } catch (error: any) {
    console.error('Patch preset error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// DELETE preset (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  try {
    const existing = await getPresetById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    await deletePreset(id);
    res.json({ message: 'Preset deleted successfully' });
  } catch (error) {
    console.error('Delete preset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
