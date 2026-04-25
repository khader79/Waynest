# Waynest UX / AI Redesign Plan

## 1. Why this plan exists

The current product already has good building blocks:

- an AI trip planner
- place and event discovery
- public/shared trips
- a social layer for travelers
- provider pages and verified places

But the first impression is still weaker than the product's actual value.

Right now, the product feels more like "a travel site with a planner" than
"an AI travel system with a clear reason to choose it over competitors."

This plan focuses on four goals:

1. Make the first screen visually stronger and more memorable.
2. Make the AI value obvious, useful, and present across the system.
3. Surface more real place data and trust signals.
4. Improve usability for both first-time and returning users.

## 2. Current-state audit from the codebase

### 2.1 Landing page problem

The live router currently points to:

- `waynest-FE/src/pages/guest/landing/LandingPage.jsx`

This page is visually clean, but it is too generic:

- generic headline: "Explore the World / Your Way"
- generic subtext: "Plan AI-powered itineraries and discover new places."
- only 3 simple feature cards
- no real sample itinerary
- no featured places/events/trips on the page
- no concrete proof of why Waynest is different

At the same time, there is already a richer unused landing implementation:

- `waynest-FE/src/modules/public/pages/landing/LandingPage.tsx`

That version already includes:

- featured places
- public trips
- upcoming events
- stronger "discover + plan + social" framing

This is a major opportunity: part of the redesign already exists in the repo,
but the app is not using it.

### 2.2 AI is present in labels, not in the product story

Today, AI is mostly shown as:

- page title: `AI Trip Planner`
- small labels in sidebars
- loading text while generating a plan

But it is not clearly explained to users:

- what the AI uses
- why it picked these places
- how the plan matches budget/interests
- what is AI-generated vs platform data
- how users can refine or correct the result

So the AI exists technically, but not experientially.

### 2.3 Planner usability problem

The planner form currently asks for many inputs in one vertical block:

- country
- city
- days
- budget
- currency
- persons
- interests

This works functionally, but it does not feel exciting or guided.
It feels like a normal form, not a premium AI planning experience.

### 2.4 Place-data visibility problem

There is a real data mismatch in the place detail flow:

- the frontend expects `pricing` / `pricings` and `openingHours`
- but the backend `PlaceService.findOne()` only loads:
  `relations: ['city', 'provider', 'tags']`

That means place details can look incomplete even when the data exists in the
database. This is not just a UX issue; it is also a backend response issue.

### 2.5 System identity problem

Waynest currently mixes multiple valuable ideas:

- AI itinerary planning
- place discovery
- events
- social travel
- provider ecosystem

That is actually a strength.

But because the homepage and planner do not frame these parts as one connected
system, the product can look unfocused instead of distinctive.

## 3. Competitor patterns worth learning from

Based on official competitor pages reviewed on April 25, 2026:

### Mindtrip

Mindtrip makes its value clear immediately:

- personalized recommendations
- customizable itineraries
- photos, maps, reviews
- group planning
- events
- Google Pins import
- collections
- receipt/booking organization

Takeaway for Waynest:
Do not sell only "generate a trip." Sell a planning system with memory,
collaboration, and real travel context.

Source:
- https://mindtrip.ai/
- https://mindtrip.ai/about

### Layla

Layla positions itself very directly as:

- "AI travel agent and trip planner"
- complete personalized itineraries
- flights, hotels, activities, dining
- ready-to-book plans
- live pricing and availability

Takeaway for Waynest:
Be much more explicit. Users should not have to infer that AI is central.
The product should state what the AI does in plain language.

Source:
- https://layla.ai/en

### GuideGeek

GuideGeek is strong because it feels simple and conversational:

- plan complex trips in minutes
- one chat
- real-time data
- real-time maps and local tips

Takeaway for Waynest:
Reduce friction. AI should feel like a guide, not a form buried in the site.

Source:
- https://guidegeek.com/
- https://guidegeek.com/about

### Wonderplan

Wonderplan uses a highly structured preferences flow:

- destination
- dates
- days
- budget
- travel companions
- activity interests
- food preferences
- AI generation or manual customization

Takeaway for Waynest:
The planner should feel staged, guided, and editable.

Source:
- https://wonderplan.ai/v2/trip-planner

## 4. Research-backed UX principles to apply

### First-impression credibility

