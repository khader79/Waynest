import { BadRequestException } from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { UserRole } from '../users/entities/user.entity';

describe('FriendshipService (unit)', () => {
  const usersRepo: any = { findOne: jest.fn() };
  const friendshipRepo: any = { findOne: jest.fn(), create: jest.fn(), insert: jest.fn(), save: jest.fn(), find: jest.fn() };
  const mediaService: any = { publicUploadRef: jest.fn() };
  const notificationsService: any = { createNotification: jest.fn().mockResolvedValue(undefined) };

  let svc: FriendshipService;

  beforeEach(() => {
    jest.resetAllMocks();
    svc = new FriendshipService(usersRepo, friendshipRepo, mediaService, notificationsService);
  });

  it('throws when trying to send friend request to a provider', async () => {
    usersRepo.findOne.mockResolvedValue({ id: 'p1', role: UserRole.PROVIDER });
    await expect(svc.requestByUsername('actor-id', 'providerUser')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a pending friendship when target is regular user', async () => {
    usersRepo.findOne.mockResolvedValue({ id: 'u1', role: UserRole.USER });
    friendshipRepo.findOne.mockResolvedValue(null);
    friendshipRepo.create.mockReturnValue({});
    friendshipRepo.insert.mockResolvedValue(undefined);
    const res = await svc.requestByUsername('actor-id', 'regularUser');
    expect(res).toEqual({ status: 'PENDING' });
    expect(friendshipRepo.insert).toHaveBeenCalled();
  });
});
