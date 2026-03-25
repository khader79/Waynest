import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateStoryDto } from './dto/create-story.dto';
import { StoriesService } from './stories.service';

type AuthRequest = {
  user: {
    sub: string;
  };
};

@Controller('stories')
@UseGuards(JwtAuthGuard)
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post()
  createStory(@Request() req: AuthRequest, @Body() dto: CreateStoryDto) {
    return this.storiesService.createStory(req.user.sub, dto);
  }

  @Get('feed')
  feed(@Request() req: AuthRequest) {
    return this.storiesService.getStoryFeed(req.user.sub);
  }

  @Get(':id')
  getStory(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.storiesService.getStoryById(id, req.user.sub);
  }

  @Post(':id/view')
  viewStory(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.storiesService.viewStory(id, req.user.sub);
  }
}
