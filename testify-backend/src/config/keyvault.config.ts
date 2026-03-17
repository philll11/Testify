import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

export default async (): Promise<Record<string, any>> => {
    const kvUrl = process.env.AZURE_KEY_VAULT_URL;
    const secrets: Record<string, string> = {};

    if (kvUrl) {
        try {
            console.log(`[KeyVault] Connecting to Key Vault: ${kvUrl}`);
            const credential = new DefaultAzureCredential();
            const client = new SecretClient(kvUrl, credential);

            const secretsToLoad = [
                // Database Connection Details
                'DATABASE-HOST',
                'DATABASE-PORT',
                'DATABASE-USER',
                'DATABASE-PASSWORD',
                'DATABASE-NAME',
                // Redis Connection Details
                'REDIS-HOST',
                'REDIS-PORT',
                'REDIS-DB',
                // Application Secrets
                'ADMIN-PASSWORD',
                'JWT-SECRET',
                'ENCRYPTION-KEY',
            ];

            for (const secretName of secretsToLoad) {
                try {
                    const secret = await client.getSecret(secretName);
                    const envName = secretName.replace(/-/g, '_').toUpperCase();
                    if (secret.value) {
                        secrets[envName] = secret.value;
                    }
                } catch (e) {
                    console.warn(`[KeyVault] Failed to load secret ${secretName}:`, e.message);
                }
            }
            console.log('[KeyVault] Secrets loaded successfully.');
        } catch (e) {
            console.error('[KeyVault] Failed to initialize Azure Key Vault client:', e.message);
        }
    }

    return secrets;
};
