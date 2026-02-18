// src/middleware/auth_middleware.ts

import { injectable, inject } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { IJwtService } from '../ports/i_jwt_service.js';
import { IUserRepository } from '../ports/i_user_repository.js';
import { IRoleRepository } from '../ports/i_role_repository.js';
import { TYPES } from '../inversify.types.js';

@injectable()
export class AuthMiddleware {
    constructor(
        @inject(TYPES.IJwtService) private jwtService: IJwtService,
        @inject(TYPES.IUserRepository) private userRepository: IUserRepository,
        @inject(TYPES.IRoleRepository) private roleRepository: IRoleRepository
    ) { }

    public authenticate = async (req: Request, res: Response, next: NextFunction) => {
        try {
            let token: string | undefined;

            // 1. Check Authorization Header
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }

            // 2. Check Cookie
            if (!token && req.cookies && req.cookies['Authentication']) {
                token = req.cookies['Authentication'];
            }

            if (!token) {
                return res.status(401).json({ message: 'Unauthorized: No token provided' });
            }

            // 3. Verify Token
            const payload = this.jwtService.verifyAccessToken(token);

            // 4. Kill Switch Check (Token Version)
            const user = await this.userRepository.findById(payload.sub);

            if (!user) {
                return res.status(401).json({ message: 'Unauthorized: User not found' });
            }

            if (payload.version !== user.tokenVersion) {
                return res.status(401).json({ message: 'Unauthorized: Session invalidated (Token Version Mismatch)' });
            }

            if (!user.isActive || user.isDeleted) {
                return res.status(403).json({ message: 'Forbidden: User account inactive' });
            }

            // 5. RBAC Permissions
            const permissions = await this.roleRepository.getPermissions(user.roleId);

            // Attach to Request
            (req as any).user = user;
            (req as any).permissions = permissions;

            next();
        } catch (error) {
            return res.status(401).json({ message: 'Unauthorized', details: (error as Error).message });
        }
    };
}
