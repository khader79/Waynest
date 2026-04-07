import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { WishlistService } from './wishlist.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';

type AuthRequest = {
  user: {
    sub: string;
  };
};

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  add(@Request() req: AuthRequest, @Body() dto: CreateWishlistDto) {
    return this.wishlistService.add(req.user.sub, dto);
  }

  @Delete(':placeId')
  remove(@Request() req: AuthRequest, @Param('placeId') placeId: string) {
    return this.wishlistService.remove(req.user.sub, placeId);
  }

  @Get()
  findByUser(@Request() req: AuthRequest) {
    return this.wishlistService.findByUser(req.user.sub);
  }

  @Get(':placeId/check')
  async check(@Request() req: AuthRequest, @Param('placeId') placeId: string) {
    const inWishlist = await this.wishlistService.isInWishlist(
      req.user.sub,
      placeId,
    );
    return { inWishlist };
  }
}
