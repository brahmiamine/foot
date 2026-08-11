import { Global, Module } from '@nestjs/common';
import { SharedDirectoryService } from './shared-directory.service';

@Global()
@Module({
  providers: [SharedDirectoryService],
  exports: [SharedDirectoryService],
})
export class SharedDirectoryModule {}
