import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from './auth/decorators/public.decorator';
import { SharedDirectoryService } from './database/shared-directory.service';

@Controller()
export class AppController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly sharedDirectory: SharedDirectoryService,
  ) {}

  @Public()
  @Get('health')
  async health() {
    const startedAt = Date.now();
    const directoryDb = this.sharedDirectory.isEnabled()
      ? 'configured'
      : 'not_configured';

    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'ok',
        service: 'notifications',
        database: 'ok',
        directoryDb,
        responseTimeMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'notifications',
        database: 'error',
        directoryDb,
        responseTimeMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