Stanford's Web Credibility Project emphasizes:

- make it easy to verify accuracy
- show there is a real organization behind the site
- show trustworthy people behind the product
- make it easy to contact the team

Implication for Waynest:
visual polish alone is not enough; credibility must be visible through real
data, real providers, verification, and clear product proof.

Source:
- https://credibility.stanford.edu/guidelines/

### AI trust and explainability

Google PAIR emphasizes:

- set expectations clearly
- explain benefits, not just the technology
- onboard users in stages
- help users calibrate trust
- explain what the AI does, what data it uses, and confidence/limitations
- keep exploration safe and reversible

Implication for Waynest:
do not market "AI magic." Show useful value, clear limits, and editable output.

Source:
- https://pair.withgoogle.com/guidebook-v2/chapter/mental-models/
- https://pair.withgoogle.com/guidebook-v2/chapter/explainability-trust/
- https://pair.withgoogle.com/guidebook-v2/patterns

## 5. Recommended product positioning

Waynest should position itself as:

**"The AI travel co-pilot that connects smart itinerary generation,
verified local discovery, and social travel collaboration in one system."**

This is better than positioning it as only:

- a planner
- a social feed
- a directory

The differentiator is not one feature alone.
The differentiator is the combination:

- AI planning
- real places/events/providers
- social sharing and remixing

## 6. The redesign strategy

### 6.1 Core message hierarchy

The message hierarchy should become:

1. Plan smarter with AI.
2. Explore real places and events.
3. Refine, share, and remix trips with people.

### 6.2 What users should understand in the first 5 seconds

When someone opens Waynest, they should understand:

- this is an AI-powered travel product
- it creates personalized itineraries
- it is backed by real places/events/providers
- it supports sharing and collaboration

### 6.3 What users should feel

- "This looks modern and trustworthy."
- "This is different from a generic travel site."
- "The AI is useful, not decorative."
- "I can start fast without confusion."

## 7. Page-by-page redesign recommendations

### 7.1 Landing page

#### Problems now

- too generic
- not enough proof
- weak differentiation
- AI message is shallow

#### New structure

1. Hero with clear AI promise
   Example direction:
   "Build a trip that fits your budget, interests, and pace in minutes."

2. Proof strip directly under hero
   Show:
   - real places
   - public shared trips
   - providers
   - events
   - verification signals

3. AI demo section
   A visual mock of:
   - user preferences
   - AI reasoning summary
   - output itinerary

4. "Why Waynest" section
   Show 3 differentiators:
   - AI itinerary generation
   - verified local discovery
   - social remix + sharing

5. Featured places / events / public trips

6. Trust section
   Show:
   - verified places/providers
   - real counts
   - data freshness / curated catalog

7. CTA section
   Use two clear paths:
   - Try AI planner
   - Explore destinations

#### Implementation note

Before building from scratch, first evaluate whether the richer landing in:

- `waynest-FE/src/modules/public/pages/landing/LandingPage.tsx`

can be adopted or merged into the live route.

### 7.2 Planner page

#### Problems now

- looks like a normal form
- weak onboarding
- no "why this plan"
- AI feels hidden after generation

#### New structure

1. Add a planner intro block above the form
   Show:
   - what the AI uses
   - what it returns
   - how long it takes

2. Convert the form into staged sections
   Suggested steps:
   - Destination
   - Trip shape
   - Budget and travelers
   - Interests and style

3. Add "Try a sample trip" shortcuts
   Example:
   - Solo cultural weekend
   - Family relaxed trip
   - Food-focused trip

4. Add AI reasoning cards in results
   Example:
   - Why these places were chosen
   - Budget fit
   - Variety balance
   - Event opportunities included

5. Make result editing obvious
   Users should be able to:
   - replace a stop
   - lock a favorite
   - ask for cheaper/faster/more local alternatives

6. Add trust language
   Label clearly:
   - AI suggestion
   - catalog data
   - estimated cost

### 7.3 Explore page

#### Problems now

- discovery exists, but it is disconnected from AI value
- cards are useful, but not strategic

#### Improvements

1. Add AI entry points inside discovery:
   - "Plan around this place"
   - "Use this city in planner"
   - "Build a 2-day route from these results"

2. Add richer metadata on cards:
   - tags
   - provider
   - price range
   - verified status
   - open now / hours where relevant

