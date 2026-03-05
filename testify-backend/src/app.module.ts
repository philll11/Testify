// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './iam/users/users.module';
import { RolesModule } from './iam/roles/roles.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './iam/auth/auth.module';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { JwtAuthGuard } from './iam/auth/jwt-auth.guard';
import { CountersModule } from './system/counters/counters.module';
import { SystemConfigModule } from './system/config/system-config.module';
import { AuditsModule } from './system/audits/audits.module';
import { CommonModule } from './common/common.module';
import appConfig from './config/app.config';
import { IntegrationModule } from './integration/integration.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { TestRegistryModule } from './test-registry/test-registry.module';
import { CollectionsModule } from './collections/collections.module';
import { BackgroundTasksModule } from './background-tasks/background-tasks.module';
import { ExecutionEngineModule } from './execution-engine/execution-engine.module';
import { TestResultsModule } from './test-results/test-results.module';

@Module({
  imports: [
    CommonModule,
    IntegrationModule,
    DiscoveryModule,
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile:
        process.env.APP_ENV === 'local' || process.env.APP_ENV === 'cloud',
      load: [appConfig],
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          // Use pino-pretty for local development for human-readable logs
          transport: configService.get<string>('NODE_ENV') !== 'production' ? { target: 'pino-pretty', options: { singleLine: true } } : undefined,
          level: configService.get<string>('LOG_LEVEL', 'info'), // Default to 'info'
          // Define custom log message format for requests
          customSuccessMessage: (req, res) => {
            return `Request ${req.id} finished with status ${res.statusCode}`;
          },
          customErrorMessage: (req, res, err) => {
            return `Request ${req.id} failed with status ${res.statusCode}: ${err.message}`;
          },
          serializers: {
            req: (req) => ({
              id: req.id,
              method: req.method,
              url: req.url,
              // body: req.raw.body, // Note: pino-http might not have body available depending on middleware order
            }),
            res: (res) => ({
              statusCode: res.statusCode,
            }),
          },
          // This creates and adds the Correlation ID to every log
          genReqId: (req, res) => {
            const existingId = req.id ?? req.headers['x-request-id'];
            if (existingId) return existingId;
            const id = require('crypto').randomUUID();
            res.setHeader('X-Request-Id', id);
            return id;
          },
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        autoLoadEntities: true,
        synchronize: true, // Should be false in production
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST');
        const port = configService.get<number>('REDIS_PORT');
        const dbStr = configService.get<string>('REDIS_DB');

        if (!host || !port || dbStr === undefined) {
          throw new Error('Redis configuration is missing required environment variables (REDIS_HOST, REDIS_PORT, REDIS_DB).');
        }

        return {
          connection: {
            host,
            port,
            db: Number(dbStr),
          },
        };
      },
      inject: [ConfigService],
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    RolesModule,
    CountersModule,
    SystemConfigModule,
    AuditsModule,
    TestRegistryModule,
    CollectionsModule,
    BackgroundTasksModule,
    ExecutionEngineModule,
    TestResultsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule { }
