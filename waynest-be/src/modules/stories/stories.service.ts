import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FollowRelation } from '../social-graph/entities/follow-relation.entity';
import { Friendship, FriendshipStatus } from '../social-graph/entities/friendship.entity';
import { User } from '../users/entities/user.entity';
import { CreateStoryDto } from './dto/create-story.dto';
import { Story } from './entities/story.entity';
import { StoryView } from './entities/story-view.entity';

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
  ) {}

  async createStory(actorId: string, dto: CreateStoryDto) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const story = await this.storiesRepo.save(
      this.storiesRepo.create({
        authorId: actorId,
        caption: dto.caption?.trim() || null,
        expiresAt,
        imageUrl: dto.imageUrl.trim(),
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

    const viewsCount = await this.storyViewsRepo.count({ where: { storyId: story.id } });
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
      },
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });

    const now = Date.now();
    const activeStories = stories.filter((story) => story.expiresAt.getTime() > now);
    if (activeStories.length === 0) {
      return [];
    }

    const storyIds = activeStories.map((story) => story.id);
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

    return activeStories.map((story) =>
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

  private async getVisibleAuthorIds(actorId: string) {
    const [acceptedFriendships, follows] = await Promise.all([
      this.friendshipRepo.find({
        where: { status: FriendshipStatus.ACCEPTED },
      }),
      this.followsRepo.find({ where: { followerId: actorId } }),
    ]);

    const friendIds = acceptedFriendships
      .filter((row) => row.userLowId === actorId || row.userHighId === actorId)
      .map((row) => (row.userLowId === actorId ? row.userHighId : row.userLowId));

    return [...new Set([actorId, ...friendIds, ...follows.map((follow) => follow.followingId)])];
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
      imageUrl: story.imageUrl,
      caption: story.caption,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
      viewsCount,
      author: {
        id: story.author.id,
        username: story.author.username,
        firstName: story.author.firstName,
        lastName: story.author.lastName,
        avatarUrl: story.author.avatarUrl ?? null,
      },
    };
  }
}
