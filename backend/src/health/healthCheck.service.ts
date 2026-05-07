import fs from 'fs';
import os from 'os';
import { isConnected } from '../db/connection';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: boolean;
    memory: boolean;
    disk: boolean;
  };
  uptime: number;
}

export interface HealthCheckService {
  checkLiveness(): Promise<HealthStatus>;
  checkReadiness(): Promise<HealthStatus>;
}

type DatabaseCheck = () => boolean;

export class DefaultHealthCheckService implements HealthCheckService {
  constructor(private readonly databaseCheck: DatabaseCheck = isConnected) {}

  async checkLiveness(): Promise<HealthStatus> {
    return this.buildStatus({ requireDatabase: false });
  }

  async checkReadiness(): Promise<HealthStatus> {
    return this.buildStatus({ requireDatabase: true });
  }

  private async buildStatus(options: { requireDatabase: boolean }): Promise<HealthStatus> {
    const database = this.databaseCheck();
    const memory = process.memoryUsage().rss < 512 * 1024 * 1024;
    const disk = this.checkDiskAccess();

    let status: HealthStatus['status'] = 'healthy';
    if (options.requireDatabase && !database) {
      status = 'unhealthy';
    } else if (!memory || !disk || !database) {
      status = options.requireDatabase ? 'unhealthy' : 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        database,
        memory,
        disk,
      },
      uptime: Number(process.uptime().toFixed(3)),
    };
  }

  private checkDiskAccess(): boolean {
    try {
      fs.accessSync(process.cwd(), fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }
}

export const healthCheckService = new DefaultHealthCheckService();