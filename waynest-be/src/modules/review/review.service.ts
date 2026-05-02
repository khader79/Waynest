import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review, ReviewStatus } from './entities/review.entity';
import { Place } from '../place/entities/place.entity';
import { User } from '../users/entities/user.entity';
import { Event } from '../event/entities/event.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PlaceComment } from './entities/place-comment.entity';
import { EventComment } from './entities/event-comment.entity';
import { assertNoAbusiveContent } from 'src/common/utils/contentModeration';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    @InjectRepository(Review)
    private readonly repo: Repository<Review>,
    @InjectRepository(PlaceComment)
    private readonly placeCommentsRepo: Repository<PlaceComment>,
    @InjectRepository(EventComment)
    private readonly eventCommentsRepo: Repository<EventComment>,
    @InjectRepository(Place)
    private readonly placeRepo: Repository<Place>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private queueNotification(
    input: Parameters<NotificationsService['createNotification']>[0],
  ) {
    void this.notificationsService.createNotification(input).catch((err) => {
      // Log notification failures but don't block operation
    });
  }

  private async validateTarget(placeId?: string, eventId?: string) {
    if (!!placeId === !!eventId) {
      throw new BadRequestException(
        'Exactly one of place or event must be provided',
      );
    }
    if (placeId) {
      const place = await this.placeRepo.findOne({ where: { id: placeId } });
      if (!place) throw new NotFoundException('Place not found');
      return { place };
    }
    const event = await this.eventRepo.findOne({ where: { id: eventId! } });
    if (!event) throw new NotFoundException('Event not found');
    return { event };
  }

  private async recalculatePlaceRatings(placeId: string) {
    const stats = await this.repo
      .createQueryBuilder('review')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(AVG(review.rating), 0)', 'average')
      .where('review.placeId = :placeId', { placeId })
      .andWhere('review.status = :status', { status: ReviewStatus.APPROVED })
      .getRawOne<{ count: string; average: string }>();
    const count = Number(stats?.count ?? 0);
    const average = Number(stats?.average ?? 0);
    await this.placeRepo.update(placeId, {
      ratingAverage: Number(average.toFixed(2)),
      ratingCount: count,
    });
  }

  async create(dto: CreateReviewDto, userId: string) {
    const { place, event, ...rest } = dto;
    await this.validateTarget(place, event);
    assertNoAbusiveContent(rest.comment ?? '', 'review');
    const existing = await this.repo.findOne({
      where: place
        ? { userId, placeId: place }
        : { userId, eventId: event ?? undefined },
    });
    if (existing) {
      existing.rating = rest.rating;
      existing.comment =
        typeof rest.comment === 'string' && rest.comment.trim()
          ? rest.comment.trim()
          : null;
      existing.status = ReviewStatus.APPROVED;
      existing.isFlagged = false;
      existing.moderatedAt = null;
      existing.moderatedBy = null;
      existing.moderationNote = null;

      const updated = await this.repo.save(existing);
      if (updated.placeId) {
        await this.recalculatePlaceRatings(updated.placeId);
      }
      return updated;
    }
    const review = this.repo.create({
      ...rest,
      comment:
        typeof rest.comment === 'string' && rest.comment.trim()
          ? rest.comment.trim()
          : null,
      status: ReviewStatus.APPROVED,
      place: place ? ({ id: place } as Place) : null,
      placeId: place ?? null,
      event: event ? ({ id: event } as Event) : null,
      eventId: event ?? null,
      user: { id: userId } as User,
      userId,
    });
    const saved = await this.repo.save(review);
    if (saved.placeId) {
      await this.recalculatePlaceRatings(saved.placeId);
      const place = await this.placeRepo.findOne({
        where: { id: saved.placeId },
        relations: ['provider'],
      });
      const ownerId = place?.provider?.ownerUserId ?? null;
      if (ownerId && ownerId !== userId && place) {
        this.queueNotification({
          actorId: userId,
          recipientId: ownerId,
          type: NotificationType.REVIEW_NEW,
          message: `New review on ${place.name}`,
          meta: {
            reviewId: saved.id,
            placeId: place.id,
            placeSlug: place.slug,
            rating: saved.rating,
          },
        });
      }
    }
    return saved;
  }

  async findAll(status?: ReviewStatus) {
    return await this.repo.find({
      where: status ? { status } : {},
      relations: ['place', 'event', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, onlyApproved = false) {
    const review = await this.repo.findOne({
      where: onlyApproved ? { id, status: ReviewStatus.APPROVED } : { id },
      relations: ['place', 'event', 'user'],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async update(id: string, dto: UpdateReviewDto) {
    const review = await this.findOne(id);
    const { place, event, ...rest } = dto;

    Object.assign(review, rest);

    if (place || event) {
      await this.validateTarget(place, event);
      review.place = { id: place } as Place;
      review.placeId = place ?? null;
      review.event = event ? ({ id: event } as Event) : null;
      review.eventId = event ?? null;
    }
    review.status = ReviewStatus.APPROVED;
    review.moderatedAt = null;
    review.moderatedBy = null;
    review.moderationNote = null;

    const saved = await this.repo.save(review);
    if (saved.placeId) {
      await this.recalculatePlaceRatings(saved.placeId);
    }
    return saved;
  }

  async getPlaceReviews(placeId: string) {
    await this.validateTarget(placeId, undefined);
    try {
      return await this.repo.find({
        where: { placeId, status: ReviewStatus.APPROVED },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (
        message.includes('column') ||
        message.includes('relation') ||
        message.includes('does not exist')
      ) {
        this.logger.warn(
          `Falling back to empty place reviews for ${placeId} due to schema mismatch: ${message}`,
        );
        return [];
      }
      throw error;
    }
  }

  async getEventReviews(eventId: string) {
    await this.validateTarget(undefined, eventId);
    try {
      return await this.repo.find({
        where: { eventId, status: ReviewStatus.APPROVED },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (
        message.includes('column') ||
        message.includes('relation') ||
        message.includes('does not exist')
      ) {
        this.logger.warn(
          `Falling back to empty event reviews for ${eventId} due to schema mismatch: ${message}`,
        );
        return [];
      }
      throw error;
    }
  }

  private async getApprovedPlaceComments(placeId: string) {
    try {
      return await this.placeCommentsRepo.find({
        where: { placeId, status: ReviewStatus.APPROVED },
        relations: ['user'],
        order: { createdAt: 'ASC' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (
        message.includes('column') ||
        message.includes('relation') ||
        message.includes('does not exist')
      ) {
        this.logger.warn(
          `Falling back to empty place comments for ${placeId} due to schema mismatch: ${message}`,
        );
        return [];
      }
      throw error;
    }
  }

  private async getApprovedEventComments(eventId: string) {
    try {
      return await this.eventCommentsRepo.find({
        where: { eventId, status: ReviewStatus.APPROVED },
        relations: ['user'],
        order: { createdAt: 'ASC' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (
        message.includes('column') ||
        message.includes('relation') ||
        message.includes('does not exist')
      ) {
        this.logger.warn(
          `Falling back to empty event comments for ${eventId} due to schema mismatch: ${message}`,
        );
        return [];
      }
      throw error;
    }
  }

  async getPlaceComments(placeId: string) {
    await this.validateTarget(placeId, undefined);
    return this.getApprovedPlaceComments(placeId);
  }

  async getEventComments(eventId: string) {
    await this.validateTarget(undefined, eventId);
    return this.getApprovedEventComments(eventId);
  }

  async createPlaceComment(
    placeId: string,
    dto: CreateCommentDto,
    userId: string,
  ) {
    await this.validateTarget(placeId, undefined);
    assertNoAbusiveContent(dto.content, 'comment');
    if (dto.parentId) {
      const parent = await this.placeCommentsRepo.findOne({
        where: { id: dto.parentId, placeId },
      });
      if (!parent) throw new NotFoundException('Parent comment not found');
    }
    const record = this.placeCommentsRepo.create({
      placeId,
      userId,
      user: { id: userId } as User,
      place: { id: placeId } as Place,
      content: dto.content,
      parentId: dto.parentId ?? null,
      status: ReviewStatus.APPROVED,
    });
    return this.placeCommentsRepo.save(record);
  }

  async createEventComment(
    eventId: string,
    dto: CreateCommentDto,
    userId: string,
  ) {
    await this.validateTarget(undefined, eventId);
    assertNoAbusiveContent(dto.content, 'comment');
    if (dto.parentId) {
      const parent = await this.eventCommentsRepo.findOne({
        where: { id: dto.parentId, eventId },
      });
      if (!parent) throw new NotFoundException('Parent comment not found');
    }
    const record = this.eventCommentsRepo.create({
      eventId,
      userId,
      user: { id: userId } as User,
      event: { id: eventId } as Event,
      content: dto.content,
      parentId: dto.parentId ?? null,
      status: ReviewStatus.APPROVED,
    });
    return this.eventCommentsRepo.save(record);
  }

  async listPlaceCommentsForAdmin(status?: ReviewStatus) {
    return this.placeCommentsRepo.find({
      where: status ? { status } : {},
      relations: ['place', 'user', 'parent'],
      order: { createdAt: 'DESC' },
    });
  }

  async listEventCommentsForAdmin(status?: ReviewStatus) {
    return this.eventCommentsRepo.find({
      where: status ? { status } : {},
      relations: ['event', 'user', 'parent'],
      order: { createdAt: 'DESC' },
    });
  }

  async removeComment(id: string, userId: string, isAdmin: boolean) {
    const placeComment = await this.placeCommentsRepo.findOne({
      where: { id },
    });
    if (placeComment) {
      if (!isAdmin && placeComment.userId !== userId) {
        throw new ForbiddenException('Access denied');
      }
      await this.placeCommentsRepo.softDelete(id);
      return { success: true };
    }
    const eventComment = await this.eventCommentsRepo.findOne({
      where: { id },
    });
    if (!eventComment) throw new NotFoundException('Comment not found');
    if (!isAdmin && eventComment.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    await this.eventCommentsRepo.softDelete(id);
    return { success: true };
  }

  async remove(id: string) {
    const review = await this.findOne(id);
    await this.repo.softDelete(review.id);
    if (review.placeId) {
      await this.recalculatePlaceRatings(review.placeId);
    }
    return { success: true };
  }

  /** Business owner flags a review on their place or event for moderation. */
  async flagAsProvider(reviewId: string, userId: string) {
    const review = await this.repo.findOne({
      where: { id: reviewId },
      relations: [
        'place',
        'place.provider',
        'event',
        'event.venue',
        'event.venue.provider',
      ],
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    let ownerUserId: string | null | undefined;
    if (review.place?.provider) {
      ownerUserId = review.place.provider.ownerUserId;
    } else if (review.event?.venue?.provider) {
      ownerUserId = review.event.venue.provider.ownerUserId;
    } else {
      throw new BadRequestException('Review is not linked to a business');
    }
    if (ownerUserId !== userId) {
      throw new ForbiddenException(
        'You can only flag reviews for your business',
      );
    }
    review.isFlagged = true;
    return this.repo.save(review);
  }
}
