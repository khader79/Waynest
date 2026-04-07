import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderApplication } from './entities/provider-application.entity';
import { ProviderApplicationsService } from './provider-applications.service';
import { ProviderApplicationsController } from './provider-applications.controller';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProviderApplication]), ProvidersModule],
  controllers: [ProviderApplicationsController],
  providers: [ProviderApplicationsService],
  exports: [ProviderApplicationsService],
})
export class ProviderApplicationsModule {}
