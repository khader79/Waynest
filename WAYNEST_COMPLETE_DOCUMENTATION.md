# Waynest - Complete Technical Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Backend Architecture](#backend-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Key Features Implementation](#key-features-implementation)
9. [Installation and Setup](#installation-and-setup)
10. [Code Examples](#code-examples)
11. [AI Integration](#ai-integration)
12. [Multi-language Support](#multi-language-support)
13. [Security Features](#security-features)
14. [Deployment](#deployment)

---

## Project Overview

**Waynest** is a modern, AI-powered travel planning platform that helps users create personalized travel itineraries. The system combines intelligent trip generation with comprehensive place and event management, social features, and multi-language support.

### Core Features

1. **AI-Powered Trip Planning**: Uses Google Gemini API to generate personalized itineraries
2. **Place & Event Management**: Complete system for managing attractions, venues, and events
3. **User Management**: Multi-role system (User, Provider, Admin) with authentication
4. **Social Features**: Wishlist, reviews, social graph, and content sharing
5. **Real-time Communication**: WebSocket-based chat system
6. **Viral Sharing**: Public trip sharing with unique URLs
7. **Multi-currency Support**: Handles different currencies and pricing
8. **Multi-language Interface**: Arabic, English, French, Turkish, Russian

### Project Structure

```
Waynest/
├── waynest-be/          # Backend (NestJS)
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   ├── common/      # Shared utilities and translations
│   │   └── modules/     # Feature modules
│   └── seed/           # Database seeding
├── waynest-FE/         # Frontend (React)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── features/   # Feature-based components
│   │   ├── modules/    # User role-based modules
│   │   ├── services/   # API communication
│   │   └── ui/         # Reusable components
│   └── public/         # Static assets and translations
└── README.md
```

---

## System Architecture

### Backend Architecture (NestJS)

The backend follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                                │
├─────────────────────────────────────────────────────────────┤
│  Controllers: Auth, Users, Places, Events, Trips, etc.      │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                            │
├─────────────────────────────────────────────────────────────┤
│  Services: Business logic for each module                   │
├─────────────────────────────────────────────────────────────┤
│                    Data Access Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Entities: TypeORM entities and database models             │
├─────────────────────────────────────────────────────────────┤
│                    External Services                        │
├─────────────────────────────────────────────────────────────┤
│  AI Services: Gemini API, Image Fetcher                     │
│  Utilities: Rate Limiting, Translation, Validation          │
└─────────────────────────────────────────────────────────────┘
```

### Frontend Architecture (React)

The frontend uses a feature-based architecture with role-based modules:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
├─────────────────────────────────────────────────────────────┤
│  Components: UI components and pages                        │
├─────────────────────────────────────────────────────────────┤
│                    Logic Layer                              │
├─────────────────────────────────────────────────────────────┤
│  Hooks: Custom hooks for state management                   │
│  Validation: Form and data validation                       │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                            │
├─────────────────────────────────────────────────────────────┤
│  API Services: HTTP clients and API endpoints               │
│  Utilities: Formatters, storage, type guards                │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Request** → Frontend Component
2. **Component** → Custom Hook/Service
3. **Service** → HTTP API Client
4. **API Client** → Backend Controller
5. **Controller** → Service Layer
6. **Service** → Database/External APIs
7. **Response** → Service → Controller → API Client → Hook → Component

---

## Technology Stack

### Backend (NestJS)

- **Runtime**: Node.js 18+
- **Framework**: NestJS (v10+)
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT with Passport
- **Validation**: Class-validator and Class-transformer
- **Logging**: Winston (built-in)
- **Testing**: Jest
- **AI Integration**: Google Gemini API
- **Real-time**: Socket.IO for WebSocket communication
- **Caching**: Redis (for rate limiting)
- **Email**: Nodemailer
- **File Storage**: Cloudinary integration

### Frontend (React)

- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **UI Library**: Ant Design
- **State Management**: React Context + Custom Hooks
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form
- **Validation**: Yup
- **Internationalization**: i18next
- **Styling**: CSS Modules
- **Toast Notifications**: React Toastify
- **Icons**: Ant Design Icons

### Development Tools

- **Code Quality**: ESLint, Prettier
- **Type Checking**: TypeScript
- **Package Management**: npm
- **Version Control**: Git
- **Deployment**: Vercel

---

## Backend Architecture

### Module Structure

Each module follows the NestJS standard structure:

```
modules/
├── auth/              # Authentication and authorization
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── dto/           # Data Transfer Objects
│   ├── entities/      # Database entities
│   └── guards/        # Authentication guards
├── users/             # User management
├── providers/         # Provider management
├── places/            # Place/attraction management
├── events/            # Event management
├── trip-planner/      # AI trip planning
├── bookings/          # Reservation system
├── reviews/           # Review system
├── wishlist/          # Wishlist management
├── social-graph/      # Social features
├── chat/              # Real-time chat
└── common/            # Shared utilities
```

### Key Modules

#### 1. Authentication Module (`auth/`)

Handles user authentication, JWT tokens, and role-based access control.

**Key Files:**
- `auth.controller.ts` - Login, registration, token refresh
- `auth.service.ts` - Authentication business logic
- `JwtStrategy.ts` - JWT strategy for Passport
- `role.guard.ts` - Role-based access control
- `optional-jwt-auth.guard.ts` - Optional authentication for public endpoints

#### 2. Trip Planner Module (`trip-planner/`)

Core AI-powered trip planning functionality.

**Key Files:**
- `trip-planner.controller.ts` - Trip generation endpoints
- `trip-planner.service.ts` - Trip generation logic
- `gemini.service.ts` - Google Gemini API integration
- `image-fetcher.service.ts` - Image processing for places
- `sharing.service.ts` - Trip sharing functionality

#### 3. User Module (`users/`)

User management with roles and preferences.

**Key Files:**
- `users.controller.ts` - User CRUD operations
- `users.service.ts` - User business logic
- `user.entity.ts` - User database model

#### 4. Place Module (`place/`)

Management of attractions and venues.

**Key Files:**
- `place.controller.ts` - Place CRUD operations
- `place.service.ts` - Place business logic
- `place.entity.ts` - Place database model
- `placepricing/` - Pricing management
- `place-opening-hours/` - Opening hours management

### Entity Relationships

```typescript
// User Entity
@Entity('users')
export class User {
  @OneToMany(() => ProviderMembership, membership => membership.user)
  providerMemberships: ProviderMembership[];
  
  @OneToMany(() => TripPlan, plan => plan.user)
  tripPlans: TripPlan[];
  
  @OneToMany(() => Review, review => review.user)
  reviews: Review[];
}

// Place Entity
@Entity('places')
export class Place {
  @ManyToOne(() => Provider, provider => provider.places)
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;
  
  @OneToMany(() => PlacePricing, pricing => pricing.place)
  pricings: PlacePricing[];
  
  @OneToMany(() => Review, review => review.place)
  reviews: Review[];
}

// Trip Plan Entity
@Entity('trip_plans')
export class TripPlan {
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;
  
  @ManyToOne(() => City)
  @JoinColumn({ name: 'city_id' })
  city: City;
}
```

---

## Frontend Architecture

### Feature-Based Structure

```
src/
├── features/          # Feature-based components
│   ├── trip-planner/  # AI trip planning feature
│   │   ├── TripPlanner.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── types/
│   │   ├── validation/
│   │   └── utils/
│   ├── bookings/      # Booking management
│   ├── places/        # Place browsing
│   ├── providers/     # Provider management
│   └── social/        # Social features
├── modules/           # Role-based modules
│   ├── public/        # Public pages (landing, login, register)
│   ├── user/          # User dashboard and features
│   ├── provider/      # Provider management
│   └── admin/         # Admin panel
├── services/          # API communication
│   ├── http/
│   │   ├── apiClient.ts
│   │   ├── apiService.ts
│   │   └── endpoints.ts
│   ├── auth/
│   ├── user/
│   └── ...
├── ui/               # Reusable components
│   ├── primitives/   # Basic components (Button, Input, Card)
│   ├── layout/       # Layout components
│   └── navBar/       # Navigation components
├── core/             # Core functionality
│   ├── providers/    # Context providers
│   ├── hooks/        # Custom hooks
│   ├── utils/        # Utility functions
│   └── router/       # Route configuration
└── styles/           # Global styles
```

### Component Architecture

#### Trip Planner Component Structure

```typescript
// Main TripPlanner Component
export const TripPlanner = () => {
  const {
    budgetTooLow,
    cities,
    countries,
    formData,
    generating,
    tripPlan,
    onSubmit,
    updateBudget,
    updateCity,
    // ... other state and functions
  } = useTripPlanner();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>AI Trip Planner</h1>
      <div className={styles.container}>
        <div className={styles.formSection}>
          <TripPlannerFormPanel
            formData={formData}
            onBudgetChange={updateBudget}
            onCityChange={updateCity}
            onSubmit={onSubmit}
            // ... other props
          />
        </div>
        <div className={styles.resultsSection}>
          <TripPlannerResultsPanel
            tripPlan={tripPlan}
            generating={generating}
            // ... other props
          />
        </div>
      </div>
    </div>
  );
};
```

#### Custom Hooks Pattern

```typescript
// useTripPlanner Hook
export const useTripPlanner = () => {
  const [formData, setFormData] = useState<TripFormData>({
    cityId: '',
    days: 3,
    budget: 500,
    persons: 1,
    interests: []
  });
  
  const [tripPlan, setTripPlan] = useState<GeneratedTripPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  
  const onSubmit = async (data: TripFormData) => {
    setGenerating(true);
    try {
      const result = await tripPlannerApi.generateTrip(data);
      setTripPlan(result);
    } catch (error) {
      console.error('Trip generation failed:', error);
    } finally {
      setGenerating(false);
    }
  };
  
  return {
    formData,
    tripPlan,
    generating,
    onSubmit,
    // ... other state and functions
  };
};
```

---

## Database Schema

### Core Entities

#### User Entity

```sql
CREATE TABLE users (
    id VARCHAR PRIMARY KEY,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    username VARCHAR UNIQUE NOT NULL,
    role VARCHAR DEFAULT 'USER',
    status VARCHAR DEFAULT 'ACTIVE',
    is_email_verified BOOLEAN DEFAULT false,
    is_phone_verified BOOLEAN DEFAULT false,
    phone VARCHAR,
    avatar_url VARCHAR,
    preferred_language VARCHAR DEFAULT 'en',
    is_search_visible BOOLEAN DEFAULT true,
    allowed_devices TEXT[],
    travel_preferences JSONB,
    last_login TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    lock_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Place Entity

```sql
CREATE TABLE places (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    type VARCHAR NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    rating_average DECIMAL(3, 2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    image_url VARCHAR,
    is_active BOOLEAN DEFAULT true,
    provider_id VARCHAR REFERENCES providers(id),
    city_id VARCHAR REFERENCES cities(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Trip Plan Entity

```sql
CREATE TABLE trip_plans (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR REFERENCES users(id),
    guest_token VARCHAR(64),
    city_id VARCHAR REFERENCES cities(id) NOT NULL,
    days INTEGER NOT NULL,
    budget DECIMAL(10, 2) NOT NULL,
    persons INTEGER NOT NULL,
    generated_plan JSONB,
    share_slug VARCHAR(16) UNIQUE,
    is_public BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    title VARCHAR,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Event Entity

```sql
CREATE TABLE events (
    id VARCHAR PRIMARY KEY,
    title VARCHAR NOT NULL,
    description TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    ticket_price DECIMAL(10, 2),
    currency_code VARCHAR(3),
    image_url VARCHAR,
    is_active BOOLEAN DEFAULT true,
    venue_id VARCHAR REFERENCES places(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Entity Relationships

- **User** → **TripPlan** (One-to-Many)
- **User** → **Review** (One-to-Many)
- **User** → **Wishlist** (One-to-Many)
- **Place** → **Review** (One-to-Many)
- **Place** → **Event** (One-to-Many)
- **Place** → **PlacePricing** (One-to-Many)
- **City** → **Place** (One-to-Many)
- **Provider** → **Place** (One-to-Many)

---

## API Endpoints

### Authentication Endpoints

```typescript
// POST /api/auth/login
// Login user
{
  "email": "user@example.com",
  "password": "password123"
}

// POST /api/auth/register
// Register new user
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "username": "johndoe"
}

// POST /api/auth/refresh
// Refresh JWT token
{
  "refreshToken": "refresh_token_here"
}

// POST /api/auth/logout
// Logout user
// Requires JWT token in Authorization header
```

### Trip Planning Endpoints

```typescript
// POST /api/trip-planner/generate
// Generate AI trip plan
{
  "cityId": "city_id_here",
  "days": 5,
  "budget": 1000,
  "persons": 2,
  "interests": ["history", "food", "nature"]
}

// GET /api/trip-planner/user-plans
// Get user's saved trip plans
// Requires JWT token

// GET /api/trip-planner/:id
// Get specific trip plan
// Requires JWT token (user must own the plan)

// DELETE /api/trip-planner/:id
// Delete trip plan
// Requires JWT token

// POST /api/trip-planner/:id/share
// Publish trip plan for public sharing
{
  "title": "My Trip to Paris",
  "description": "A wonderful trip to the city of lights"
}

// GET /api/trip-planner/share/:slug
// Get public trip plan by share slug
```

### Place Management Endpoints

```typescript
// GET /api/places
// Get all places with filtering
{
  "cityId": "city_id",
  "type": "museum",
  "minRating": 4.0,
  "maxPrice": 50
}

// GET /api/places/:id
// Get specific place

// POST /api/places
// Create new place (Provider only)
{
  "name": "Eiffel Tower",
  "description": "Iconic Paris landmark",
  "type": "attraction",
  "address": "Champ de Mars, 5 Avenue Anatole France",
  "latitude": 48.8584,
  "longitude": 2.2945,
  "cityId": "paris_city_id"
}

// PUT /api/places/:id
// Update place (Provider only)

// DELETE /api/places/:id
// Delete place (Provider only)
```

### Review System Endpoints

```typescript
// POST /api/reviews
// Create review
{
  "placeId": "place_id",
  "rating": 5,
  "comment": "Amazing place!",
  "visitDate": "2024-01-15"
}

// GET /api/reviews/place/:placeId
// Get reviews for a place

// GET /api/reviews/user/:userId
// Get user's reviews

// PUT /api/reviews/:id
// Update review (User only, own reviews)

// DELETE /api/reviews/:id
// Delete review (User only, own reviews)
```

### User Management Endpoints

```typescript
// GET /api/users/profile
// Get user profile
// Requires JWT token

// PUT /api/users/profile
// Update user profile
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "preferredLanguage": "en",
  "travelPreferences": {
    "currency": "USD",
    "notifications": true,
    "destinations": ["Paris", "Rome"],
    "theme": "light"
  }
}

// GET /api/users/dashboard
// Get user dashboard stats
// Requires JWT token
```

---

## Key Features Implementation

### 1. AI-Powered Trip Generation

The core feature uses Google Gemini API to generate personalized itineraries:

```typescript
// gemini.service.ts
@Injectable()
export class GeminiService {
  private readonly geminiApiKey = process.env.GEMINI_API_KEY;
  
  async generateTripPlan(context: TripContext): Promise<IGeneratedPlan> {
    const prompt = this.buildPrompt(context);
    
    const response = await fetch('https://api.gemini.com/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.geminiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        max_tokens: 2000,
        temperature: 0.7
      })
    });
    
    const result = await response.json();
    return this.parseTripPlan(result.text);
  }
  
  private buildPrompt(context: TripContext): string {
    return `
      Generate a ${context.days}-day trip plan for ${context.destinationName} 
      with a budget of ${context.budget} for ${context.persons} people.
      
      Budget per person per day: ${context.budgetPerPersonPerDay}
      
      Places to consider:
      ${context.places.map(p => `
        - ${p.name} (${p.type})
        - Rating: ${p.rating}
        - Price: ${p.price} ${p.currency}
        - Tags: ${p.tags.join(', ')}
      `).join('')}
      
      Events available:
      ${context.events.map(e => `
        - ${e.name} at ${e.venue}
        - Price: ${e.price} ${e.currency}
        - Dates: ${e.startDate} to ${e.endDate}
      `).join('')}
      
      Return the plan in JSON format with:
      - days: array of day objects
      - morning, afternoon, evening slots for each day
      - estimated costs
      - tips for travelers
    `;
  }
}
```

### 2. Multi-language Support

The system supports 5 languages with comprehensive translation management:

```typescript
// translation.service.ts
@Injectable()
export class TranslationService {
  private translations: Record<string, Record<string, string>> = {};
  
  async loadTranslations(): Promise<void> {
    const languages = ['en', 'ar', 'fr', 'tr', 'ru'];
    
    for (const lang of languages) {
      const translationFile = await import(`./locales/${lang}/translation.json`);
      this.translations[lang] = translationFile;
    }
  }
  
  translate(key: string, language: string): string {
    return this.translations[language]?.[key] || key;
  }
}
```

Frontend integration with i18next:

```typescript
// i18n configuration
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: require('../public/locales/en/translation.json') },
      ar: { translation: require('../public/locales/ar/translation.json') },
      fr: { translation: require('../public/locales/fr/translation.json') },
      tr: { translation: require('../public/locales/tr/translation.json') },
      ru: { translation: require('../public/locales/ru/translation.json') },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });
