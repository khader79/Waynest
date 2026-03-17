import { IsUUID } from 'class-validator';

export class CreateWishlistDto {
  @IsUUID()
  placeId: string;
}
