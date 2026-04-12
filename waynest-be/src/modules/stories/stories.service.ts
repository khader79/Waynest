import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, MoreThan, Repository } from 'typeorm';
import { FollowRelation } from '../social-graph/entities/follow-relation.entity';
import {
  Friendship,
  FriendshipStatus,
} from '../social-graph/entities/friendship.entity';
import { User } from '../users/entities/user.entity';
import { CreateStoryDto } from './dto/create-story.dto';
import { Story } from './entities/story.entity';
import { StoryView } from './entities/story-view.entity';
import { UpdateStoryDto } from './dto/update-story.dto';
import { MediaService } from '../upload/media.service';
import { SocialPost } from '../social-content/entities/social-post.entity';

@Injectable()
export class StoriesService {
  constructor(
    @InjectRepository(Story)
    private readonly storiesRepo: Repository<Story>,
    @InjectRepository(StoryView)
    private readonly storyViewsRepo: Repository<StoryView>,
    @InjectRepository(FollowRelation)
    private readonly followsRepo: Repository<FollowRelation>,
    @InjectRepository(Friendship)
    private readonly friendshipRepo: Repository<Friendship>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(SocialPost)
    private readonly postsRepo: Repository<SocialPost>,
    private readonly mediaService: MediaService,
  ) {}

  async createStory(actorId: string, dto: CreateStoryDto) {
    await this.cleanupExpiredStories();
    const imageUrl = this.mediaService.normalizeUploadImageRef(dto.imageUrl);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const story = await this.storiesRepo.save(
      this.storiesRepo.create({
        authorId: actorId,
        caption: dto.caption?.trim() || null,
        expiresAt,
        imageUrl,
      }),
    );

    return this.getStoryById(story.id, actorId);
  }

  async getStoryById(storyId: string, actorId: string) {
    const story = await this.storiesRepo.findOne({
      where: { id: storyId },
      relations: ['author'],
    });

    if (!story || story.expiresAt.getTime() <= Date.now()) {
      throw new NotFoundException('Story not found');
    }

    if (!(await this.canAccessStory(actorId, story.authorId))) {
      throw new ForbiddenException('Story unavailable');
    }

    const viewsCount = await this.storyViewsRepo.count({
      where: { storyId: story.id },
    });
    return this.serializeStory(story, viewsCount);
  }

  async getStoryFeed(actorId: string) {
    const visibleAuthorIds = await this.getVisibleAuthorIds(actorId);
    if (visibleAuthorIds.length === 0) {
      return [];
    }

    const stories = await this.storiesRepo.find({
      where: {
        authorId: In(visibleAuthorIds),
        expiresAt: MoreThan(new Date()),
      },
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });

    if (stories.length === 0) {
      return [];
    }

    const storyIds = stories.map((story) => story.id);
    const viewCounts = await this.storyViewsRepo
      .createQueryBuilder('story_view')
      .select('story_view.storyId', 'storyId')
      .addSelect('COUNT(*)', 'count')
      .where('story_view.storyId IN (:...ids)', { ids: storyIds })
      .groupBy('story_view.storyId')
      .getRawMany<{ storyId: string; count: string }>();

    const countsMap = new Map(
      viewCounts.map((row) => [row.storyId, Number(row.count)]),
    );

    return stories.map((story) =>
      this.serializeStory(story, countsMap.get(story.id) ?? 0),
    );
  }

  async viewStory(storyId: string, actorId: string) {
    const story = await this.storiesRepo.findOne({ where: { id: storyId } });
    if (!story || story.expiresAt.getTime() <= Date.now()) {
      throw new NotFoundException('Story not found');
    }

    if (!(await this.canAccessStory(actorId, story.authorId))) {
      throw new ForbiddenException('Story unavailable');
    }

    if (story.authorId === actorId) {
      return { success: true };
    }

    const existing = await this.storyViewsRepo.findOne({
      where: { storyId, viewerId: actorId },
    });

    if (!existing) {
      await this.storyViewsRepo.save(
        this.storyViewsRepo.create({
          storyId,
          viewerId: actorId,
        }),
      );
    }

    return { success: true };
  }

