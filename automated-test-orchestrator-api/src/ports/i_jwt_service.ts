// src/ports/i_jwt_service.ts

import { User } from '../domain/user.js';

export interface IJwtService {
    signAccessToken(user: User): string;
    verifyAccessToken(token: string): any;
}
