import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadController } from './upload.controller';
import { MediaService } from './media.service';
import { SocialPost } from '../social-content/entities/social-post.entity';
import { Story } from '../stories/entities/story.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SocialPost, Story])],
  controllers: [UploadController],
  providers: [MediaService],
  exports: [MediaService],
})
export class UploadModule {}
