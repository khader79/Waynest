import {
  BadRequestException,
  Controller,
  Body,
  Delete,
  ForbiddenException,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MediaService, mediaUtils } from './media.service';
import { Repository } from 'typeorm';
import { SocialPost } from '../social-content/entities/social-post.entity';
import { Story } from '../stories/entities/story.entity';
import { DeleteImageDto } from './dto/delete-image.dto';

mkdirSync(mediaUtils.uploadsDir, { recursive: true });

type UploadedImage = {
  filename: string;
  originalname: string;
  mimetype: string;
};
type AuthRequest = { user?: { sub: string } };

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(
    private readonly mediaService: MediaService,
    @InjectRepository(SocialPost)
    private readonly postsRepo: Repository<SocialPost>,
    @InjectRepository(Story)
    private readonly storiesRepo: Repository<Story>,
  ) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, mediaUtils.uploadsDir);
        },
        filename: (_req, file, cb) => {
          const extension = extname(file.originalname).toLowerCase();
          const safeExtension = mediaUtils.allowedExtensions.has(extension)
            ? extension
            : '.jpg';
          cb(null, `${Date.now()}-${randomUUID()}${safeExtension}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        try {
          const extension = file.originalname
            .slice(file.originalname.lastIndexOf('.'))
            .toLowerCase();
          if (
            !mediaUtils.allowedExtensions.has(extension) ||
            !mediaUtils.allowedMimeTypes.has(file.mimetype)
          ) {
            throw new BadRequestException('Only valid image files are allowed');
          }
          cb(null, true);
        } catch (error) {
          cb(error as Error, false);
        }
      },
    }),
  )
  uploadImage(@UploadedFile() file: UploadedImage | undefined) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    this.mediaService.validateImage(file);
    const relativePath = this.mediaService.toRelativePath(file.filename);
    return {
      path: relativePath,
      url: this.mediaService.toAbsoluteUrl(relativePath),
    };
  }

  @Delete('image')
  async deleteImage(@Request() req: AuthRequest, @Body() dto: DeleteImageDto) {
    const actorId = req.user?.sub;
    if (!actorId) {
      throw new BadRequestException('Invalid user');
    }
    const imageUrl = dto.imageUrl?.trim();
    if (!imageUrl) {
      throw new BadRequestException('Image URL is required');
    }

    const referencedByOtherUsersPost = await this.postsRepo
      .createQueryBuilder('post')
      .where(':imageUrl = ANY(post.imageUrls)', { imageUrl })
      .andWhere('post.authorId != :actorId', { actorId })
      .getExists();
    const referencedByOtherUsersStory = await this.storiesRepo
      .createQueryBuilder('story')
      .where('story.imageUrl = :imageUrl', { imageUrl })
      .andWhere('story.authorId != :actorId', { actorId })
      .getExists();

    if (referencedByOtherUsersPost || referencedByOtherUsersStory) {
      throw new ForbiddenException('Cannot delete image referenced by other users');
    }

    const referencedByActor = (await this.postsRepo
      .createQueryBuilder('post')
      .where(':imageUrl = ANY(post.imageUrls)', { imageUrl })
      .andWhere('post.authorId = :actorId', { actorId })
      .getExists()) || (await this.storiesRepo
      .createQueryBuilder('story')
      .where('story.imageUrl = :imageUrl', { imageUrl })
      .andWhere('story.authorId = :actorId', { actorId })
      .getExists());

    if (referencedByActor) {
      throw new BadRequestException('Image still referenced by your content');
    }

    return { deleted: this.mediaService.deleteByUrl(imageUrl) };
  }
}
