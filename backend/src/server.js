require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger/config');
const { getRedisClient } = require('./config/redis');
const { initScheduler } = require('./controllers/scheduleController');
const { authenticateApiKey, ciTriggerRun, ciUpdateResult } = require('./controllers/apiKeyController');

const app = express();

// Trust proxy — needed when running behind a reverse proxy or dev preview tunnel
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/projects/:projectId/testcases', require('./routes/testCases'));
app.use('/api/projects/:projectId/suites', require('./routes/testSuites'));
app.use('/api/projects/:projectId/executions', require('./routes/executions'));
app.use('/api/projects/:projectId/analytics', require('./routes/analytics'));
app.use('/api/projects/:projectId/api-keys', require('./routes/apiKeys'));
app.use('/api/projects/:projectId/schedules', require('./routes/schedules'));

// CI/CD public endpoints (authenticated via API key, not JWT)
app.post('/api/ci/run', authenticateApiKey, ciTriggerRun);
app.patch('/api/ci/executions/:executionId', authenticateApiKey, ciUpdateResult);

// Health check
app.get('/health', async (req, res) => {
  let redisStatus = 'disconnected';
  try {
    const client = getRedisClient();
    await client.ping();
    redisStatus = 'connected';
  } catch {}

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    redis: redisStatus,
  });
});

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initScheduler();
});
