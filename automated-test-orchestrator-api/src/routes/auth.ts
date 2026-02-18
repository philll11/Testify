import { Router } from 'express';
import container from '../inversify.config.js';
import { AuthController } from './auth.controller.js';
import { AuthMiddleware } from '../middleware/auth_middleware.js';
import { TYPES } from '../inversify.types.js';

const router = Router();
const authController = container.get<AuthController>(TYPES.AuthController);
const authMiddleware = container.get<AuthMiddleware>(TYPES.AuthMiddleware);

router.post('/login', authController.login);
router.post('/logout', authMiddleware.authenticate, authController.logout);
router.post('/refresh', authController.refresh);
router.get('/profile', authMiddleware.authenticate, authController.getProfile);

export default router;
