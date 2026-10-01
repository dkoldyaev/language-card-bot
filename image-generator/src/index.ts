import dotenv from 'dotenv';
import express from 'express';
import { env } from './core/env';
import { imagesRouter } from './routes/images';

dotenv.config();

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/v1/images', imagesRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error in Image Generator:', err);
  const message = err instanceof Error ? err.message : String(err);
  res.status(500).json({ error: 'Internal Server Error', message });
});

const PORT = env.PORT;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Image Generator service listening on port ${PORT}`);
  });
}

export default app;