  async updateStory(storyId: string, actorId: string, dto: UpdateStoryDto) {
    const story = await this.storiesRepo.findOne({ where: { id: storyId } });
    if (!story || story.expiresAt.getTime() <= Date.now()) {
      throw new NotFoundException('Story not found');
    }
    if (story.authorId !== actorId) {
      throw new ForbiddenException('Not allowed to update this story');
    }
    const previousImage = story.imageUrl;
    if (typeof dto.caption === 'string') {
      story.caption = dto.caption.trim() || null;
    }
    if (typeof dto.imageUrl === 'string' && dto.imageUrl.trim()) {
      story.imageUrl = this.mediaService.normalizeUploadImageRef(dto.imageUrl);
    }
    const saved = await this.storiesRepo.save(story);
    if (saved.imageUrl !== previousImage) {
      await this.deleteImageIfOrphaned(previousImage, saved.id);
    }
    return this.getStoryById(saved.id, actorId);
  }

  async deleteStory(storyId: string, actorId: string) {
    const story = await this.storiesRepo.findOne({ where: { id: storyId } });
    if (!story) {
      throw new NotFoundException('Story not found');
    }
    if (story.authorId !== actorId) {
      throw new ForbiddenException('Not allowed to delete this story');
    }
    await this.storyViewsRepo.delete({ storyId });
    await this.storiesRepo.delete({ id: storyId });
    await this.deleteImageIfOrphaned(story.imageUrl, story.id);
    return { deleted: true };
  }

  private async cleanupExpiredStories() {
    const expired = await this.storiesRepo
      .createQueryBuilder('story')
      .where('story.expiresAt <= :now', { now: new Date() })
      .getMany();
    if (expired.length === 0) {
      return;
    }
    const expiredIds = expired.map((story) => story.id);
    await this.storyViewsRepo.delete({ storyId: In(expiredIds) });
    await this.storiesRepo.delete(expiredIds);
    for (const story of expired) {
      await this.deleteImageIfOrphaned(story.imageUrl, story.id);
    }
  }

  private async deleteImageIfOrphaned(
    imageUrl: string,
    excludeStoryId?: string,
  ) {
    if (!imageUrl) return;
    const variants = this.mediaService.uploadRefVariantsForQuery(imageUrl);
    if (variants.length === 0) return;

    const usedByOtherStory = await this.storiesRepo
      .createQueryBuilder('story')
      .where(
        new Brackets((qb) => {
          variants.forEach((v, i) => {
            qb.orWhere(`story.imageUrl = :sv${i}`, { [`sv${i}`]: v });
          });
        }),
      )
      .andWhere(excludeStoryId ? 'story.id != :excludeStoryId' : '1=1', {
        excludeStoryId,
      })
      .getExists();
    if (usedByOtherStory) return;

    const usedByPost = await this.postsRepo
      .createQueryBuilder('post')
      .where(
        new Brackets((qb) => {
          variants.forEach((v, i) => {
            qb.orWhere(`:pv${i} = ANY(post.imageUrls)`, { [`pv${i}`]: v });
          });
        }),
      )
      .getExists();
    if (usedByPost) return;

    this.mediaService.deleteByUrl(imageUrl);
  }

  private async getVisibleAuthorIds(actorId: string) {
    const [acceptedFriendships, follows] = await Promise.all([
      this.friendshipRepo.find({
        where: [
          { status: FriendshipStatus.ACCEPTED, userLowId: actorId },
          { status: FriendshipStatus.ACCEPTED, userHighId: actorId },
        ],
        select: { userLowId: true, userHighId: true },
      }),
      this.followsRepo.find({
        where: { followerId: actorId },
        select: { followingId: true },
      }),
    ]);

    const friendIds = acceptedFriendships.map((row) =>
      row.userLowId === actorId ? row.userHighId : row.userLowId,
    );

    return [
      ...new Set([
        actorId,
        ...friendIds,
        ...follows.map((follow) => follow.followingId),
      ]),
    ];
  }

  private async canAccessStory(actorId: string, authorId: string) {
    if (actorId === authorId) {
      return true;
    }

    const visibleAuthorIds = await this.getVisibleAuthorIds(actorId);
    return visibleAuthorIds.includes(authorId);
  }

  private serializeStory(story: Story, viewsCount: number) {
    return {
      id: story.id,
      imageUrl:
        this.mediaService.toRelativeUploadPath(story.imageUrl) ??
        story.imageUrl,
      caption: story.caption,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
      viewsCount,
      author: {
        id: story.author.id,
        username: story.author.username,
        firstName: story.author.firstName,
        lastName: story.author.lastName,
        avatarUrl: this.mediaService.publicUploadRef(story.author.avatarUrl),
      },
    };
  }
}
