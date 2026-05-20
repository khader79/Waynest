import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { HotPathCache } from 'src/common/utils/hot-path-cache';
import { Message } from './entities/message.entity';
import { User } from '../users/entities/user.entity';
import { Place } from '../place/entities/place.entity';
import { TripPlan } from 'src/trip-planner/entities/trip-planner.entity';
import { Wishlist } from '../wishlist/entities/wishlist.entity';
import { AiService } from 'src/trip-planner/ai.service';
import {
  RecommendedPlaceItem,
  SocialContentService,
} from '../social-content/social-content.service';

type ConciergeContext = {
  user: {
    id: string;
    firstName: string;
    username: string;
  } | null;
  recentHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  recommendations: {
    source: 'personalized' | 'trending';
    topTags: string[];
    topCities: string[];
    items: RecommendedPlaceItem[];
  };
  wishlist: Array<{
    name: string;
    city: string | null;
    path: string;
  }>;
  savedTrips: Array<{
    title: string;
    city: string | null;
    days: number;
    budget: number;
    path: string;
  }>;
  relevantPlaces: Array<{
    name: string;
    city: string | null;
    type: string;
    ratingAverage: number;
    path: string;
  }>;
};

type ConciergeMessageSignals = {
  prefersArabic: boolean;
  isAttachmentOnly: boolean;
  attachmentKind: 'image' | 'video' | 'file' | null;
  isPlanningIntent: boolean;
  asksForWishlist: boolean;
  asksForSavedTrips: boolean;
  asksForRecommendations: boolean;
  parsedDays: number | null;
  parsedBudget: number | null;
};

