import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { UpsertPushSubscriptionDto } from './dto/upsert-push-subscription.dto';
import { RemovePushSubscriptionDto } from './dto/remove-push-subscription.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

type AuthRequest = {
  user: {
    sub: string;
  };
};

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('preferences')
  preferences(@Request() req: AuthRequest) {
    return this.notificationsService.getPreferences(req.user.sub);
  }

  @Patch('preferences')
  updatePreferences(
    @Request() req: AuthRequest,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(req.user.sub, dto);
  }

  @Get('push/public-key')
  pushPublicKey() {
    return { publicKey: this.notificationsService.getPushPublicKey() };
  }

  @Post('push/subscribe')
  subscribePush(
    @Request() req: AuthRequest,
    @Body() dto: UpsertPushSubscriptionDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.notificationsService.upsertPushSubscription(
      req.user.sub,
      dto,
      userAgent,
    );
  }

  @Post('push/unsubscribe')
  unsubscribePush(
    @Request() req: AuthRequest,
    @Body() dto: RemovePushSubscriptionDto,
  ) {
    return this.notificationsService.removePushSubscription(
      req.user.sub,
      dto.endpoint,
    );
  }

  @Get('unread-count')
  unreadCount(@Request() req: AuthRequest) {
    return this.notificationsService
      .countUnread(req.user.sub)
      .then((count) => ({ count }));
  }

  @Get()
  list(@Request() req: AuthRequest, @Query('limit') limit?: string) {
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
