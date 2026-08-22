import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import echoRoutes from './routes/echo';
import stateRoutes from './routes/state';

dotenv.config();

const app = express();

app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/state', stateRoutes);
app.use('/api/v1', echoRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
