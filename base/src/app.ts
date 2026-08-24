import express, { Express } from 'express';
import dotenv from 'dotenv';
import authRoutes from './features/auth/auth.route';
import echoRoutes from './features/echo/echo.route';
import stateRoutes from './features/state/state.route';
import switchModeDictionaryViewRoutes from './features/switch_mode_dictionary_view/switch_mode_dictionary_view.route';
import switchModeDictionaryAddRoutes from './features/switch_mode_dictionary_add/switch_mode_dictionary_add.route';
import addWordRoutes from './features/add_word/add_word.route';
import settingsRoutes from './features/settings/settings.route';
import definitionDeleteRoutes from './features/definition_delete/definition_delete.route';
import wordDeleteRoutes from './features/word_delete/word_delete.route';
import definitionAddRoutes from './features/definition_add/definition_add.route';
import definitionEditRoutes from './features/definition_edit/definition_edit.route';
import definitionTranslateEditRoutes from './features/definition_translate_edit/definition_translate_edit.route';
import switchModeDictionaryEditRoutes from './features/switch_mode_dictionary_edit/switch_mode_dictionary_edit.route';
import switchModeQuizRoutes from './features/switch_mode_quiz/switch_mode_quiz.route';
import './features/add_word/add_word.worker';

dotenv.config();

const app: Express = express();

app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/state', stateRoutes);
app.use('/api/v1/switch_mode_dictionary_view', switchModeDictionaryViewRoutes);
app.use('/api/v1/switch_mode_dictionary_add', switchModeDictionaryAddRoutes);
app.use('/api/v1/add_word', addWordRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/definition_delete', definitionDeleteRoutes);
app.use('/api/v1/word_delete', wordDeleteRoutes);
app.use('/api/v1/definition_add', definitionAddRoutes);
app.use('/api/v1/definition_edit', definitionEditRoutes);
app.use('/api/v1/definition_translate_edit', definitionTranslateEditRoutes);
app.use('/api/v1/switch_mode_dictionary_edit', switchModeDictionaryEditRoutes);
app.use('/api/v1/switch_mode_quiz', switchModeQuizRoutes);
app.use('/api/v1', echoRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
