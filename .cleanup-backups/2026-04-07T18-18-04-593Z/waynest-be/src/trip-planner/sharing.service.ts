/**
 * Sharing Service
 * Handles viral sharing features: share, copy, toggle visibility, OG image generation
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripPlan, IGeneratedPlan } from './entities/trip-planner.entity';
import { ShareTripDto } from './dto/trip-sharing.dto';

export type PublicTripSnapshot = {
  id: string;
  shareSlug: string | null;
  isPublic: boolean;
  title: string;
  description: string | null;
  cityId: string;
  cityName: string | null;
  days: number;
  budget: number;
  persons: number;
  generatedPlan: IGeneratedPlan;
  viewCount: number;
  createdAt: Date;
};

function generateShareSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < 10; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

function getShareUrl(slug: string) {
  const frontendUrl = process.env.FRONTEND_URL || 'https://waynest.com';
  return `${frontendUrl}/trip/${slug}`;
}

export function canAccessTrip(
  tripPlan: TripPlan,
  userId?: string | null,
  guestToken?: string | null,
) {
  if (userId && tripPlan.userId === userId) {
    return true;
  }

  if (!tripPlan.userId && guestToken && tripPlan.guestToken === guestToken) {
    return true;
  }

  return false;
}

@Injectable()
export class SharingService {
  constructor(
    @InjectRepository(TripPlan) private tripPlanRepo: Repository<TripPlan>,
  ) {}

  /**
   * Share/publish a trip plan
   */
  async shareTrip(
    id: string,
    userId: string | null,
    guestToken: string | undefined,
    dto: ShareTripDto,
  ) {
    const tripPlan = await this.tripPlanRepo.findOne({ where: { id } });

    if (!tripPlan) {
      throw new NotFoundException('Trip plan not found');
    }

    if (!canAccessTrip(tripPlan, userId, guestToken)) {
      throw new ForbiddenException('Access denied');
    }

    if (!tripPlan.shareSlug) {
      let slug: string;
      let exists = true;
      do {
        slug = generateShareSlug();
        const existing = await this.tripPlanRepo.findOne({
          where: { shareSlug: slug },
        });
        exists = !!existing;
      } while (exists);
      tripPlan.shareSlug = slug;
    }

    if (dto.title !== undefined) tripPlan.title = dto.title;
    if (dto.description !== undefined) tripPlan.description = dto.description;
    tripPlan.isPublic = dto.isPublic ?? true;

    await this.tripPlanRepo.save(tripPlan);

    return {
      success: true,
      shareUrl:
        tripPlan.isPublic && tripPlan.shareSlug
          ? getShareUrl(tripPlan.shareSlug)
          : null,
      shareSlug: tripPlan.shareSlug,
      isPublic: tripPlan.isPublic,
    };
  }

  /**
   * Copy a trip plan
   */
  async copyTrip(
    id: string,
    userId: string | null,
    guestToken: string | undefined,
  ) {
    const original = await this.tripPlanRepo.findOne({ where: { id } });

    if (!original) {
      throw new NotFoundException('Trip plan not found');
    }

    if (!canAccessTrip(original, userId, guestToken)) {
      throw new ForbiddenException('Access denied');
    }

    const copyOwnerId = original.userId ? userId : (userId ?? null);
    const copyGuestToken = original.userId ? null : original.guestToken;

    const copy = this.tripPlanRepo.create({
      userId: copyOwnerId,
      guestToken: copyGuestToken,
      cityId: original.cityId,
      days: original.days,
      budget: original.budget,
      persons: original.persons,
      generatedPlan: original.generatedPlan,
      title: `${original.title || 'Trip'} (Copy)`,
    });

    await this.tripPlanRepo.save(copy);

    return {
      tripPlanId: copy.id,
      guestToken: copy.guestToken,
      success: true,
    };
  }

  /**
   * Toggle trip plan public visibility
   */
  async togglePublic(
    id: string,
    userId: string | null,
    guestToken: string | undefined,
  ) {
    const tripPlan = await this.tripPlanRepo.findOne({ where: { id } });

    if (!tripPlan) {
      throw new NotFoundException('Trip plan not found');
    }

    if (!canAccessTrip(tripPlan, userId, guestToken)) {
      throw new ForbiddenException('Access denied');
    }

    if (!tripPlan.isPublic && !tripPlan.shareSlug) {
      let slug: string;
      let exists = true;
      do {
        slug = generateShareSlug();
        const existing = await this.tripPlanRepo.findOne({
          where: { shareSlug: slug },
        });
        exists = !!existing;
      } while (exists);
      tripPlan.shareSlug = slug;
    }

    tripPlan.isPublic = !tripPlan.isPublic;
    await this.tripPlanRepo.save(tripPlan);

    return {
      isPublic: tripPlan.isPublic,
      shareSlug: tripPlan.shareSlug,
      shareUrl:
        tripPlan.isPublic && tripPlan.shareSlug
          ? getShareUrl(tripPlan.shareSlug)
          : null,
    };
  }

  private async loadPublicTripPlan(slug: string) {
    const tripPlan = await this.tripPlanRepo.findOne({
      where: { shareSlug: slug, isPublic: true },
      relations: ['city'],
    });

    if (!tripPlan) {
      throw new NotFoundException('Trip not found or not shared publicly');
    }

    return tripPlan;
  }

  private buildPublicTripSnapshot(tripPlan: TripPlan): PublicTripSnapshot {
    return {
      id: tripPlan.id,
      shareSlug: tripPlan.shareSlug,
      isPublic: tripPlan.isPublic,
      title: tripPlan.title || `Trip to ${tripPlan.city?.name || 'Unknown'}`,
      description: tripPlan.description,
      cityId: tripPlan.cityId,
      cityName: tripPlan.city?.name ?? null,
      days: tripPlan.days,
      budget: Number(tripPlan.budget),
      persons: tripPlan.persons,
      generatedPlan: tripPlan.generatedPlan,
      viewCount: tripPlan.viewCount,
      createdAt: tripPlan.createdAt,
    };
  }

  /**
   * Get public trip by slug
   */
  async getPublicTrip(slug: string): Promise<PublicTripSnapshot> {
    const tripPlan = await this.loadPublicTripPlan(slug);

    tripPlan.viewCount = (tripPlan.viewCount || 0) + 1;
    await this.tripPlanRepo.save(tripPlan);

    return this.buildPublicTripSnapshot(tripPlan);
  }

  /**
   * Get public trip preview without incrementing view count
   */
  async getPublicTripPreview(slug: string): Promise<PublicTripSnapshot> {
    const tripPlan = await this.loadPublicTripPlan(slug);
    return this.buildPublicTripSnapshot(tripPlan);
  }

  /**
   * Render OG image SVG for public trip
   */
  renderPublicTripOgImage(trip: PublicTripSnapshot) {
    const title = this.escapeXml(this.truncate(trip.title, 48));
    const cityName = this.escapeXml(
      this.truncate(trip.cityName ?? 'Shared itinerary', 56),
    );
    const description = this.escapeXml(
      this.truncate(
        trip.description ||
          `${trip.days}-day itinerary for ${trip.persons} traveler(s).`,
        92,
      ),
    );
    const budget = this.escapeXml(`${trip.budget.toFixed(0)} ILS budget`);
    const estimated = this.escapeXml(
      `${Number(trip.generatedPlan?.totalEstimatedCost ?? 0).toFixed(0)} ILS estimated`,
    );
    const views = this.escapeXml(`${trip.viewCount} views`);
    const slug = this.escapeXml(trip.shareSlug ?? 'waynest');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">${title}</title>
  <desc id="desc">${description}</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0B1320"/>
      <stop offset="0.5" stop-color="#10203A"/>
      <stop offset="1" stop-color="#1FBF9A"/>
    </linearGradient>
    <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1000 120) rotate(120) scale(500 380)">
      <stop stop-color="#2B6FFF" stop-opacity="0.6"/>
      <stop offset="1" stop-color="#2B6FFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" rx="42" fill="url(#bg)"/>
  <circle cx="1000" cy="120" r="260" fill="url(#glow)"/>
  <circle cx="210" cy="150" r="120" fill="#FF8A5B" fill-opacity="0.18"/>
  <circle cx="1040" cy="480" r="180" fill="#E9DDC7" fill-opacity="0.12"/>
  <text x="72" y="108" fill="#E9DDC7" font-family="Sora, Arial, sans-serif" font-size="28" font-weight="700" letter-spacing="2">WAYNEST</text>
  <text x="72" y="212" fill="#FFFFFF" font-family="Sora, Arial, sans-serif" font-size="66" font-weight="700">${title}</text>
  <text x="72" y="276" fill="#D8E0EA" font-family="Manrope, Arial, sans-serif" font-size="30" font-weight="500">${cityName}</text>
  <text x="72" y="342" fill="#D8E0EA" font-family="Manrope, Arial, sans-serif" font-size="24" font-weight="400">${description}</text>
  <rect x="72" y="392" width="240" height="72" rx="22" fill="#1FBF9A" fill-opacity="0.18" stroke="#1FBF9A" stroke-opacity="0.35"/>
  <text x="96" y="438" fill="#FFFFFF" font-family="Sora, Arial, sans-serif" font-size="26" font-weight="600">${trip.days} days</text>
  <rect x="332" y="392" width="290" height="72" rx="22" fill="#2B6FFF" fill-opacity="0.18" stroke="#2B6FFF" stroke-opacity="0.35"/>
  <text x="356" y="438" fill="#FFFFFF" font-family="Sora, Arial, sans-serif" font-size="26" font-weight="600">${budget}</text>
  <rect x="642" y="392" width="300" height="72" rx="22" fill="#FF8A5B" fill-opacity="0.18" stroke="#FF8A5B" stroke-opacity="0.35"/>
  <text x="666" y="438" fill="#FFFFFF" font-family="Sora, Arial, sans-serif" font-size="26" font-weight="600">${estimated}</text>
  <text x="72" y="534" fill="#B9C5D3" font-family="Manrope, Arial, sans-serif" font-size="20" font-weight="500">${views} | ${slug}</text>
</svg>`;
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private truncate(value: string, maxLength: number) {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
  }
}
