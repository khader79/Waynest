import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

type AuthRequest = {
  user: {
    sub: string;
  };
};

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @Request() req: AuthRequest,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = typeof limit === 'string' ? Number(limit) : undefined;
    return this.notificationsService.listForUser(
      req.user.sub,
      Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    );
  }

  @Patch(':id/read')
  markRead(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.notificationsService.markOneRead(req.user.sub, id);
  }

  @Patch('read-all')
  markAllRead(@Request() req: AuthRequest) {
    return this.notificationsService.markAllRead(req.user.sub);
  }
}