```

### 3. Real-time Chat System

WebSocket-based chat with Socket.IO:

```typescript
// chat.gateway.ts
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  }
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  
  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }
  
  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }
  
  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, room: string) {
    client.join(room);
    this.server.to(room).emit('user-joined', { userId: client.id });
  }
  
  @SubscribeMessage('send-message')
  handleSendMessage(client: Socket, payload: MessagePayload) {
    this.server.to(payload.room).emit('new-message', payload);
  }
}
```

### 4. Image Processing and Fetching

Automatic image fetching and processing for places:

```typescript
// image-fetcher.service.ts
@Injectable()
export class ImageFetcherService {
  async ensureImage(place: Place): Promise<void> {
    if (place.imageUrl) return;
    
    try {
      const imageUrl = await this.fetchImageForPlace(place.name, place.city.name);
      place.imageUrl = imageUrl;
      await this.placeRepo.save(place);
    } catch (error) {
      console.error(`Failed to fetch image for ${place.name}:`, error);
    }
  }
  
  private async fetchImageForPlace(name: string, city: string): Promise<string> {
    // Implementation using Google Custom Search API or similar
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(name + ' ' + city)}`
    );
    const data = await response.json();
    return data.results[0]?.urls.regular;
  }
}
```

### 5. Rate Limiting and Security

Comprehensive rate limiting and security measures:

```typescript
// rateLimiter.ts
export const rateLimiter = {
  checkLimit: (key: string, limit: RateLimitConfig) => {
    const now = Date.now();
    const windowStart = now - limit.windowMs;
    
    // Clean old entries
    if (store[key] && store[key].timestamp < windowStart) {
      store[key] = { count: 0, timestamp: now };
    }
    
    // Check limit
    if (store[key] && store[key].count >= limit.max) {
      throw new TooManyRequestsException('Rate limit exceeded');
    }
    
    // Increment counter
    if (!store[key]) {
      store[key] = { count: 1, timestamp: now };
    } else {
      store[key].count++;
    }
  }
};

export const RATE_LIMIT_PRESETS = {
  TRIP_GENERATION: { max: 5, windowMs: 600000 }, // 5 per 10 minutes
  LOGIN: { max: 5, windowMs: 900000 }, // 5 per 15 minutes
  API: { max: 100, windowMs: 60000 } // 100 per minute
};
```

---

## Installation and Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL
- Redis (for rate limiting)

### Backend Setup

1. **Clone and Install Dependencies**
```bash
cd waynest-be
npm install
```

2. **Database Setup**
```bash
# Create database
createdb waynest_db

# Environment variables
cp .env.example .env
```

3. **Environment Configuration**
```bash
# .env file
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=waynest_db
DB_SSL=false
DB_SYNC=true

# JWT and Security
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRES_IN=7d

# AI Services
GEMINI_API_KEY=your_gemini_api_key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

4. **Run Backend**
```bash
npm run start:dev
```

### Frontend Setup

1. **Clone and Install Dependencies**
```bash
cd waynest-FE
npm install
```

2. **Environment Configuration**
```bash
# .env file
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME=Waynest
VITE_DEFAULT_LANGUAGE=en
```

3. **Run Frontend**
```bash
npm run dev
```

### Database Seeding

The system includes comprehensive seeding for testing:

```typescript
// seed.controller.ts
@Post('seed')
async seedDatabase() {
  await this.seedService.seedCountries();
  await this.seedService.seedCities();
  await this.seedService.seedCurrencies();
  await this.seedService.seedBethlehem();
  return { message: 'Database seeded successfully' };
}
```

Run seeding:
```bash
curl -X POST http://localhost:3000/api/seed
```

---

## Code Examples

### 1. User Authentication

```typescript
// auth.service.ts
@Injectable()
export class AuthService {
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(password, user.passwordHash)) {
      return user;
    }
    return null;
  }
  
  async login(user: User) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    };
  }
}
```

### 2. Trip Generation

```typescript
// trip-planner.service.ts
async generateTripPlan(userId: string | null, dto: CreateTripPlannerDto) {
  // 1. Validate and fetch data
  const city = await this.cityRepo.findOne({ where: { id: dto.cityId } });
  const places = await this.placeRepo.find({
    where: { city: { id: city.id }, isActive: true },
    relations: ['pricings', 'openingHours', 'tags']
  });
  
  // 2. Filter places by interests
  const filteredPlaces = dto.interests?.length
    ? places.filter(p => p.tags.some(t => 
        dto.interests!.map(i => i.toLowerCase())
          .includes(t.name.toLowerCase())
      ))
    : places;
  
  // 3. Prepare context for AI
  const context = {
    cityId: city.id,
    destinationName: city.name,
    days: dto.days,
    budget: dto.budget,
    persons: dto.persons,
    budgetPerPersonPerDay: dto.budget / dto.persons / dto.days,
    places: filteredPlaces.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      rating: p.ratingAverage,
      price: p.pricings[0]?.basePrice ?? 0,
      currency: p.pricings[0]?.currencyCode ?? 'ILS',
      tags: p.tags.map(t => t.name)
    }))
  };
  
  // 4. Generate with AI
  const generatedPlan = await this.geminiService.generateTripPlan(context);
  
  // 5. Save to database
  if (userId) {
    const tripPlan = this.tripPlanRepo.create({
      userId,
      cityId: city.id,
      days: dto.days,
      budget: dto.budget,
      persons: dto.persons,
      generatedPlan
    });
    await this.tripPlanRepo.save(tripPlan);
    return { tripPlanId: tripPlan.id, ...generatedPlan };
  }
  
  return { tripPlanId: null, ...generatedPlan };
}
```

### 3. Frontend State Management

```typescript
// useTripPlanner.ts
export const useTripPlanner = () => {
  const [formData, setFormData] = useState<TripFormData>({
    cityId: '',
    days: 3,
    budget: 500,
    persons: 1,
    interests: []
  });
  
  const [tripPlan, setTripPlan] = useState<GeneratedTripPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const onSubmit = async (data: TripFormData) => {
    setGenerating(true);
    setError(null);
    
    try {
      const result = await tripPlannerApi.generateTrip(data);
      setTripPlan(result);
    } catch (err) {
      setError(err.message || 'Failed to generate trip plan');
    } finally {
      setGenerating(false);
    }
  };
  
  const updateFormData = (field: keyof TripFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  return {
    formData,
    tripPlan,
    generating,
    error,
    onSubmit,
    updateFormData
  };
};
```

### 4. Component with Hooks

```typescript
// TripPlannerFormPanel.tsx
export const TripPlannerFormPanel = ({ 
  formData, 
  onBudgetChange, 
  onCityChange,
  onSubmit 
}) => {
  const { countries, cities, loadingCountries, loadingCities } = useTripFormData();
  
  return (
    <div className={styles.formPanel}>
      <h3>Plan Your Trip</h3>
      
      <div className={styles.formGroup}>
        <label>Country</label>
        <Select
          loading={loadingCountries}
          onChange={onCountryChange}
          placeholder="Select country"
        >
          {countries.map(country => (
            <Option key={country.id} value={country.id}>
              {country.name}
            </Option>
          ))}
        </Select>
      </div>
      
      <div className={styles.formGroup}>
        <label>City</label>
        <Select
          loading={loadingCities}
          onChange={onCityChange}
          placeholder="Select city"
          disabled={!formData.countryId}
        >
          {cities.map(city => (
            <Option key={city.id} value={city.id}>
              {city.name}
            </Option>
          ))}
        </Select>
      </div>
      
      <div className={styles.formGroup}>
        <label>Budget</label>
        <InputNumber
          value={formData.budget}
          onChange={onBudgetChange}
          min={0}
          step={10}
          placeholder="Enter budget"
        />
      </div>
      
      <Button 
        type="primary" 
        onClick={() => onSubmit(formData)}
        loading={generating}
        disabled={!formData.cityId}
      >
        Generate Trip Plan
      </Button>
    </div>
  );
};
```

---

## AI Integration

### Google Gemini API Integration

The system uses Google's Gemini API for intelligent trip generation:

```typescript
// gemini.service.ts
@Injectable()
export class GeminiService {
  private readonly client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  async generateTripPlan(context: TripContext): Promise<IGeneratedPlan> {
    const model = this.client.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = this.buildPrompt(context);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return this.parseResponse(text);
  }
  
  private buildPrompt(context: TripContext): string {
    return `Generate a ${context.days}-day trip plan for ${context.destinationName} 
    with a budget of ${context.budget} for ${context.persons} people.
    
    Consider these factors:
    - Budget per person per day: ${context.budgetPerPersonPerDay}
    - Traveler interests: ${context.interests?.join(', ') || 'general tourism'}
    - Available places: ${context.places.map(p => p.name).join(', ')}
    - Available events: ${context.events.map(e => e.name).join(', ')}
    
    Return JSON with:
    {
      "days": [
        {
          "day": 1,
          "morning": { "placeId": "id", "name": "Place Name", "duration": "2h", "estimatedCost": 20 },
          "afternoon": { ... },
          "evening": { ... },
          "totalDayCost": 60
        }
      ],
      "totalEstimatedCost": 300,
      "tips": ["Tip 1", "Tip 2"]
    }`;
  }
}
```

### Image Generation and Processing

```typescript
// image-fetcher.service.ts
@Injectable()
export class ImageFetcherService {
  async fetchAndProcessImage(query: string): Promise<string> {
    // 1. Search for images
    const searchResponse = await this.unsplashApi.search(query);
    const imageUrl = searchResponse.results[0]?.urls.regular;
    
    // 2. Download and process
    const imageBuffer = await this.downloadImage(imageUrl);
    const processedImage = await this.processImage(imageBuffer);
    
    // 3. Upload to cloud storage
    const cloudUrl = await this.uploadToCloud(processedImage);
    
    return cloudUrl;
  }
  
  private async processImage(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .resize(800, 600, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer();
  }
}
```

---

## Multi-language Support

### Backend Translation System

```typescript
// translation.service.ts
@Injectable()
export class TranslationService {
  private translations: Map<string, Map<string, string>> = new Map();
  
  async loadTranslations(): Promise<void> {
    const languages = ['en', 'ar', 'fr', 'tr', 'ru'];
    
    for (const lang of languages) {
      const translationData = await this.loadTranslationFile(lang);
      this.translations.set(lang, new Map(Object.entries(translationData)));
    }
  }
  
  translate(key: string, language: string): string {
    const langMap = this.translations.get(language);
    return langMap?.get(key) || key;
  }
  
  private async loadTranslationFile(language: string): Promise<any> {
    const filePath = path.join(__dirname, `../locales/${language}/translation.json`);
    return JSON.parse(await fs.readFile(filePath, 'utf-8'));
  }
}
```

### Frontend i18next Integration

```typescript
// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: { translation: require('../public/locales/en/translation.json') },
  ar: { translation: require('../public/locales/ar/translation.json') },
  fr: { translation: require('../public/locales/fr/translation.json') },
  tr: { translation: require('../public/locales/tr/translation.json') },
  ru: { translation: require('../public/locales/ru/translation.json') },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
```

### Language Context Provider

```typescript
// LanguageContext.tsx
export const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<string>(() => {
    return localStorage.getItem('language') || 'en';
  });
  
  const t = (key: string): string => {
    return i18n.t(key, { lng: language });
  };
  
  const handleSetLanguage = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
```

---

## Security Features

### JWT Authentication

```typescript
// JwtStrategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }
  
  async validate(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```

### Role-Based Access Control

```typescript
// role.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role === role);
  }
}

// Usage in controller
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.PROVIDER)
@Post('places')
async createPlace(@Body() createPlaceDto: CreatePlaceDto) {
  return this.placesService.create(createPlaceDto);
}
```

### Rate Limiting

```typescript
// rateLimiter.ts
export const rateLimiter = {
  checkLimit: (key: string, config: RateLimitConfig) => {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Get or create store entry
    if (!store[key]) {
      store[key] = { count: 0, timestamp: now };
    }
    
    // Reset window if needed
    if (store[key].timestamp < windowStart) {
      store[key] = { count: 0, timestamp: now };
    }
    
    // Check limit
    if (store[key].count >= config.max) {
      throw new TooManyRequestsException('Rate limit exceeded');
    }
    
    // Increment
    store[key].count++;
  }
};
```

### Input Validation

```typescript
// create-trip-planner.dto.ts
export class CreateTripPlannerDto {
  @IsString()
  @IsNotEmpty()
  cityId: string;
  
