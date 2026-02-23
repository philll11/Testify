// backend/test/test-utils.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { useContainer } from 'class-validator';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';

/**
 * Sets up a full NestJS application instance for end-to-end testing,
 * connecting to the configured test database (PostgreSQL).
 */
export const setupTestApp = async (): Promise<{
  app: INestApplication;
  jwtService: JwtService;
  dataSource: DataSource;
}> => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Enable validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Allow class-validator to use NestJS dependency injection
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  await app.init();

  const dataSource = app.get<DataSource>(DataSource);
  const jwtService = app.get<JwtService>(JwtService);

  return { app, jwtService, dataSource };
};

/**
 * Teardown the test application and clean up the database.
 */
export const teardownTestApp = async (testApp: {
  app: INestApplication;
  dataSource: DataSource;
}) => {
  const { app, dataSource } = testApp;

  // Clean up database tables
  if (dataSource.isInitialized) {
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      try {
        await repository.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE;`);
      } catch (error) {
        // console.warn(`Failed to clean table ${entity.tableName}: ${error.message}`);
      }
    }
  }

  await app.close();
};
