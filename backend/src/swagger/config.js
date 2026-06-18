const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Test Case Manager API',
      version: '1.0.0',
      description: 'API documentation for Test Case Management System',
    },
    servers: [{ url: '/api' }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