  @IsInt()
  @Min(1)
  @Max(30)
  days: number;
  
  @IsDecimal({ decimal_digits: '0,2' })
  @Min(0)
  budget: number;
  
  @IsInt()
  @Min(1)
  @Max(20)
  persons: number;
  
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];
  
  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}
```

---

## Deployment

### Development Environment

1. **Backend Development**
```bash
cd waynest-be
npm run start:dev
```

2. **Frontend Development**
```bash
cd waynest-FE
npm run dev
```

### Production Build

1. **Backend Production**
```bash
cd waynest-be
npm run build
npm run start:prod
```

2. **Frontend Production**
```bash
cd waynest-FE
npm run build
npm run preview
```

### Docker Deployment

```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

```dockerfile
# Frontend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

### Environment Variables for Production

```bash
# Backend .env
NODE_ENV=production
PORT=3000
DB_HOST=your_production_db_host
DB_SSL=true
DB_SYNC=false
JWT_SECRET=your_production_jwt_secret
GEMINI_API_KEY=your_production_gemini_key

# Frontend .env
VITE_API_BASE_URL=https://your-api-domain.com/api
VITE_APP_NAME=Waynest
```

### Vercel Deployment

1. **Frontend on Vercel**
```bash
npm install -g vercel
vercel
```

2. **Backend on Vercel**
```bash
# Create vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.ts"
    }
  ]
}
```

### Monitoring and Logging

```typescript
// logger.service.ts
@Injectable()
export class LoggerService {
  private logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.File({ filename: 'error.log', level: 'error' }),
      new winston.transports.File({ filename: 'combined.log' }),
      new winston.transports.Console({
        format: winston.format.simple()
      })
    ]
  });
  
  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }
  
  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }
}
```

---

## Conclusion

Waynest is a comprehensive, modern travel planning platform that demonstrates best practices in full-stack development. The system combines:

- **Robust Backend Architecture**: NestJS with modular design and comprehensive security
- **Modern Frontend**: React with TypeScript and feature-based organization
- **AI Integration**: Google Gemini for intelligent trip generation
- **Multi-language Support**: Complete internationalization system
- **Real-time Features**: WebSocket-based chat and notifications
- **Scalable Design**: PostgreSQL, Redis, and cloud-ready architecture

The codebase is well-structured, documented, and follows industry best practices, making it suitable for both learning and production use. The modular architecture allows for easy extension and maintenance, while the comprehensive feature set provides a solid foundation for a travel planning platform.

This documentation provides everything needed for another AI or developer to understand, modify, and extend the Waynest system effectively.