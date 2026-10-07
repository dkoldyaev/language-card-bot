import cors from 'cors';
import dotenv from 'dotenv';
import express, { type Express } from 'express';
import addWordRoutes from './features/add_word/add_word.route';
import addWordBatchRoutes from './features/add_word/add_word_batch.route';
import authRoutes from './features/auth/auth.route';
import dashboardRoutes from './features/dashboard/dashboard.route';
import definitionAddRoutes from './features/definition_add/definition_add.route';
import definitionDeleteRoutes from './features/definition_delete/definition_delete.route';
import definitionEditRoutes from './features/definition_edit/definition_edit.route';
import definitionTranslateEditRoutes from './features/definition_translate_edit/definition_translate_edit.route';
import dictionariesRoutes from './features/dictionaries/dictionaries.route';
import dictionaryRoutes from './features/dictionary/dictionary.route';
import echoRoutes from './features/echo/echo.route';
import presetRoutes from './features/preset/preset.route';
import quizRoutes from './features/quiz/quiz.route';
import settingsRoutes from './features/settings/settings.route';
import stateRoutes from './features/state/state.route';
import wordDeleteRoutes from './features/word_delete/word_delete.route';
import './features/add_word/add_word.worker';
import './features/add_word/add_word.listener';
import './features/definition_add/definition_add.listener';
import './features/definition_translate_edit/definition_translate.listener';
import './features/quiz/quiz_cleanup.worker';
import './features/image/image.worker';
import './features/image/image.listener';

import { env } from './core/env';
import imageRoutes from './features/image/image.route';

dotenv.config();

const app: Express = express();

const corsOrigin = env.CORS_ORIGIN === '*'
  ? true
  : env.CORS_ORIGIN.includes(',')
  ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : env.CORS_ORIGIN;

app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/state', stateRoutes);
app.use('/api/v1/add_word/batch', addWordBatchRoutes);
app.use('/api/v1/add_word', addWordRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/dictionary', dictionaryRoutes);
app.use('/api/v1/dictionaries', dictionariesRoutes);
app.use('/api/v1/definition_delete', definitionDeleteRoutes);
app.use('/api/v1/word_delete', wordDeleteRoutes);
app.use('/api/v1/definition_add', definitionAddRoutes);
app.use('/api/v1/definition_edit', definitionEditRoutes);
app.use('/api/v1/definition_translate_edit', definitionTranslateEditRoutes);
app.use('/api/v1/quiz', quizRoutes);
app.use('/api/v1/preset', presetRoutes);
app.use('/api/v1/presets', presetRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/image', imageRoutes);
app.use('/api/v1', echoRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
