// backend/test/app.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { setupTestApp, teardownTestApp } from './test-utils';
import { DataSource } from 'typeorm';

describe('AppController (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;

    beforeAll(async () => {
        const setup = await setupTestApp();
        app = setup.app;
        dataSource = setup.dataSource;
    });

    afterAll(async () => {
        await teardownTestApp({ app, dataSource });
    });

    it('/status (GET)', () => {
        return request(app.getHttpServer())
            .get('/status')
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('status', 'up');
            });
    });
});
