import { MercureEvent } from './event_bus.type';
import { env } from '../../core/env';

export async function publishEvent(username: string, payload: MercureEvent): Promise<void> {
  const MERCURE_URL = env.MERCURE_URL;
  const MERCURE_JWT = env.MERCURE_JWT;
  const BASE_DOMAIN = env.BASE_DOMAIN;
  
  const topic = `${BASE_DOMAIN}/v1/users/${username}`;
  const body = new URLSearchParams({
    topic,
    data: JSON.stringify(payload)
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
    throw new Error(`Failed to publish event to Mercure: ${await mercureRes.text()}`);
  }
}
