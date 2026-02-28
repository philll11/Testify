import * as dotenv from 'dotenv';
import { BoomiService } from '../../src/integration/boomi/boomi.service';

dotenv.config();

/**
 * LIVE API VERIFICATION TEST
 * 
 * This test file runs against the REAL Boomi API to verify that our TypeScript
 * interfaces and assumed response payloads (like `fullPath`, `parentFolderId`, etc.)
 * accurately match what the external Boomi Platform delivers.
 * 
 */

describe('BoomiService - Live API Verification (e2e)', () => {
    // Give Jest enough time to wait for real API responses
    jest.setTimeout(120000); // 2 minutes

    let boomiService: BoomiService;

    // IMPORTANT: Do not commit real credentials. Use environment variables 
    // or put them here temporarily for local execution ONLY.
    const accountId = process.env.BOOMI_ACCOUNT_ID || '';
    const username = process.env.BOOMI_USERNAME || '';
    const password = process.env.BOOMI_PASSWORD || '';
    const executionInstanceId = process.env.BOOMI_EXECUTION_INSTANCE || '';

    const isConfigured = !!(accountId && username && password && executionInstanceId);

    beforeAll(() => {
        if (isConfigured) {
            boomiService = new BoomiService({
                accountId,
                username,
                passwordOrToken: password,
                executionInstanceId,
            });
        } else {
            console.warn(
                '⚠️ Live Boomi tests skipped because credentials (BOOMI_ACCOUNT_ID, BOOMI_USERNAME, BOOMI_PASSWORD, BOOMI_EXECUTION_INSTANCE_ID) are not set in the environment.'
            );
        }
    });

    // Dynamically skip tests if credentials are not provided
    const runIfConfigured = isConfigured ? it : it.skip;

    runIfConfigured.skip('1. should connect to Boomi successfully', async () => {
        const result = await boomiService.testConnection();
        expect(result).toBe(true);
    });

    runIfConfigured('2. should hit /ComponentMetadata/query and map data successfully', async () => {
        const results = await boomiService.searchComponents({ types: ['process'] });

        expect(Array.isArray(results)).toBe(true);

        if (results.length > 0) {
            const sample = results[0];
            expect(sample.id).toBeDefined();
            expect(sample.name).toBeDefined();
            expect(sample.type).toBeDefined();

            console.log(`✅ searchComponents payload maps correctly. Sample ID: ${sample.id}, Type: ${sample.type}`);
        } else {
            console.log('No processes found to validate payload.');
        }
    });

    runIfConfigured.skip('3. should hit /ComponentReference/query and parse dependencies correctly', async () => {
        // We need a known component. Let's query one first.
        const components = await boomiService.searchComponents({ types: ['process'] });

        if (components.length > 0) {
            const target = components[0];
            const info = await boomiService.getComponentInfoAndDependencies(target.id);

            expect(info).toBeDefined();
            expect(info?.id).toBe(target.id);
            // Ensures the mapping doesn't throw a TypeError from deeply nested missing properties
            expect(Array.isArray(info?.dependencyIds)).toBe(true);

            console.log(`✅ getComponentInfoAndDependencies resolved for ${info?.name}. Dependencies found: ${info?.dependencyIds.length}`);
        }
    });

    runIfConfigured.skip('4. should hit /Folder/:id and capture fullPath without recursing blindly', async () => {
        // Find a component that belongs to a folder
        const components = await boomiService.searchComponents({});
        const componentWithFolder = components.find(c => Boolean(c.folderId));

        if (componentWithFolder && componentWithFolder.folderId) {
            // Test the logic we specifically questioned!
            const path = await boomiService.resolveFolderPath(componentWithFolder.folderId);

            expect(path).toBeDefined();
            expect(typeof path).toBe('string');
            // Our logic forces a prefixed slash if it exists
            expect(path.startsWith('/')).toBe(true);

            console.log(`✅ resolveFolderPath extracted data correctly. Evaluated Path: ${path}`);
        } else {
            console.log('No components with a folderId could be found in the live system to test mapping.');
        }
    });
});