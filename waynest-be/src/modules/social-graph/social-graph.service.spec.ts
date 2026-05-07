import { BadRequestException } from '@nestjs/common';
import { SocialGraphService } from './social-graph.service';
import { UserRole } from '../users/entities/user.entity';

describe('SocialGraphService (unit)', () => {
  const usersRepo: any = { findOne: jest.fn() };
  const followsRepo: any = {
    findOne: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    find: jest.fn(),
  };
  const blocksRepo: any = { findOne: jest.fn() };
  const mutesRepo: any = { findOne: jest.fn() };
  const friendshipsRepo: any = { delete: jest.fn() };
  const friendshipService: any = { deleteFriendship: jest.fn() };
  const notificationsService: any = {
    createNotification: jest.fn().mockResolvedValue(undefined),
  };
  const mediaService: any = { publicUploadRef: jest.fn((u: string) => u) };

  let svc: SocialGraphService;

  beforeEach(() => {
    jest.resetAllMocks();
    svc = new SocialGraphService(
      usersRepo,
      followsRepo,
      blocksRepo,
      mutesRepo,
      friendshipsRepo,
      friendshipService,
      notificationsService,
      mediaService,
    );
  });

  it('throws when trying to follow a non-provider', async () => {
    usersRepo.findOne.mockResolvedValue({
      id: 'target-id',
      role: UserRole.USER,
    });
    await expect(
      svc.followUser('actor-id', 'target-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows follow when target is provider and not blocked', async () => {
    usersRepo.findOne.mockResolvedValue({
      id: 'target-id',
      role: UserRole.PROVIDER,
    });
    blocksRepo.findOne.mockResolvedValue(null);
    followsRepo.findOne.mockResolvedValue(null);
    followsRepo.insert.mockResolvedValue(undefined);
    const res = await svc.followUser('actor-id', 'target-id');
    expect(res).toEqual({ following: true });
    expect(followsRepo.insert).toHaveBeenCalledWith({
      followerId: 'actor-id',
      followingId: 'target-id',
    });
  });
});
