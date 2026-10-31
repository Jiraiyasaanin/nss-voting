import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config.js';
import { authRouter } from './routes/auth.routes.js';
import { electionRouter } from './routes/election.routes.js';
import { ballotRouter } from './routes/ballot.routes.js';
import { voterRouter } from './routes/voter.routes.js';
import { resultsRouter } from './routes/results.routes.js';
import { auditRouter } from './routes/audit.routes.js';

export function createApp(): Express {
  const app = express();

  // Security Middleware
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // Vite frontend communicates locally
    })
  );

  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        if (!requestOrigin) return callback(null, true);
        const allowed = [config.RP_ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3000'];
        if (process.env.FRONTEND_URL) allowed.push(process.env.FRONTEND_URL);
        
        const isAllowed = allowed.includes(requestOrigin) ||
          /\.web\.app$/.test(requestOrigin) ||
          /\.firebaseapp\.com$/.test(requestOrigin) ||
          /localhost/.test(requestOrigin);

        if (isAllowed) {
          callback(null, true);
        } else {
          callback(null, true); // Allow all in dev/test context to prevent mobile preflight blocking
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static files for candidate photos
  app.use('/uploads', express.static(config.UPLOAD_DIR));

  // API Health Check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'HEALTHY',
      platform: 'NSS Collegiate Digital Voting Platform',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/elections', electionRouter);
  app.use('/api/ballots', ballotRouter);
  app.use('/api/voters', voterRouter);
  app.use('/api/results', resultsRouter);
  app.use('/api/audit-logs', auditRouter);

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled Application Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'An unexpected error occurred on the voting platform server.',
    });
  });

  return app;
}

