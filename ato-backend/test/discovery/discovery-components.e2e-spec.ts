import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { setupTestApp, teardownTestApp } from '../test-utils';
import { User } from '../../src/iam/users/entities/user.entity';
import { Role } from '../../src/iam/roles/entities/role.entity';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants';
import { DiscoveredComponent } from '../../src/discovery/entities/discovered-component.entity';
import { ComponentTreeNode } from '../../src/discovery/interfaces/component-tree-node.interface';

describe('Discovery Components API E2E', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let jwtService: JwtService;

    let userRepository: Repository<User>;
    let roleRepository: Repository<Role>;
    let discoveredComponentRepository: Repository<DiscoveredComponent>;

    let viewerToken: string;
    const testProfileId = 'profile-123';

    beforeAll(async () => {
        const setup = await setupTestApp();
        app = setup.app;
        dataSource = setup.dataSource;
        jwtService = setup.jwtService;

        userRepository = dataSource.getRepository(User);
        roleRepository = dataSource.getRepository(Role);
        discoveredComponentRepository = dataSource.getRepository(DiscoveredComponent);

        // Create Viewer Role & User (needs DISCOVERY_VIEW)
        const viewerRole = await roleRepository.save(
            roleRepository.create({
                recordId: 'ROLE_DISCOVERY_VIEWER',
                name: 'Discovery Viewer',
                permissions: [PERMISSIONS.DISCOVERY_VIEW],
            }),
        );

        const viewerUser = await userRepository.save(
            userRepository.create({
                recordId: 'USER_DISCOVERY_VIEWER',
                firstName: 'Discovery',
                lastName: 'Viewer',
                name: 'Discovery Viewer',
                email: 'discovery.viewer@example.com',
                isActive: true,
                role: viewerRole,
            }),
        );

        viewerToken = jwtService.sign({ sub: viewerUser.recordId, tokenVersion: 0 });

        // Seed Discovered Components to represent the cached state
        await discoveredComponentRepository.save([
            {
                profileId: testProfileId,
                componentId: 'comp-1',
                name: 'Test Process 1',
                type: 'process',
                folderId: 'folder-1',
                folderPath: '/Root/Salesforce/Auth',
                isTest: true,
            },
            {
                profileId: testProfileId,
                componentId: 'comp-2',
                name: 'Standard Map',
                type: 'transform.map',
                folderId: 'folder-1',
                folderPath: '/Root/Salesforce/Auth',
                isTest: false,
            },
            {
                profileId: testProfileId,
                componentId: 'comp-3',
                name: 'Prod Process',
                type: 'process',
                folderId: 'folder-2',
                folderPath: '/Root/Salesforce/Billing',
                isTest: false, // Type process, but let's say it missed the naming rule
            },
            {
                profileId: 'different-profile-456', // Ensure we test profileId isolation
                componentId: 'comp-4',
                name: 'Ghost Process',
                type: 'process',
                folderId: 'folder-3',
                folderPath: '/Root/Ghost',
                isTest: true,
            }
        ]);
    });

    afterAll(async () => {
        await teardownTestApp({ app, dataSource });
    });

    it('should return a 403 Forbidden without DISCOVERY_VIEW permission', async () => {
        // Create user without permission just for this test
        const noPermRole = await roleRepository.save(
            roleRepository.create({
                recordId: 'ROLE_NO_PERM',
                name: 'No Perms',
                permissions: [],
            }),
        );

        const noPermUser = await userRepository.save(
            userRepository.create({
                recordId: 'USER_NO_PERM',
                firstName: 'No',
                lastName: 'Perm',
                name: 'No Perm',
                email: 'noperm@example.com',
                isActive: true,
                role: noPermRole,
            }),
        );
        const badToken = jwtService.sign({ sub: noPermUser.recordId, tokenVersion: 0 });

        await request(app.getHttpServer())
            .get(`/discovery/components?profileId=${testProfileId}`)
            .set('Authorization', `Bearer ${badToken}`)
            .expect(403);
    });

    it('should return 400 Bad Request if profileId is omitted', async () => {
        const response = await request(app.getHttpServer())
            .get('/discovery/components') // Missing profileId
            .set('Authorization', `Bearer ${viewerToken}`)
            .expect(400);

        expect(response.body.message).toContain('profileId should not be empty');
    });

    it('should return a full tree scoped to the profile (GET ?profileId=...)', async () => {
        const response = await request(app.getHttpServer())
            .get(`/discovery/components?profileId=${testProfileId}`)
            .set('Authorization', `Bearer ${viewerToken}`)
            .expect(200);

        const tree: ComponentTreeNode[] = response.body.data;

        // Root node
        expect(tree).toHaveLength(1);
        expect(tree[0].name).toBe('Root');
        expect(tree[0].nodeType).toBe('folder');

        // Salesforce
        expect(tree[0].children).toHaveLength(1);
        expect(tree[0].children![0].name).toBe('Salesforce');

        // Auth and Billing folders
        const sfChildren = tree[0].children![0].children!;
        expect(sfChildren).toHaveLength(2);

        const authDir = sfChildren.find(c => c.name === 'Auth')!;
        expect(authDir).toBeDefined();

        // Assert components exist as leaf nodes inside 'Auth'
        expect(authDir.children).toHaveLength(2);
        expect(authDir.children!.map(c => c.name)).toEqual(expect.arrayContaining(['Test Process 1', 'Standard Map']));

        // Confirm cross-profile isolation
        const allComponentNames = JSON.stringify(tree);
        expect(allComponentNames).not.toContain('Ghost Process');
    });

    it('should accurately filter by isTest toggle (GET ?profileId=...&isTest=true)', async () => {
        const response = await request(app.getHttpServer())
            .get(`/discovery/components?profileId=${testProfileId}&isTest=true`)
            .set('Authorization', `Bearer ${viewerToken}`)

        if (response.status !== 200) {
            console.error('Validation Error Details:', response.body);
        }

        expect(response.status).toBe(200);

        const tree: ComponentTreeNode[] = response.body.data;
        expect(tree.length).toBeGreaterThan(0); // Root

        // Dive right down to 'Auth'
        const authDir = tree[0].children![0].children!.find(c => c.name === 'Auth')!;

        // Standard Map should be gone! It is not a test.
        expect(authDir.children).toHaveLength(1);
        expect(authDir.children![0].name).toBe('Test Process 1');

        // The 'Billing' folder shouldn't even exist since it had no matching records
        const sfChildren = tree[0].children![0].children!;
        const billingDir = sfChildren.find(c => c.name === 'Billing');
        expect(billingDir).toBeUndefined();
    });

    it('should search components via text and still return valid paths (GET ?profileId=...&search=Standard)', async () => {
        const response = await request(app.getHttpServer())
            .get(`/discovery/components?profileId=${testProfileId}&search=Standard`)
            .set('Authorization', `Bearer ${viewerToken}`)
            .expect(200);

        const tree: ComponentTreeNode[] = response.body.data;

        const authDir = tree[0].children![0].children!.find(c => c.name === 'Auth')!;

        // Only the Standard map should be returned in this folder
        expect(authDir.children).toHaveLength(1);
        expect(authDir.children![0].name).toBe('Standard Map');
    });
});
