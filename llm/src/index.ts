import dotenv from 'dotenv';
import express from 'express';
import { env } from './core/env';
import { generateRouter } from './routes/generate';

dotenv.config();

const app = express();
app.use(express.json());

app.use('/api/v1/generate', generateRouter);
app.use('/api/v1/llm/generate', generateRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Global error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error in LLM service:', err);
  const message = err instanceof Error ? err.message : String(err);
  res.status(500).json({ error: 'Internal Server Error', message });
});

const PORT = env.PORT;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`LLM service listening on port ${PORT}`);
  });
}

export default app;
