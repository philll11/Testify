import { injectable, inject } from 'inversify';
import { Request, Response } from 'express';
import { IAuthService } from '../ports/i_auth_service.js';
import { TYPES } from '../inversify.types.js';

@injectable()
export class AuthController {
    constructor(@inject(TYPES.IAuthService) private authService: IAuthService) { }

    public login = async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;
            const { accessToken, refreshToken } = await this.authService.login(email, password);

            // Set Refresh Token as HttpOnly Cookie
            res.cookie('Authentication', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                path: '/auth/refresh' // Scoped strictly to refresh endpoint as per prompt
            });

            res.status(200).json({ accessToken, refreshToken });
        } catch (error) {
            if ((error as Error).message.includes('Unauthorized')) {
                res.status(401).json({ message: (error as Error).message });
            } else if ((error as Error).message.includes('Forbidden')) {
                res.status(403).json({ message: (error as Error).message });
            } else {
                res.status(500).json({ message: 'Internal Server Error', error: (error as Error).message });
            }
        }
    };

    public logout = async (req: Request, res: Response) => {
        try {
            // Assuming AuthMiddleware has already attached user
            const userId = (req as any).user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const refreshToken = req.cookies['Authentication'] || req.body.refreshToken;

            await this.authService.logout(userId, refreshToken);

            res.clearCookie('Authentication', { path: '/auth/refresh' });
            res.status(200).json({ message: 'Logged out successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Internal Server Error', error: (error as Error).message });
        }
    };

    public refresh = async (req: Request, res: Response) => {
        try {
            const refreshToken = req.cookies['Authentication'] || req.body.refreshToken;

            if (!refreshToken) {
                return res.status(401).json({ message: 'No refresh token provided' });
            }

            const { accessToken: newAccessToken, refreshToken: newRefreshTokenRaw } = await this.authService.refresh(refreshToken);

            // Rotate Cookie
            res.cookie('Authentication', newRefreshTokenRaw, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: '/auth/refresh'
            });

            res.status(200).json({ accessToken: newAccessToken, refreshToken: newRefreshTokenRaw });
        } catch (error) {
            // If refresh fails (e.g. reuse detected), clear cookie to be safe
            res.clearCookie('Authentication', { path: '/auth/refresh' });
            res.status(401).json({ message: (error as Error).message });
        }
    };

    public getProfile = async (req: Request, res: Response) => {
        // User attached by middleware
        const user = (req as any).user;
        const permissions = (req as any).permissions;

        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Return DTO, not full entity (hide password hash etc)
        res.status(200).json({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role_id,
            permissions: permissions,
            isActive: user.is_active
        });
    };
}
