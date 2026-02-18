// src/ports/i_auth_service.ts

import { User } from '../domain/user.js';

export interface IAuthService {
    validateUser(email: string, password: string): Promise<User | null>;
    login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }>;
    refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }>;
    logout(userId: string, refreshToken?: string): Promise<void>;
}
