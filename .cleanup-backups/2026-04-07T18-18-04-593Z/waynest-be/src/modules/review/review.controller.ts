import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ReviewStatus } from './entities/review.entity';

type AuthRequest = {
  user?: {
    sub: string;
    role: UserRole;
  };
};

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body() createReviewDto: CreateReviewDto,
    @Request() req: AuthRequest,
  ) {
    return this.reviewService.create(createReviewDto, req.user?.sub ?? '');
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll(@Query('status') status?: ReviewStatus) {
    return this.reviewService.findAll(status);
  }

  @Get('places/:placeId')
  findPlaceReviews(@Param('placeId') placeId: string) {
    return this.reviewService.getPlaceReviews(placeId);
  }

  @Get('events/:eventId')
  findEventReviews(@Param('eventId') eventId: string) {
    return this.reviewService.getEventReviews(eventId);
  }

  @Get('places/:placeId/comments')
  findPlaceComments(@Param('placeId') placeId: string) {
    return this.reviewService.getPlaceComments(placeId);
  }

  @Get('events/:eventId/comments')
  findEventComments(@Param('eventId') eventId: string) {
    return this.reviewService.getEventComments(eventId);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.PROVIDER)
  @Post(':id/flag')
  flagAsProvider(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.reviewService.flagAsProvider(id, req.user?.sub ?? '');
  }

  @UseGuards(JwtAuthGuard)
  @Post('places/:placeId/comments')
  createPlaceComment(
    @Param('placeId') placeId: string,
    @Body() dto: CreateCommentDto,
    @Request() req: AuthRequest,
  ) {
    return this.reviewService.createPlaceComment(
      placeId,
      dto,
      req.user?.sub ?? '',
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('events/:eventId/comments')
  createEventComment(
    @Param('eventId') eventId: string,
    @Body() dto: CreateCommentDto,
    @Request() req: AuthRequest,
  ) {
    return this.reviewService.createEventComment(
      eventId,
      dto,
      req.user?.sub ?? '',
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Get('comments/place')
  listPlaceComments(@Query('status') status?: ReviewStatus) {
    return this.reviewService.listPlaceCommentsForAdmin(status);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Get('comments/event')
  listEventComments(@Query('status') status?: ReviewStatus) {
    return this.reviewService.listEventCommentsForAdmin(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reviewService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto) {
    return this.reviewService.update(id, updateReviewDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('comments/:id')
  removeComment(@Param('id') id: string, @Request() req: AuthRequest) {
    const role = req.user?.role ?? UserRole.USER;
    return this.reviewService.removeComment(
      id,
      req.user?.sub ?? '',
      role === UserRole.ADMIN,
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reviewService.remove(id);
  }
}
