import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Endpoint to generate a test token
router.post('/auth/login', (req: Request, res: Response) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// Protected echo endpoint
router.post('/echo', authMiddleware, async (req: Request, res: Response) => {
  const MERCURE_URL = process.env.MERCURE_URL;
  const MERCURE_JWT = process.env.MERCURE_JWT;

  const responseData = {
    message: 'Echo successful',
    // @ts-ignore
    user: req.user,
    data: req.body
  };

  // Push to Mercure if configured
  if (MERCURE_URL && MERCURE_JWT) {
    try {
      const topic = 'http://localhost/echo';
      const body = new URLSearchParams({
        topic: topic,
        data: JSON.stringify(responseData)
      });

      const mercureRes = await fetch(MERCURE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MERCURE_JWT}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      if (!mercureRes.ok) {
        console.error('Failed to publish to Mercure', await mercureRes.text());
      }
    } catch (e) {
      console.error('Error publishing to Mercure', e);
    }
  }

  res.json(responseData);
});

export default router;
