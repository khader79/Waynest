import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { CalendarEntry } from './entities/calendar-entry.entity';
import { CreateCalendarEntryDto } from './dto/create-calendar-entry.dto';
import { UpdateCalendarEntryDto } from './dto/update-calendar-entry.dto';
import { Place } from '../place/entities/place.entity';
import {
  Friendship,
  FriendshipStatus,
} from '../social-graph/entities/friendship.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

export type CalendarEntryItem = {
  id: string;
  date: string;
  time: string | null;
  endTime: string | null;
  title: string;
  notes: string | null;
  placeId: string | null;
  eventId: string | null;
  place: {
    id: string;
    name: string;
    slug: string;
    type: string;
    imageUrl: string | null;
    cityName: string | null;
  } | null;
  sourceType: string;
  sourceLabel: string | null;
  ownerUserId: string;
  sharedWithUserIds: string[];
  tripPlanId: string | null;
  tripDay: number | null;
  tripCityName: string | null;
  collaborators: Array<{
    userId: string;
    username: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

const normalizeText = (value?: string | null) =>
  typeof value === 'string' ? value.trim() : '';

const normalizeDate = (value?: string | null) => {
  const raw = normalizeText(value);
  if (!raw) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
};

const resolveUserDisplayName = (user: User | null | undefined): string => {
  if (!user || typeof user !== 'object') {
    return '';
  }

  const firstName =
    typeof user.firstName === 'string' ? user.firstName.trim() : '';
  const lastName =
    typeof user.lastName === 'string' ? user.lastName.trim() : '';
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  return typeof user.username === 'string' ? user.username.trim() : '';
};

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);
  constructor(
    @InjectRepository(CalendarEntry)
    private readonly repo: Repository<CalendarEntry>,
    @InjectRepository(Place)
    private readonly placeRepo: Repository<Place>,
    @InjectRepository(Friendship)
    private readonly friendshipRepo: Repository<Friendship>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async assertAcceptedFriends(
    ownerUserId: string,
    sharedWithUserIds: string[],
  ) {
    const uniqueIds = [...new Set(sharedWithUserIds)].filter(
      (id) => id && id !== ownerUserId,
    );
    if (uniqueIds.length === 0) {
      return [];
    }

    const rows = await this.friendshipRepo.find({
      where: [
        {
          userLowId: ownerUserId,
          userHighId: In(uniqueIds),
          status: FriendshipStatus.ACCEPTED,
        },
        {
          userLowId: In(uniqueIds),
          userHighId: ownerUserId,
          status: FriendshipStatus.ACCEPTED,
        },
      ],
    });

    const acceptedIds = new Set(
      rows.map((row) =>
        row.userLowId === ownerUserId ? row.userHighId : row.userLowId,
      ),
    );
    const invalidIds = uniqueIds.filter((id) => !acceptedIds.has(id));
    if (invalidIds.length > 0) {
      throw new ForbiddenException(
        'Calendar collaborators must be accepted friends',
      );
    }

    return uniqueIds;
  }

  private queueSharedNotifications(
    ownerUserId: string,
    recipientIds: string[],
    entry: CalendarEntry,
  ) {
    for (const recipientId of recipientIds) {
      if (!recipientId || recipientId === ownerUserId) continue;

      void this.notificationsService
        .createNotification({
          actorId: ownerUserId,
          recipientId,
          type: NotificationType.CALENDAR_SHARED,
          message: `shared "${entry.title}" on your calendar`,
          meta: {
            calendarEntryId: entry.id,
            calendarDate: entry.calendarDate,
            placeSlug: entry.place?.slug ?? undefined,
            placeId: entry.placeId ?? undefined,
          },
        })
        .catch(() => undefined);
    }
  }

  private async mapEntries(
    entries: CalendarEntry[],
  ): Promise<CalendarEntryItem[]> {
    const collaboratorIds = [
      ...new Set(entries.flatMap((entry) => entry.sharedWithUserIds ?? [])),
    ];
    const collaborators =
      collaboratorIds.length > 0
        ? await this.usersRepo.find({
            where: { id: In(collaboratorIds) },
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          })
        : [];
    const collaboratorById = new Map(
      collaborators.map((user) => [user.id, user]),
    );

    return entries.map((entry) => this.mapEntry(entry, collaboratorById));
  }

  private mapEntry(
    entry: CalendarEntry,
    collaboratorById = new Map<string, User>(),
  ): CalendarEntryItem {
    return {
      id: entry.id,
      date: entry.calendarDate,
      time: entry.startTime,
      endTime: entry.endTime,
      title: entry.title,
      notes: entry.notes,
      placeId: entry.placeId,
      eventId: entry.eventId,
      place: entry.place
        ? {
            id: entry.place.id,
            name: entry.place.name,
            slug: entry.place.slug,
            type: entry.place.type,
            imageUrl: entry.place.imageUrl ?? null,
            cityName: entry.place.city?.name ?? null,
          }
        : null,
      sourceType: entry.sourceType,
      sourceLabel: entry.sourceLabel,
      ownerUserId: entry.userId,
      sharedWithUserIds: entry.sharedWithUserIds ?? [],
      tripPlanId: entry.tripPlanId,
      tripDay: entry.tripDay,
      tripCityName: entry.tripCityName,
      collaborators: (entry.sharedWithUserIds ?? [])
        .map((userId) => {
          const user = collaboratorById.get(userId);
          if (!user) return null;
          return {
            userId: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            avatarUrl: user.avatarUrl ?? null,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  async createTripPlanEntries(
    userId: string,
    tripPlanId: string,
    generatedPlan: any,
    title: string | null,
    cityName: string,
  ): Promise<void> {
    if (!generatedPlan?.days?.length) return;

    let count = 0;
    for (const day of generatedPlan.days) {
      if (!day.date) continue;
      const dateStr = new Date(day.date).toISOString().slice(0, 10);

      const slots = [
        { slot: day.morning, label: 'Morning' },
        { slot: day.afternoon, label: 'Afternoon' },
        { slot: day.evening, label: 'Evening' },
      ];

      for (const { slot, label } of slots) {
        if (!slot?.name) continue;

        const tripLabel = title || `Trip to ${cityName}`;

        const entry = this.repo.create({
          userId,
          calendarDate: dateStr,
          startTime: slot.openTime ?? null,
          endTime: slot.closeTime ?? null,
          title: slot.name,
          placeId: slot.placeId ?? null,
          notes: [
            `Day ${day.day ?? 1} - ${label}`,
            slot.duration ? `Duration: ${slot.duration}` : null,
            slot.estimatedCost != null ? `Cost: ${slot.estimatedCost}` : null,
          ].filter(Boolean).join(' | '),
          sourceType: 'trip_plan',
          sourceLabel: tripLabel,
          tripPlanId,
          tripDay: day.day ?? null,
          tripCityName: cityName,
        });

        try {
          await this.repo.save(entry);
          count++;
        } catch (err) {
          // skip duplicate (same place + same date)
          if (err instanceof QueryFailedError && (err as any).code === '23505') {
            this.logger.warn(`Skipped duplicate trip_plan entry for place ${slot.placeId} on ${dateStr}`);
            continue;
          }
          throw err;
        }
      }
    }

    this.logger.log(`Created ${count} calendar entries for trip plan ${tripPlanId}`);
  }

  async removeEntriesByTripPlan(tripPlanId: string): Promise<void> {
    await this.repo.delete({ tripPlanId } as any);
    this.logger.log(`Removed calendar entries for trip plan ${tripPlanId}`);
  }

  async findByUser(userId: string): Promise<CalendarEntryItem[]> {
    const rows = await this.repo
      .createQueryBuilder('calendar')
      .leftJoinAndSelect('calendar.place', 'place')
      .leftJoinAndSelect('place.city', 'city')
      .where('calendar.deletedAt IS NULL')
      .andWhere('calendar.userId = :userId', { userId })
      .orderBy('calendar.calendarDate', 'ASC')
      .addOrderBy('calendar.startTime', 'ASC')
      .addOrderBy('calendar.createdAt', 'DESC')
      .getMany();

    return this.mapEntries(rows);
  }

  async create(
    userId: string,
    dto: CreateCalendarEntryDto,
  ): Promise<CalendarEntryItem> {
    const calendarDate = normalizeDate(dto.date);
    if (!calendarDate) {
      throw new BadRequestException('Invalid calendar date');
    }

    const placeId = normalizeText(dto.placeId) || null;
    const eventId = normalizeText(dto.eventId) || null;
    const place = placeId
      ? await this.placeRepo.findOne({
          where: { id: placeId },
          relations: { city: true },
        })
      : null;

    if (placeId && !place) {
      throw new NotFoundException('Place not found');
    }

    const title = normalizeText(dto.title) || place?.name || '';
    if (!title) {
      throw new BadRequestException('Calendar item title is required');
    }

    const startTime = normalizeText(dto.time) || null;
    const endTime = normalizeText(dto.endTime) || null;
    const sourceType =
      normalizeText(dto.sourceType) || (place ? 'place' : 'manual');
    const sharedWithUserIds = await this.assertAcceptedFriends(
      userId,
      dto.sharedWithUserIds ?? [],
    );

    const entity = this.repo.create({
      userId,
      placeId,
      eventId,
      calendarDate,
      startTime,
      endTime,
      title,
      notes: normalizeText(dto.notes) || null,
      sourceType,
      sourceLabel:
        normalizeText(dto.sourceLabel) ||
        normalizeText(dto.placeName) ||
        place?.name ||
        null,
      sharedWithUserIds,
    });

    const saved = await this.repo.save(entity);
    this.logger.log(
      `Saved calendar entry id=${saved?.id} user=${userId} placeId=${placeId} date=${calendarDate}`,
    );
    const hydrated = await this.repo.findOne({
      where: { id: saved.id, userId },
      relations: { place: { city: true } },
    });

    if (!hydrated) {
      throw new NotFoundException('Calendar item not found');
    }

    const ownerSnapshot = await this.usersRepo.findOne({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
      },
    });
    const ownerName = resolveUserDisplayName(ownerSnapshot);

    this.queueSharedNotifications(userId, sharedWithUserIds, hydrated);
    this.logger.log(
      `Queued shared notifications for owner=${userId} recipients=${sharedWithUserIds.join(',')}`,
    );

    // Create recipient-owned copies so the shared item appears in their
    // calendar as their own entry (allows independent actions). We attempt
    // to create a copy for each recipient; if a unique constraint prevents
    // creating a duplicate (e.g. same place + date already exists) we skip it.
    for (const recipientId of sharedWithUserIds) {
      if (!recipientId || recipientId === userId) continue;

      const recipientEntity = this.repo.create({
        userId: recipientId,
        placeId: hydrated.placeId,
        eventId: hydrated.eventId,
        calendarDate: hydrated.calendarDate,
        startTime: hydrated.startTime,
        endTime: hydrated.endTime,
        title: hydrated.title,
        notes: hydrated.notes,
        sourceType: 'shared',
        sourceLabel: `Shared by ${ownerName || 'a friend'}`,
        // indicate who shared this item so collaborators list shows owner
        sharedWithUserIds: [hydrated.userId],
      });

      try {
        await this.repo.save(recipientEntity);
        this.logger.log(
          `Created recipient copy for recipient=${recipientId} original=${hydrated.id}`,
        );
      } catch (err) {
        // If the save fails due to a unique constraint (duplicate), ignore
        // otherwise rethrow.
        if (err instanceof QueryFailedError) {
          // Postgres unique violation code is '23505'
          // err.driverError?.code may exist depending on driver
          const code = (err as any).code || (err as any).driverError?.code;
          if (code === '23505') {
            // skip duplicate
            this.logger.log(
              `Skipped creating duplicate recipient copy for recipient=${recipientId} code=23505`,
            );
            continue;
          }
        }
        // non-unique error -> rethrow
        throw err;
      }
    }

    const [mapped] = await this.mapEntries([hydrated]);
    return mapped;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateCalendarEntryDto,
  ): Promise<CalendarEntryItem> {
    const existing = await this.repo.findOne({
      where: { id, userId },
      relations: { place: { city: true } },
    });

    if (!existing) {
      throw new NotFoundException('Calendar item not found');
    }

    if (dto.date !== undefined) {
      const calendarDate = normalizeDate(dto.date);
      if (!calendarDate) {
        throw new BadRequestException('Invalid calendar date');
      }
      existing.calendarDate = calendarDate;
    }

    if (dto.title !== undefined) {
      const title = normalizeText(dto.title);
      if (!title) {
        throw new BadRequestException('Calendar item title is required');
      }
      existing.title = title;
    }

    if (dto.placeId !== undefined) {
      const placeId = normalizeText(dto.placeId) || null;
      if (placeId) {
        const place = await this.placeRepo.findOne({
          where: { id: placeId },
          relations: { city: true },
        });
        if (!place) {
          throw new NotFoundException('Place not found');
        }
        existing.place = place;
        existing.placeId = place.id;
      } else {
        existing.place = null;
        existing.placeId = null;
      }
    }

    if (dto.time !== undefined) {
      existing.startTime = normalizeText(dto.time) || null;
    }

    if (dto.endTime !== undefined) {
      existing.endTime = normalizeText(dto.endTime) || null;
    }

    if (dto.notes !== undefined) {
      existing.notes = normalizeText(dto.notes) || null;
    }

    if (dto.sourceType !== undefined) {
      existing.sourceType = normalizeText(dto.sourceType) || 'manual';
    }

    if (dto.sourceLabel !== undefined) {
      existing.sourceLabel = normalizeText(dto.sourceLabel) || null;
    }

    if (dto.sharedWithUserIds !== undefined) {
      existing.sharedWithUserIds = await this.assertAcceptedFriends(
        userId,
        dto.sharedWithUserIds ?? [],
      );
    }

    const saved = await this.repo.save(existing);
    const hydrated = await this.repo.findOne({
      where: { id: saved.id, userId },
      relations: { place: { city: true } },
    });

    if (!hydrated) {
      throw new NotFoundException('Calendar item not found after update');
    }

    const [mapped] = await this.mapEntries([hydrated]);
    return mapped;
  }

  async remove(userId: string, id: string): Promise<{ success: true }> {
    const existing = await this.repo.findOne({ where: { id, userId } });

    if (!existing) {
      throw new NotFoundException('Calendar item not found');
    }

    await this.repo.remove(existing);

    return { success: true };
  }
}
