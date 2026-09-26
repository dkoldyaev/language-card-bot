import { type Request, type Response, Router } from 'express';
import { adminMiddleware } from '../../middleware/admin';
import { authMiddleware } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate';
import { LanguageCodeSchema } from '../../types/language';
import { getAuthUser } from '../auth/auth.service';
import {
  applyPreset,
  createPreset,
  deletePreset,
  getPresetById,
  listPresets,
  updatePreset,
  invalidatePresetsCache,
} from './preset.service';
import {
  type ApplyPresetInput,
  ApplyPresetSchema,
  type CreatePresetInput,
  CreatePresetSchema,
  type UpdatePresetInput,
  UpdatePresetSchema,
} from './preset.type';

const router = Router();

// ==========================================
// 1. PUBLIC (AUTHENTICATED) ROUTES
// ==========================================

// GET all presets (accessible publicly)
router.get('/', async (req: Request, res: Response) => {
  try {
    const rawLang = req.query.for_language || req.query.forLanguage;
    const langParse = LanguageCodeSchema.safeParse(rawLang);
    const forLanguage = langParse.success ? langParse.data : undefined;
    const presets = await listPresets(forLanguage ? { forLanguage } : undefined);
    res.json({ presets });
  } catch (error) {
    console.error('List presets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST apply preset to dictionary (accessible to all authenticated users)
router.post('/apply_preset', authMiddleware, validateRequest(ApplyPresetSchema), async (req: Request<Record<string, never>, unknown, ApplyPresetInput>, res: Response) => {
  const { id: userId, username } = getAuthUser(req);
  const { dictionaryId, presetId } = req.body;

  try {
    const result = await applyPreset(userId, username, dictionaryId, presetId);
    res.json({
      message: 'Preset applied successfully',
      ...result,
    });
  } catch (error: unknown) {
    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number'
        ? error.statusCode
        : 500;
    if (statusCode >= 500) {
      console.error('Apply preset error:', error);
    }
    const message = error instanceof Error ? error.message : 'Failed to apply preset';
    res.status(statusCode).json({ error: message });
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
  } catch (error: unknown) {
    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number'
        ? error.statusCode
        : 500;
    if (statusCode >= 500) {
      console.error('Apply preset error:', error);
    }
    const message = error instanceof Error ? error.message : 'Failed to apply preset';
    res.status(statusCode).json({ error: message });
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

// POST clear presets cache (Admin only)
router.post('/clear_cache', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    await invalidatePresetsCache();
    res.json({ message: 'Presets cache cleared successfully' });
  } catch (error) {
    console.error('Clear presets cache error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create preset (Admin only)
router.post('/', authMiddleware, adminMiddleware, validateRequest(CreatePresetSchema), async (req: Request<unknown, unknown, CreatePresetInput>, res: Response) => {
  try {
    const preset = await createPreset(req.body);
    res.status(201).json({ preset });
  } catch (error: unknown) {
    console.error('Create preset error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

// PUT update preset (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, validateRequest(UpdatePresetSchema), async (req: Request<{ id: string }, unknown, UpdatePresetInput>, res: Response) => {
  const id = parseInt(req.params.id, 10);
  try {
    const existing = await getPresetById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    const preset = await updatePreset(id, req.body);
    res.json({ preset });
  } catch (error: unknown) {
    console.error('Update preset error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

// PATCH update preset (Admin only)
router.patch('/:id', authMiddleware, adminMiddleware, validateRequest(UpdatePresetSchema), async (req: Request<{ id: string }, unknown, UpdatePresetInput>, res: Response) => {
  const id = parseInt(req.params.id, 10);
  try {
    const existing = await getPresetById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    const preset = await updatePreset(id, req.body);
    res.json({ preset });
  } catch (error: unknown) {
    console.error('Patch preset error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
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
