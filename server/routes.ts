import type { Express } from "express";
import { createServer, type Server } from "http";
import express from 'express';
import registerRouter from './api/register';
// Import other route modules as needed
import loginRoute from './api/login';
import authMiddleware from './middleware/authMiddleware';

export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();
  app.use('/api', router);  // Mount the /api router

  // Mount route handlers
  router.use('/register', registerRouter);
  // Mount other routers here, e.g.:
  // router.use('/login', loginRouter);
  router.use('/login', loginRoute);

  router.get('/protected', authMiddleware, (req, res) => {
    res.json({ message: 'Protected route accessed successfully', userId: req.userId, isBusiness: req.isBusiness });
  });

  const httpServer = createServer(app);
  return httpServer;
}