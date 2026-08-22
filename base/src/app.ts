import express from 'express';
import dotenv from 'dotenv';
import routes from './routes/echo';

dotenv.config();

const app = express();

app.use(express.json());

app.use('/api/v1', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
