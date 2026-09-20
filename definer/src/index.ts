import dotenv from 'dotenv';
import express from 'express';
import { env } from './core/env';
import { defineRouter } from './routes/define';

dotenv.config();

const app = express();
app.use(express.json());

app.use('/api/v1/define', defineRouter);

// Global error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  const message = err instanceof Error ? err.message : String(err);
  res.status(500).json({ error: 'Internal Server Error', message });
});

const PORT = env.PORT;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Definer application listening on port ${PORT}`);
  });
}

export default app;
