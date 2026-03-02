import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { setupTestApp, teardownTestApp } from '../test-utils';
import { User } from '../../src/iam/users/entities/user.entity';
import { PasswordResetToken } from '../../src/iam/auth/entities/password-reset-token.entity';
import { Role } from '../../src/iam/roles/entities/role.entity';
import * as bcrypt from 'bcrypt';

describe('Auth Password Recovery (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let resetTokenRepository: Repository<PasswordResetToken>;

  let testUser: User;
  let testRole: Role;
  const initialPassword = 'Password123!';

  jest.setTimeout(30000);

  beforeAll(async () => {
    const setup = await setupTestApp();
    app = setup.app;
    dataSource = setup.dataSource;

    userRepository = dataSource.getRepository(User);
    roleRepository = dataSource.getRepository(Role);
    resetTokenRepository = dataSource.getRepository(PasswordResetToken);

    // Helper to create test roles and users safely
    const createRoleAndUser = async () => {
      let role = await roleRepository.findOne({
        where: { recordId: 'TEST_AUTH_RECOVERY_ROLE' },
      });
      if (!role) {
        role = await roleRepository.save(
          roleRepository.create({
            recordId: 'TEST_AUTH_RECOVERY_ROLE',
            name: 'TestRole',
            description: 'Role for auth testing',
            permissions: [],
          }),
        );
      }
      testRole = role;

      const user = await userRepository.findOne({
        where: { recordId: 'AUTH_TEST_USER' },
      });
      if (user) {
        // Ensure clean state if test ran before
        await userRepository.delete(user.id);
      }

      const hash = await bcrypt.hash(initialPassword, 10);
      testUser = await userRepository.save(
        userRepository.create({
          recordId: 'AUTH_TEST_USER',
          name: 'Auth Recovery User',
          firstName: 'Auth',
          lastName: 'Recovery',
          email: `recovery.user.${Date.now()}@test.com`,
          password: hash,
          role: testRole,
          isActive: true,
        }),
      );
    };

    await createRoleAndUser();
  });

  afterAll(async () => {
    // Cleanup
    if (testUser) {
      await userRepository.delete(testUser.id);
    }
    if (testRole) {
      await roleRepository.delete(testRole.id);
    }
    await teardownTestApp({ app, dataSource });
  });

  describe('POST /auth/forgot-password', () => {
    it('should generate a reset token for a valid email', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      // Verify token exists in DB
      const resetToken = await resetTokenRepository.findOne({
        where: { userId: testUser.id },
      });
      expect(resetToken).toBeDefined();
      expect(resetToken!.isUsed).toBe(false);
    });

    it('should return 200/201 even if email does not exist (security)', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);
    });
  });

  describe('POST /auth/reset-password', () => {
    let tokenString: string;

    beforeEach(async () => {
      // Clear previous tokens
      await resetTokenRepository.delete({ userId: testUser.id });

      // Request new token
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testUser.email });

      // Retrieve token from DB (simulating checking email)
      // Since we cannot retrieve the unhashed token secret from the DB (it is hashed),
      // we will manually seed a known token in the test cases below.
    });

    it('should reset password with valid token', async () => {
      // Manually create a valid token
      const secret = 'valid-test-token-secret';
      const hash = await bcrypt.hash(secret, 10);
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 1);

      const savedToken = await resetTokenRepository.save(
        resetTokenRepository.create({
          userId: testUser.id,
          tokenHash: hash,
          expiresAt: expiry,
        }),
      );

      const fullToken = `${savedToken.id}.${secret}`;
      const newPassword = 'NewPassword789!';

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: fullToken,
          newPassword: newPassword,
        })
        .expect(200); // Controller returns 200

      // Verify password changed
      const updatedUser = await userRepository.findOneBy({ id: testUser.id });
      // We need to verify password hash, query directly
      // User entity might not select password by default
      const userWithPassword = await userRepository
        .createQueryBuilder('user')
        .addSelect('user.password')
        .where('user.id = :id', { id: testUser.id })
        .getOne();

      expect(userWithPassword).toBeDefined();
      const isMatch = await bcrypt.compare(
        newPassword,
        userWithPassword!.password!,
      );
      expect(isMatch).toBe(true);

      // Verify token marked used
      const usedToken = await resetTokenRepository.findOneBy({
        id: savedToken.id,
      });
      expect(usedToken!.isUsed).toBe(true);
    });

    it('should fail with invalid token', async () => {
      const fullToken = `00000000-0000-0000-0000-000000000000.invalid-secret`;
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: fullToken,
          newPassword: 'NewPassword123!',
        })
        .expect(400);
    });

    it('should fail with expired token', async () => {
      const secret = 'expired-secret';
      const hash = await bcrypt.hash(secret, 10);
      const expiry = new Date();
      expiry.setHours(expiry.getHours() - 1); // Expired

      const savedToken = await resetTokenRepository.save(
        resetTokenRepository.create({
          userId: testUser.id,
          tokenHash: hash,
          expiresAt: expiry,
        }),
      );

      const fullToken = `${savedToken.id}.${secret}`;

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: fullToken,
          newPassword: 'NewPassword123!',
        })
        .expect(400);
    });
  });
});
