// src/app.ts

import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';
import testPlanRoutes from './routes/test_plans.js';
import mappingRoutes from './routes/mappings.js';
import credentialRoutes from './routes/credentials.js';
import testExecutionResultRoutes from './routes/test_execution_results.js';
import authRoutes from './routes/auth.js';
import { errorHandler } from './middleware/error_handler.js';

// Create and configure the Express app
const app = express();

app.use(express.json());
app.use(cookieParser());

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.status(200).send('Automated Test Orchestrator API is running! Visit /api-docs for API documentation.');
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use('/auth', authRoutes);
app.use('/api/v1/test-plans', testPlanRoutes);
app.use('/api/v1/mappings', mappingRoutes);
app.use('/api/v1/credentials', credentialRoutes);
app.use('/api/v1/test-execution-results', testExecutionResultRoutes)

// Error Handling Middleware (must be last)
app.use(errorHandler);

// Export the configured app
export default app;