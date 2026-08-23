import express from 'express';
import dotenv from 'dotenv';
import { translateRouter } from './routes/translate';

dotenv.config();

const app = express();
app.use(express.json());

app.use('/api/v1/translate', translateRouter);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Translator application listening on port ${PORT}`);
  });
}

export default app;
