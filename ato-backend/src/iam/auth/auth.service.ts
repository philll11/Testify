import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
  ) { }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.validateUser(email, pass);
    if (user) {
      // TypeORM entity is already an object, but we need to strip password
      // It might be stripped by the service or we do it here.
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(
    user: any,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!user.isActive || user.isDeleted || !user.role) {
      throw new UnauthorizedException(
        'User account is not active or has no role.',
      );
    }

    const payload = {
      email: user.email,
      sub: user.recordId,
      tokenVersion: user.tokenVersion || 0,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const tokenDoc = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });

    if (!tokenDoc) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenDoc.isRevoked) {
      // Security: If a revoked token is used, it might be a theft.
      // We could invalidate all tokens for this user (familyId logic), but for now just reject.
      throw new UnauthorizedException('Refresh token revoked');
    }

    if (tokenDoc.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Rotation: Revoke the used token
    tokenDoc.isRevoked = true;
    await this.refreshTokenRepository.save(tokenDoc);

    // Get user to check status and generate new payload
    const user = await this.usersService.findOneById(tokenDoc.userId);
    if (!user || !user.isActive || user.isDeleted) {
      throw new UnauthorizedException('User account is no longer active');
    }

    const payload = {
      email: user.email,
      sub: user.recordId,
      tokenVersion: user.tokenVersion || 0,
    };

    const accessToken = this.jwtService.sign(payload);
    const newRefreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // Default 7 days if not configured
    const ttlSeconds = parseInt(
      this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN_SECONDS',
        '604800',
      ),
      10,
    );
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const tokenEntity = this.refreshTokenRepository.create({
      tokenHash,
      userId,
      expiresAt,
    });

    await this.refreshTokenRepository.save(tokenEntity);

    return refreshToken;
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    // Hard logout (invalidate all sessions)
    await this.usersService.invalidateTokens(userId);

    // Also revoke the specific refresh token if provided
    if (refreshToken) {
      const tokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');
      await this.refreshTokenRepository.update(
        { tokenHash },
        { isRevoked: true },
      );
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findOneByEmailAndPopulateRole(email);
    if (!user) {
      return;
    }

    const tokenPayload = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(tokenPayload, 10);

    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);

    const resetToken = this.passwordResetTokenRepository.create({
      user,
      tokenHash,
      expiresAt: expiry,
    });

    await this.passwordResetTokenRepository.save(resetToken);

    const fullToken = `${resetToken.id}.${tokenPayload}`;
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    const resetLink = `${frontendUrl}/reset-password/${fullToken}`;
    const cliCommand = `ato login --reset-password --token ${fullToken}`;

    Logger.log('========================================================');
    Logger.log('EMAIL MOCK: Password Reset');
    Logger.log(`To: ${email}`);
    Logger.log(`Web Link: ${resetLink}`);
    Logger.log(`CLI Command: ${cliCommand}`);
    Logger.log('========================================================');
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const [tokenId, tokenSecret] = token.split('.');

    if (!tokenId || !tokenSecret) {
      throw new BadRequestException('Invalid token format');
    }

    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: { id: tokenId },
      relations: ['user'],
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid token');
    }

    if (resetToken.isUsed) {
      throw new BadRequestException('Token has already been used');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Token has expired');
    }

    const isMatch = await bcrypt.compare(tokenSecret, resetToken.tokenHash);
    if (!isMatch) {
      throw new BadRequestException('Invalid token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and token version
    await this.usersService.updateAuthDetails(
      resetToken.user.id,
      hashedPassword,
    );

    resetToken.isUsed = true;
    await this.passwordResetTokenRepository.save(resetToken);
  }
}
