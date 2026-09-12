import express from 'express';
import dotenv from 'dotenv';
import { env } from './core/env';
import { generateRouter } from './routes/generate';

dotenv.config();

const app = express();
app.use(express.json());

app.use('/api/v1/generate', generateRouter);
app.use('/api/v1/llm/generate', generateRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error in LLM service:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

const PORT = env.PORT;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`LLM service listening on port ${PORT}`);
  });
}

export default app;