@Injectable()
export class AiConciergeService {
  private readonly logger = new Logger(AiConciergeService.name);
  private readonly cache = new HotPathCache(300);
  private readonly actorContextCacheMs = (() => {
    const parsed = Number(process.env.AI_CHAT_CONTEXT_CACHE_MS);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 60_000;
  })();

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Message)
    private readonly messagesRepo: Repository<Message>,
    @InjectRepository(Place)
    private readonly placesRepo: Repository<Place>,
    @InjectRepository(TripPlan)
    private readonly tripPlansRepo: Repository<TripPlan>,
    @InjectRepository(Wishlist)
    private readonly wishlistRepo: Repository<Wishlist>,
    private readonly aiService: AiService,
    private readonly socialContentService: SocialContentService,
  ) {}

  async buildWelcomeMessage(actorId: string) {
    return 'I am Waynest AI Concierge. I can help you discover places, turn ideas into real plans, and guide you through Waynest with direct links. Try: "Plan a 3-day trip", "Find cozy cafes in my destination", or "What should I save next?"';
  }

  async generateReply(
    actorId: string,
    conversationId: string,
    assistantUserId: string,
    userMessage: string,
  ) {
    const messageSignals = this.analyzeMessage(userMessage);
    const context = await this.buildContext(
      actorId,
      conversationId,
      assistantUserId,
      userMessage,
      messageSignals,
    );
    if (messageSignals.isAttachmentOnly) {
      return this.buildFallbackResponse(context, userMessage, messageSignals);
    }

    const prompt = this.buildPrompt(context, userMessage, messageSignals);

    try {
      const reply = await this.aiService.generateAssistantText(prompt, {
        temperature: 0.45,
        maxTokens: 500,
      });
      const normalized = reply.trim();
      if (normalized) {
        return normalized;
      }
    } catch (error) {
      this.logger.warn(
        `AI concierge generation failed, using fallback response: ${String(error)}`,
      );
    }

    return this.buildFallbackResponse(context, userMessage, messageSignals);
  }

  private async buildContext(
    actorId: string,
    conversationId: string,
    assistantUserId: string,
    userMessage: string,
    messageSignals: ConciergeMessageSignals,
  ): Promise<ConciergeContext> {
    const searchTokens = this.extractSearchTokens(userMessage);
    const shouldLoadRecommendations =
      messageSignals.isPlanningIntent || messageSignals.asksForRecommendations;
    const shouldLoadWishlist = messageSignals.asksForWishlist;
    const shouldLoadSavedTrips =
      messageSignals.asksForSavedTrips || messageSignals.isPlanningIntent;
    const shouldLoadRelevantPlaces =
      !messageSignals.isAttachmentOnly && searchTokens.length > 0;

    const [
      user,
      historyRows,
      recommendations,
      wishlistRows,
      savedTrips,
      relevantPlaces,
    ] = await Promise.all([
      this.loadCachedUser(actorId),
      this.messagesRepo.find({
        where: { conversationId },
        select: {
          senderId: true,
          content: true,
          createdAt: true,
        },
        order: { createdAt: 'DESC' },
        take: 6,
      }),
      shouldLoadRecommendations
        ? this.loadCachedRecommendations(actorId)
        : Promise.resolve(this.createEmptyRecommendations()),
      shouldLoadWishlist
        ? this.loadCachedWishlist(actorId)
        : Promise.resolve([]),
      shouldLoadSavedTrips
        ? this.loadCachedSavedTrips(actorId)
        : Promise.resolve([]),
      shouldLoadRelevantPlaces
        ? this.findRelevantPlaces(userMessage)
        : Promise.resolve([]),
    ]);

    return {
      user: user
        ? {
            id: user.id,
            firstName: user.firstName,
            username: user.username,
          }
        : null,
      recentHistory: [...historyRows]
        .reverse()
        .slice(-4)
        .map((message) => ({
          role:
            message.senderId === assistantUserId
              ? ('assistant' as const)
              : ('user' as const),
          content: this.describeMessageForPrompt(message.content),
        }))
        .filter((item) => item.content),
      recommendations,
      wishlist: wishlistRows,
      savedTrips,
      relevantPlaces: relevantPlaces.map((place) => ({
        name: place.name,
        city: place.city?.name ?? null,
        type: place.type,
        ratingAverage: Number(place.ratingAverage ?? 0) || 0,
        path: `/places/${place.slug}`,
      })),
    };
  }

  private buildPrompt(
    context: ConciergeContext,
    userMessage: string,
    messageSignals: ConciergeMessageSignals,
  ) {
    const historySummary =
      context.recentHistory.length > 0
        ? context.recentHistory
            .map((item) => `${item.role}: ${item.content}`)
            .join('\n')
        : 'none';
    const recommendationSummary =
      context.recommendations.items.length > 0
        ? context.recommendations.items
            .slice(0, 3)
            .map(
              (item) =>
                `- ${item.name} | ${item.city.name ?? 'Unknown city'} | ${item.type} | ${item.reason} | /places/${item.slug}`,
            )
            .join('\n')
        : 'none';
    const wishlistSummary =
      context.wishlist.length > 0
        ? context.wishlist
            .slice(0, 2)
            .map(
              (item) =>
                `- ${item.name}${item.city ? ` | ${item.city}` : ''} | ${item.path}`,
            )
            .join('\n')
        : 'none';
    const savedTripsSummary =
      context.savedTrips.length > 0
        ? context.savedTrips
            .slice(0, 2)
            .map(
              (trip) =>
                `- ${trip.title}${trip.city ? ` | ${trip.city}` : ''} | ${trip.days} days | ${trip.path}`,
            )
            .join('\n')
        : 'none';
    const directMatchesSummary =
      context.relevantPlaces.length > 0
        ? context.relevantPlaces
            .slice(0, 3)
            .map(
              (place) =>
                `- ${place.name}${place.city ? ` | ${place.city}` : ''} | ${place.type} | ${place.path}`,
            )
            .join('\n')
        : 'none';

    return `
You are Waynest AI Concierge, the smart, helpful, and premium travel assistant for the Waynest platform.
Your goal is to provide expert travel advice, personalized recommendations, and guide users through Waynest features.

PERSONALITY:
- Professional yet warm and proactive.
- Expert on travel trends and hidden gems.
- If the user speaks Arabic, respond in a natural, elegant, and helpful Palestinian/Levantine-leaning Arabic (professional yet friendly).

RULES:
- Use ONLY the provided context for platform-specific details.
- Never invent links, place names, or prices not in context.
- Keep responses concise (max ~180 words), well-structured, and scannable.
- Always include direct links (e.g., /places/slug or /plan) when relevant.
- Waynest is a global platform, but live data density varies. Be honest if data is sparse for a specific city.
- DO NOT default to Bethlehem unless the context or user query points there.

Known actions/links:
- /plan (Trip Planner tool)
- /plan?planId=<id> (Specific saved plan)
- /places/<slug> (Place details)
- /wishlist (User's saved places)

User:
${context.user ? `${context.user.firstName} (@${context.user.username})` : 'Guest User'}

Context Signals:
- Intent: ${messageSignals.isPlanningIntent ? 'Planning' : 'General Chat'}
- Wishes: ${messageSignals.asksForWishlist}
- Saved Trips: ${messageSignals.asksForSavedTrips}
- Recommendations: ${messageSignals.asksForRecommendations}
- Requested Days: ${messageSignals.parsedDays ?? 'N/A'}

Recent Conversation History:
${historySummary}

Waynest Recommendations:
${recommendationSummary}

User Wishlist:
${wishlistSummary}

User Saved Trip Drafts:
${savedTripsSummary}

Direct Search Matches (Real Places):
${directMatchesSummary}

Latest user message:
${this.describeMessageForPrompt(userMessage)}
`.trim();
  }

  private createEmptyRecommendations(): ConciergeContext['recommendations'] {
    return {
      source: 'trending',
      topTags: [],
      topCities: [],
      items: [],
    };
  }

  private loadCachedUser(actorId: string) {
    return this.cache.getOrSet(
      `ai:user:${actorId}`,
      this.actorContextCacheMs,
      () =>
        this.usersRepo.findOne({
          where: { id: actorId },
          select: {
            id: true,
            firstName: true,
            username: true,
          },
        }),
    );
  }

  private loadCachedRecommendations(
    actorId: string,
  ): Promise<ConciergeContext['recommendations']> {
    return this.cache.getOrSet(
      `ai:recommendations:${actorId}`,
      this.actorContextCacheMs,
      async () => {
        const recommendations =
          await this.socialContentService.listPlaceRecommendations(actorId, 3);
        return {
          source: recommendations.source,
          topTags: recommendations.profile.topTags.slice(0, 3),
          topCities: recommendations.profile.topCities.slice(0, 3),
          items: recommendations.items.slice(0, 3),
        };
      },
    );
  }

  private loadCachedWishlist(
    actorId: string,
  ): Promise<ConciergeContext['wishlist']> {
    return this.cache.getOrSet(
      `ai:wishlist:${actorId}`,
      this.actorContextCacheMs,
      async () => {
        const wishlistRows = await this.wishlistRepo.find({
          where: { userId: actorId },
          relations: ['place', 'place.city'],
          order: { createdAt: 'DESC' },
          take: 3,
        });

        return wishlistRows
          .filter((row) => row.place?.slug)
          .map((row) => ({
            name: row.place.name,
            city: row.place.city?.name ?? null,
            path: `/places/${row.place.slug}`,
          }));
      },
    );
  }

  private loadCachedSavedTrips(
    actorId: string,
  ): Promise<ConciergeContext['savedTrips']> {
    return this.cache.getOrSet(
      `ai:trips:${actorId}`,
      this.actorContextCacheMs,
      async () => {
        const savedTrips = await this.tripPlansRepo.find({
          where: { userId: actorId },
          relations: ['city'],
          order: { createdAt: 'DESC' },
          take: 3,
        });

        return savedTrips.map((plan) => ({
          title:
            plan.title?.trim() ||
            [plan.city?.name, `${plan.days} days`]
              .filter(Boolean)
              .join(' • ') ||
            'Saved trip',
          city: plan.city?.name ?? null,
          days: plan.days,
          budget: Number(plan.budget ?? 0) || 0,
          path: `/plan?planId=${plan.id}`,
        }));
      },
    );
  }

  private buildFallbackResponse(
    context: ConciergeContext,
    userMessage: string,
    messageSignals = this.analyzeMessage(userMessage),
  ) {
    const directMatches = context.relevantPlaces.slice(0, 2);
    const recommendations = context.recommendations.items.slice(0, 2);
    const savedTrip = context.savedTrips[0];
    const coverageNote = this.buildCoverageNote(
      context,
      messageSignals.prefersArabic,
    );
    const coverageInline = coverageNote ? ` ${coverageNote}` : '';
    const coverageBlock = coverageNote ? `\n${coverageNote}` : '';

    if (messageSignals.isAttachmentOnly) {
      return this.buildAttachmentFallbackResponse(messageSignals);
    }

    if (messageSignals.asksForSavedTrips && context.savedTrips.length > 0) {
      const trips = context.savedTrips
        .slice(0, 2)
        .map((trip, index) =>
          messageSignals.prefersArabic
            ? `${index + 1}. ${trip.title} ${trip.city ? `- ${trip.city}` : ''} عبر ${trip.path}`
            : `${index + 1}. ${trip.title}${trip.city ? ` in ${trip.city}` : ''} at ${trip.path}`,
        )
        .join('\n');
      return messageSignals.prefersArabic
        ? `عندك خطط محفوظة جاهزة داخل Waynest:\n${trips}\nإذا تريد، ابعت لي الوجهة أو عدد الأيام وأنا أقول لك أي واحدة تبدأ بها.`
        : `You already have saved trip drafts ready inside Waynest:\n${trips}\nIf you want, send me the destination or trip length and I will tell you which one to open first.`;
    }

    if (messageSignals.asksForWishlist && context.wishlist.length > 0) {
      const wishlistPicks = context.wishlist
        .slice(0, 2)
        .map((item, index) =>
          messageSignals.prefersArabic
            ? `${index + 1}. ${item.name}${item.city ? ` - ${item.city}` : ''} عبر ${item.path}`
            : `${index + 1}. ${item.name}${item.city ? ` in ${item.city}` : ''} at ${item.path}`,
        )
        .join('\n');
      return messageSignals.prefersArabic
        ? `هذه أقرب العناصر المحفوظة عندك الآن:\n${wishlistPicks}\nإذا تريد ترشيح جديد، قل لي الجو الذي تريده أو المدينة وسأرشح لك التالي.`
        : `These are the closest saved picks in your wishlist right now:\n${wishlistPicks}\nIf you want a new save suggestion, tell me the vibe or city and I will narrow down the next best option.`;
    }

    if (directMatches.length > 0) {
      const suggestions = directMatches
        .map((place, index) =>
          messageSignals.prefersArabic
            ? `${index + 1}. ${place.name}${place.city ? ` - ${place.city}` : ''} عبر ${place.path}`
            : `${index + 1}. ${place.name}${place.city ? ` in ${place.city}` : ''} at ${place.path}`,
        )
        .join('\n');
      return messageSignals.prefersArabic
        ? `لقيت لك أقوى النتائج المتوفرة حالياً داخل بيانات Waynest:\n${suggestions}\nإذا تريد، أقدر أحول أحدها مباشرة إلى خطوة تخطيط عبر /plan.`
        : `I found the strongest currently available matches inside Waynest data:\n${suggestions}\nIf you want, I can turn one of them into the next planning step through /plan.`;
    }

    if (messageSignals.isPlanningIntent) {
      const planHint = savedTrip
        ? messageSignals.prefersArabic
          ? ` وعندك خطة محفوظة جاهزة عبر ${savedTrip.path}.`
          : ` You already have a saved trip at ${savedTrip.path}.`
        : '';
      const dayHint = messageSignals.parsedDays
        ? messageSignals.prefersArabic
          ? ` لمدّة ${messageSignals.parsedDays} أيام`
          : ` for ${messageSignals.parsedDays} days`
        : '';
      const budgetHint = messageSignals.parsedBudget
        ? messageSignals.prefersArabic
          ? ` وميزانية تقريبًا ${messageSignals.parsedBudget}`
          : ` with a budget around ${messageSignals.parsedBudget}`
        : '';
      return messageSignals.prefersArabic
        ? `أقدر أحول طلبك إلى خطة فعلية داخل Waynest. أفضل خطوة الآن: افتح /plan${dayHint}${budgetHint}.${planHint}${coverageInline}`
        : `I can turn this into a real Waynest itinerary. Best next step: open /plan${dayHint}${budgetHint}.${planHint}${coverageInline}`;
    }

    if (messageSignals.asksForRecommendations && recommendations.length > 0) {
      const picks = recommendations
        .map((item, index) =>
          messageSignals.prefersArabic
            ? `${index + 1}. ${item.name}${item.city.name ? ` - ${item.city.name}` : ''} عبر /places/${item.slug}`
            : `${index + 1}. ${item.name}${item.city.name ? ` in ${item.city.name}` : ''} at /places/${item.slug}`,
        )
        .join('\n');
      return messageSignals.prefersArabic
        ? `أقوى ترشيحاتك المتوفرة حالياً داخل بيانات Waynest:\n${picks}${coverageBlock}\nقل لي المدينة أو الجو الذي تريده وسأضيقها أكثر.`
        : `Your strongest currently available picks inside Waynest data are:\n${picks}${coverageBlock}\nTell me the city or vibe you want and I will narrow them down.`;
    }

    if (recommendations.length > 0) {
      const picks = recommendations
        .map((item) => `/places/${item.slug}`)
        .join(', ');
      return messageSignals.prefersArabic
        ? `أقدر أساعدك في اكتشاف الأماكن، الخطط المحفوظة، وبناء الرحلات داخل Waynest. جرّب أن تطلب مدينة، نوع مكان، أو افتح /plan. وإذا تريد بداية سريعة فهذه روابط مناسبة الآن: ${picks}.${coverageInline}`
        : `I can help with place discovery, saved trips, and real planning inside Waynest. Try asking for a city, a place type, or open /plan. If you want a quick start, these are good links right now: ${picks}.${coverageInline}`;
    }

    return messageSignals.prefersArabic
      ? `أقدر أساعدك في اكتشاف الأماكن، فتح الأدوات المناسبة، وتحويل الفكرة إلى رحلة داخل Waynest. اطلب مدينة، نوع مكان، أو افتح /plan لنبدأ، وإذا كانت البيانات الحالية لوجهتك محدودة سأوضح لك ذلك مباشرة.`
      : `I can help you discover places, open the right tools, and turn ideas into trips inside Waynest. Ask for a city, a place type, or open /plan to start building an itinerary, and if live data for your destination is limited I will say that clearly.`;
  }

  private trimForPrompt(value: string, maxLength: number) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text) {
      return '';
    }
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.slice(0, maxLength - 1).trimEnd()}…`;
  }

  private analyzeMessage(message: string): ConciergeMessageSignals {
    const text = typeof message === 'string' ? message.trim() : '';
    const normalized = text.toLowerCase();
    const prefersArabic = /[\u0600-\u06ff]/.test(text);
    const isAttachmentOnly = this.isUploadReference(text);
    const attachmentKind = this.detectAttachmentKind(text);

    const planningKeywords = [
      'plan',
      'trip',
      'itinerary',
      'days',
      'budget',
      'رحلة',
      'خطة',
      'ايام',
      'أيام',
      'ميزانية',
      'برنامج',
    ];
    const wishlistKeywords = [
      'wishlist',
      'save next',
      'saved',
      'wish list',
      'المحفوظ',
      'المفضلة',
      'امنياتي',
      'أمنياتي',
      'احفظ',
      'حفظ',
    ];
    const savedTripKeywords = [
      'saved trip',
      'saved plan',
      'my trip',
      'my plan',
      'خطة محفوظة',
      'رحلاتي',
      'خططي',
      'خطتي',
    ];
    const recommendationKeywords = [
      'find',
      'suggest',
      'recommend',
      'where',
      'place',
      'places',
      'cafe',
      'restaurant',
      'cozy',
      'romantic',
      'رشح',
      'اقترح',
      'اقترحلي',
      'وين',
      'مكان',
      'أماكن',
      'اماكن',
      'مقهى',
      'مطعم',
      'رومانسي',
    ];

    return {
      prefersArabic,
      isAttachmentOnly,
      attachmentKind,
      isPlanningIntent:
        planningKeywords.some((keyword) => normalized.includes(keyword)) ||
        this.parseRequestedDays(text) !== null ||
        this.parseBudgetHint(text) !== null,
      asksForWishlist: wishlistKeywords.some((keyword) =>
        normalized.includes(keyword),
      ),
      asksForSavedTrips: savedTripKeywords.some((keyword) =>
        normalized.includes(keyword),
      ),
      asksForRecommendations:
        recommendationKeywords.some((keyword) =>
          normalized.includes(keyword),
        ) || !normalized,
      parsedDays: this.parseRequestedDays(text),
      parsedBudget: this.parseBudgetHint(text),
    };
  }

  private buildAttachmentFallbackResponse(
    messageSignals: ConciergeMessageSignals,
  ) {
    const subject =
      messageSignals.attachmentKind === 'image'
        ? messageSignals.prefersArabic
          ? 'الصورة'
          : 'the image'
        : messageSignals.attachmentKind === 'video'
          ? messageSignals.prefersArabic
            ? 'الفيديو'
            : 'the video'
          : messageSignals.prefersArabic
            ? 'الملف'
            : 'the file';

    return messageSignals.prefersArabic
      ? `وصلني ${subject}. حالياً أقدر أساعدك بشكل أفضل من النص أو من بيانات Waynest نفسها، لكن لا أستطيع استنتاج محتوى ${subject} من رابط الرفع وحده. اكتب لي مثلاً: "اعمل لي خطة 3 أيام"، أو "رشح لي أماكن رومانسية في وجهتي"، أو صف لي ماذا تريد من ${subject}.`
      : `I received ${subject}. I can help best from text or from Waynest data, but I cannot infer the actual contents of ${subject} from the upload path alone. Try sending something like "Plan a 3-day trip", "Recommend romantic spots for my destination", or tell me exactly what you want from ${subject}.`;
  }

  private buildCoverageNote(context: ConciergeContext, prefersArabic: boolean) {
    const recommendationCities = context.recommendations.items
      .map((item) => item.city.name?.trim())
      .filter((city): city is string => Boolean(city));

    if (recommendationCities.length < 2) {
      return '';
    }

    const uniqueCities = [...new Set(recommendationCities)];
    if (uniqueCities.length !== 1) {
      return '';
    }

    const city = uniqueCities[0];
    return prefersArabic
      ? `حالياً أقوى البيانات الحية داخل Waynest متوفرة في ${city}، لكن المنصة ليست محصورة فيها وأقدر أساعدك أيضاً بتخطيط عام لأي وجهة ثانية.`
      : `Right now, Waynest's strongest live data inside the app is in ${city}, but the platform is not limited to it and I can still help with a general plan for any other destination.`;
  }

  private describeMessageForPrompt(message: string) {
    const text = this.trimForPrompt(message, 280);
    if (!text) {
      return '';
    }

    if (!this.isUploadReference(text)) {
      return text;
    }

    const attachmentKind = this.detectAttachmentKind(text) ?? 'file';
    return `[user shared an uploaded ${attachmentKind}]`;
  }

  private isUploadReference(value: string) {
    if (typeof value !== 'string') {
      return false;
    }

    const text = value.trim();
    if (!text || /\s/.test(text)) {
      return false;
    }

    return /^(?:\/uploads\/\S+|https?:\/\/\S*\/uploads\/\S+)$/i.test(text);
  }

  private detectAttachmentKind(
    value: string,
  ): 'image' | 'video' | 'file' | null {
    if (!this.isUploadReference(value)) {
      return null;
    }

    const normalized = value.toLowerCase();
    if (/\.(avif|gif|jpe?g|png|svg|webp)(?:$|[?#])/.test(normalized)) {
      return 'image';
    }
    if (/\.(mp4|m4v|mov|webm|ogv|ogg|avi|mkv)(?:$|[?#])/.test(normalized)) {
      return 'video';
    }
    return 'file';
  }

  private parseRequestedDays(value: string): number | null {
    if (typeof value !== 'string') {
      return null;
    }

    const match =
      value.match(/(\d{1,2})\s*(?:day|days|ليلة|ليالي|يوم|ايام|أيام)/i) ??
      value.match(/(?:لمدة|لـ|for)\s*(\d{1,2})/i);
    if (!match) {
      return null;
    }

    const days = Number(match[1]);
    return Number.isFinite(days) && days > 0 ? days : null;
  }

  private parseBudgetHint(value: string): number | null {
    if (typeof value !== 'string') {
      return null;
    }

    const match =
      value.match(
        /(?:budget|ميزانية|ميزانيتي|cost|تكلفة|سقف)\D{0,12}(\d[\d,.]*)/i,
      ) ?? value.match(/(?:\$|₪|€)\s*(\d[\d,.]*)/);
    if (!match) {
      return null;
    }

    const numeric = Number(match[1].replace(/,/g, ''));
    return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : null;
  }

  private extractSearchTokens(input: string) {
    const stopWords = new Set([
      'the',
      'and',
      'for',
      'with',
      'from',
      'that',
      'this',
      'want',
      'need',
      'help',
      'best',
      'good',
      'trip',
      'plan',
      'days',
      'place',
      'places',
      'بدي',
      'اريد',
      'ابغى',
      'بدّي',
      'كيف',
      'شو',
      'وين',
      'مكان',
      'اماكن',
      'رحلة',
      'خطة',
      'ايش',
      'على',
      'الى',
      'في',
      'من',
      'عن',
    ]);

    return [...new Set(input.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])]
      .filter((token) => !stopWords.has(token))
      .slice(0, 6);
  }

  private async findRelevantPlaces(message: string) {
    const tokens = this.extractSearchTokens(message);
    if (tokens.length === 0) {
      return [];
    }

    const qb = this.placesRepo
      .createQueryBuilder('place')
      .leftJoinAndSelect('place.city', 'city')
      .leftJoinAndSelect('city.country', 'country')
      .leftJoinAndSelect('place.provider', 'provider')
      .leftJoinAndSelect('place.tags', 'tag')
      .where('place.isActive = true')
      .distinct(true);

    // Optimize search: if many tokens, be more selective to improve performance
    const searchLimit = tokens.length > 3 ? 3 : tokens.length;
    const prioritizedTokens = tokens.slice(0, searchLimit);

    qb.andWhere(
      new Brackets((subQb) => {
        prioritizedTokens.forEach((token, index) => {
          const param = `token${index}`;
          subQb.orWhere(`place.name ILIKE :${param}`, {
            [param]: `%${token}%`,
          });
          subQb.orWhere(`city.name ILIKE :${param}`, {
            [param]: `%${token}%`,
          });
          // Only search description/tags for the first two tokens to save DB time
          if (index < 2) {
            subQb.orWhere(`place.description ILIKE :${param}`, {
              [param]: `%${token}%`,
            });
            subQb.orWhere(`tag.name ILIKE :${param}`, {
              [param]: `%${token}%`,
            });
          }
        });
      }),
    );

    qb.orderBy('place.isVerified', 'DESC')
      .addOrderBy('place.ratingAverage', 'DESC')
      .addOrderBy('place.ratingCount', 'DESC')
      .take(4);

    return qb.getMany();
  }
}
