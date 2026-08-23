import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './features/auth/auth.route';
import echoRoutes from './features/echo/echo.route';
import stateRoutes from './features/state/state.route';
import dictionaryViewRoutes from './features/dictionary_view/dictionary_view.route';
import dictionaryAddRoutes from './features/dictionary_add/dictionary_add.route';
import settingsRoutes from './features/settings/settings.route';

dotenv.config();

const app = express();

app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/state', stateRoutes);
app.use('/api/v1/dictionary_view', dictionaryViewRoutes);
app.use('/api/v1/dictionary_add', dictionaryAddRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1', echoRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
