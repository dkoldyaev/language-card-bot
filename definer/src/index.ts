import express from 'express';
import dotenv from 'dotenv';
import { defineRouter } from './routes/define';

dotenv.config();

const app = express();
app.use(express.json());

app.use('/api/v1/define', defineRouter);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

const PORT = process.env.PORT || 3002;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Definer application listening on port ${PORT}`);
  });
}

export default app;
