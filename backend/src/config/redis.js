const Redis = require('ioredis');

let redisClient = null;

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('Redis connection failed after 3 retries, running without cache');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redisClient.on('connect', () => console.log('Redis connected'));
    redisClient.on('error', (err) => console.warn('Redis error:', err.message));
  }
  return redisClient;
};

const cache = {
  async get(key) {
    try {
      const client = getRedisClient();
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async set(key, value, ttlSeconds) {
    try {
      const client = getRedisClient();
      await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // silently fail — Redis is optional for caching
    }
  },

  async del(key) {
    try {
      const client = getRedisClient();
      await client.del(key);
    } catch {}
  },

  async delPattern(pattern) {
    try {
      const client = getRedisClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) await client.del(...keys);
    } catch {}
  },
};

module.exports = { getRedisClient, cache };
