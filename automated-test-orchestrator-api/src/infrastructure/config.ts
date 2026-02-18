// src/infrastructure/config.ts

import { injectable } from 'inversify';

export interface IPlatformConfig {
  pollInterval: number;
  maxPolls: number;
  maxRetries: number;
  initialDelay: number;
  concurrencyLimit: number;
  jwtSecret: string;
}

@injectable()
export class PlatformConfig implements IPlatformConfig {
  public readonly pollInterval: number;
  public readonly maxPolls: number;
  public readonly maxRetries: number;
  public readonly initialDelay: number;
  public readonly concurrencyLimit: number;
  public readonly jwtSecret: string;

  constructor() {
    this.pollInterval = parseInt(process.env.PLATFORM_POLL_INTERVAL || '2000', 10);
    this.maxPolls = parseInt(process.env.PLATFORM_MAX_POLLS || '180', 10);
    this.maxRetries = parseInt(process.env.PLATFORM_MAX_RETRIES || '5', 10);
    this.initialDelay = parseInt(process.env.PLATFORM_INITIAL_DELAY || '1000', 10);
    this.concurrencyLimit = parseInt(process.env.PLATFORM_CONCURRENCY_LIMIT || '5', 10);

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    this.jwtSecret = process.env.JWT_SECRET;
  }
}