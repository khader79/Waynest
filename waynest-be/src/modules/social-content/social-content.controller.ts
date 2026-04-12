import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
  Delete,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateProviderPostDto } from './dto/create-provider-post.dto';
import { SocialContentService } from './social-content.service';
import { CreatePostCommentDto } from './dto/create-post-comment.dto';
import { ReportPostDto } from './dto/report-post.dto';
import { ModeratePostReportDto } from './dto/moderate-post-report.dto';
import { PostReportStatus } from './entities/post-report.entity';
import { UpdatePostDto } from './dto/update-post.dto';

type AuthRequest = {
  user?: {
    sub: string;
  };
};

@Controller('social-content')
export class SocialContentController {
  constructor(private readonly socialContentService: SocialContentService) {}

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  createPost(@Request() req: AuthRequest, @Body() dto: CreatePostDto) {
    return this.socialContentService.createPost(req.user?.sub ?? '', dto);
  }

  @Post('providers/my/posts')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.PROVIDER)
  createProviderPost(
    @Request() req: AuthRequest,
    @Body() dto: CreateProviderPostDto,
  ) {
    return this.socialContentService.createProviderPost(
      req.user?.sub ?? '',
      dto,
    );
  }

  @Get('users/:username/posts')
  @UseGuards(OptionalJwtAuthGuard)
  postsByUsername(
    @Param('username') username: string,
    @Request() req: AuthRequest,
    @Query('limit') limit?: string,
  ) {
    const n = typeof limit === 'string' ? Number(limit) : undefined;
    return this.socialContentService.listPostsByAuthorUsername(
      username,
      req.user?.sub ?? null,
      Number.isFinite(n) ? n : undefined,
    );
  }

  @Get('providers/slug/:slug/posts')
  @UseGuards(OptionalJwtAuthGuard)
  postsByProviderSlug(
    @Param('slug') slug: string,
    @Request() req: AuthRequest,
    @Query('limit') limit?: string,
  ) {
    const n = typeof limit === 'string' ? Number(limit) : undefined;
    return this.socialContentService.listPostsByProviderSlug(
      slug,
      req.user?.sub ?? null,
      Number.isFinite(n) ? n : undefined,
    );
  }

  @Get('feed')
  @UseGuards(OptionalJwtAuthGuard)
  feed(
    @Request() req: AuthRequest,
    @Query('filter') filter?: 'for-you' | 'following' | 'providers',
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const parsedLimit = typeof limit === 'string' ? Number(limit) : undefined;
    return this.socialContentService.listFeed(
      req.user?.sub ?? null,
      filter,
      Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      cursor,
    );
  }

  @Get('posts/:id')
  @UseGuards(OptionalJwtAuthGuard)
  getPost(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.socialContentService.getPostById(id, req.user?.sub ?? null);
  }

  @Patch('posts/:id')
  @UseGuards(JwtAuthGuard)
  updatePost(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() dto: UpdatePostDto,
  ) {
    return this.socialContentService.updatePost(id, req.user?.sub ?? '', dto);
  }

  @Delete('posts/:id')
  @UseGuards(JwtAuthGuard)
  deletePost(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.socialContentService.deletePost(id, req.user?.sub ?? '');
  }

  @Post('posts/:id/like')
  @UseGuards(JwtAuthGuard)
  like(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.socialContentService.toggleLike(id, req.user?.sub ?? '');
  }

  @Post('posts/:id/save')
  @UseGuards(JwtAuthGuard)
  save(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.socialContentService.savePost(id, req.user?.sub ?? '');
  }

  @Delete('posts/:id/save')
  @UseGuards(JwtAuthGuard)
  unsave(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.socialContentService.unsavePost(id, req.user?.sub ?? '');
  }

  @Get('posts/:id/comments')
  @UseGuards(OptionalJwtAuthGuard)
  comments(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.socialContentService.listComments(id, req.user?.sub ?? null);
  }

  @Post('posts/:id/comments')
  @UseGuards(JwtAuthGuard)
  addComment(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() dto: CreatePostCommentDto,
  ) {
    return this.socialContentService.createComment(
      id,
      req.user?.sub ?? '',
      dto,
    );
  }

  @Post('posts/:id/report')
  @UseGuards(JwtAuthGuard)
  report(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() dto: ReportPostDto,
  ) {
    return this.socialContentService.reportPost(id, req.user?.sub ?? '', dto);
  }

  @Get('reports')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  reports(@Query('status') status?: PostReportStatus) {
    return this.socialContentService.listReports(status);
  }

  @Patch('reports/:id/moderate')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  moderateReport(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() dto: ModeratePostReportDto,
  ) {
    return this.socialContentService.moderateReport(
      id,
      req.user?.sub ?? '',
      dto,
    );
  }
}
