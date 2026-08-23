import jwt from 'jsonwebtoken';

const mercureUrl = process.env.MERCURE_URL || 'http://mercure/.well-known/mercure';
const jwtKey = process.env.MERCURE_JWT_KEY || 'supersecret_mercure_key';

const token = jwt.sign(
  { mercure: { subscribe: ['*'] } },
  jwtKey,
  { noTimestamp: true }
);

console.log(`Starting mercure-monitor connected to ${mercureUrl}`);

async function connect() {
  const url = new URL(mercureUrl);
  url.searchParams.append('topic', '*');

  console.log(`Connecting to ${url.toString()}...`);
  
  try {
    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream'
      }
    });

    if (!res.ok) {
      console.error(`❌ Error connecting to Mercure: Non-200 status code (${res.status})`);
      setTimeout(connect, 5000);
      return;
    }

    console.log('✅ Connected to Mercure successfully. Listening for messages...');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            console.log(`\n📬 [Mercure Message]`, JSON.stringify(data, null, 2));
          } catch (e) {
            console.log(`\n📬 [Mercure Raw Data]`, line.substring(6));
          }
        }
      }
    }
    
    console.log('Mercure stream ended. Reconnecting in 5s...');
    setTimeout(connect, 5000);
  } catch (err) {
    console.error('❌ Error connecting to Mercure:', err.message || err);
    console.log('Reconnecting in 5s...');
    setTimeout(connect, 5000);
  }
}

connect();
