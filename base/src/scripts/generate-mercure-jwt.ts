import jwt from 'jsonwebtoken';

const MERCURE_SECRET = 'supersecret_mercure_key';

const payload = {
  mercure: {
    publish: ['*'],
    subscribe: ['*'],
  },
};

const token = jwt.sign(payload, MERCURE_SECRET, { noTimestamp: true });
console.log(`MERCURE_JWT=${token}`);
