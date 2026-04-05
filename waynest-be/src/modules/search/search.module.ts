import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Provider } from '../providers/entities/provider.entity';
import { Place } from '../place/entities/place.entity';
import { Event } from '../event/entities/event.entity';
import { BlockRelation } from '../social-graph/entities/block-relation.entity';
import { SocialGraphModule } from '../social-graph/social-graph.module';
import { ProvidersModule } from '../providers/providers.module';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { PublicDirectoryController } from './public-directory.controller';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Provider, Place, Event, BlockRelation]),
    SocialGraphModule,
    ProvidersModule,
    UploadModule,
  ],
  controllers: [SearchController, PublicDirectoryController],
  providers: [SearchService],
})
export class SearchModule {}
