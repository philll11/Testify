// backend/src/config/app.config.ts

import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  version: process.env.npm_package_version,
  environment: process.env.NODE_ENV,
  frontendUrl: process.env.FRONTEND_URL,
  encryptionKey: process.env.ENCRYPTION_KEY,
}));