3. Add a smart compare state
   Let users collect 2-4 places before sending them into the planner.

### 7.4 Place detail page

#### Problems now

- some data is expected by the UI but missing from the API payload
- page is visually decent, but it still feels like a detail page, not a smart
  decision page

#### Improvements

1. Fix backend relations first
   Include:
   - `pricings`
   - `openingHours`
   - optionally related events / reviews summary

2. Upgrade the detail page into a decision-support page
   Add:
   - best time to visit
   - price band
   - duration fit
   - who this place suits
   - AI suggestions nearby

3. Add "Use in AI trip" actions
   - add as must-visit
   - build a day around this place
   - compare with similar places

### 7.5 Signed-in social/product surfaces

To make AI visible across the system:

1. Add persistent AI entry points in feed/sidebar/profile
2. Show "continue your plan" modules
3. Show "remix this public trip" more prominently
4. Add lightweight AI prompts near saved plans and discovery cards

## 8. Immediate technical priorities

### Priority A: fix data completeness

Fix `PlaceService.findOne()` to return the relations the UI already expects.

This is the fastest practical win because it improves trust and content depth.

### Priority B: replace or merge the landing page

Either:

- switch the route to the richer landing module

or:

- merge the stronger sections into the current live landing page

### Priority C: make AI explanation visible on planner

Add:

- what the AI uses
- what it returns
- why users should trust/edit the result

### Priority D: redesign planner form into steps

This improves both attention and usability.

## 9. Proposed phased roadmap

### Phase 1: Quick wins (3-5 days)

- fix place detail backend relations
- expose opening hours and pricing correctly
- improve planner intro copy
- add AI explanation block
- add stronger CTA hierarchy on landing

### Phase 2: Visual and messaging redesign (1-2 weeks)

- adopt/merge richer landing page
- redesign hero, proof strip, and differentiator section
- unify AI language across landing, planner, explore, and sidebars
- improve place and explore cards

### Phase 3: Planner experience upgrade (1-2 weeks)

- convert planner into step-based flow
- add sample scenarios
- add AI reasoning cards
- add editable recommendations / replace actions

### Phase 4: System-wide AI integration (1 week)

- add AI triggers across explore, place details, saved plans, and social areas
- add contextual prompts and remix flows

### Phase 5: Validation and polish (3-5 days)

- usability testing
- content refinement
- mobile review
- accessibility pass

## 10. Usability test plan

Test with at least 5-7 people from mixed user types:

- first-time traveler
- frequent traveler
- budget-sensitive user
- user who prefers simple guidance
- user who likes discovery and browsing

### Tasks

1. Understand what Waynest does in 10 seconds.
2. Start a trip plan without help.
3. Explain what the AI is doing.
4. Find a place and decide whether it fits the trip.
5. Share or save a trip.

### Success metrics

- user can explain product value in one sentence
- user reaches planner without confusion
- user completes a first plan quickly
- user can distinguish AI suggestions from stored platform data
- user reports trust in the recommendations

## 11. What success should look like

After redesign, a new user should say:

- "I get what this product does immediately."
- "The AI is actually part of the experience."
- "This feels more complete than a simple itinerary generator."
- "The site gives me enough real information to trust the plan."

## 12. Recommended next implementation order

If we start building now, this should be the order:

1. Fix place detail API data completeness.
2. Upgrade the landing page using the stronger existing module.
3. Redesign the planner hero/onboarding and result explanation.
4. Add AI entry points to explore and place detail.
5. Polish signed-in sidebars/feed surfaces to keep AI visible system-wide.

## 13. Key evidence from this repo

- Live landing page is minimal:
  `waynest-FE/src/pages/guest/landing/LandingPage.jsx`
- Richer landing already exists:
  `waynest-FE/src/modules/public/pages/landing/LandingPage.tsx`
- Planner is currently framed mainly by title and form:
  `waynest-FE/src/pages/shared/TripPlanner.jsx`
  `waynest-FE/src/components/trips/TripPlannerFormPanel.jsx`
  `waynest-FE/src/components/trips/TripPlannerResultsPanel.jsx`
- Place detail expects richer place data:
  `waynest-FE/src/pages/guest/placeDetail/PlaceDetail.jsx`
- Backend detail endpoint currently omits key relations:
  `waynest-be/src/modules/place/place.service.ts`

