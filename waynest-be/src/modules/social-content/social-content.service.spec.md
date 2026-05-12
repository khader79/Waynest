# Social Content Feed Visibility Spec

## Feature: Posts inherit Trip Plan visibility

**Context:** When a user publishes a post linked to a Trip Plan, the post's visibility must match the Trip Plan's `shareVisibility`.

### Scenario 1: Publishing a post with Trip Plan (FRIENDS visibility)

**Given:**

- Trip Plan has `shareVisibility = 'FRIENDS'`
- User calls `createPost(dto)` with `tripPlanId` set

**When:**

- `dto.visibility` is not provided (defaults to PUBLIC)
- OR `dto.visibility = 'PUBLIC'` (explicit)

**Then:**

- ❌ BAD: Post visibility would be PUBLIC (BUG)
- ✅ GOOD: Post visibility is FRIENDS (NEW FIX)

**Enforcement:** If `dto.visibility` conflicts with `tripPlan.shareVisibility`, throw `BadRequestException`

---

### Scenario 2: Feed visibility rules (unchanged, verified)

#### For You Tab (`filter='for-you'`)

| Post Visibility | Shows?               | Reason                                                     |
| --------------- | -------------------- | ---------------------------------------------------------- |
| PUBLIC          | ✓ YES                | Always visible to authenticated users                      |
| FRIENDS         | ❌ NO                | Excluded by `post.visibility != :excludeFriendsVis` filter |
| FOLLOWERS       | ✓ YES (if following) | Allowed for non-provider posts                             |
| PRIVATE         | ❌ NO                | Filtered by `filterVisiblePosts`                           |

#### Following Tab (`filter='following'`)

| Post Visibility | Author is Friend | Shows? | Reason                                               |
| --------------- | ---------------- | ------ | ---------------------------------------------------- |
| PUBLIC          | N/A              | ✓ YES  | Public to all                                        |
| FRIENDS         | ✓ YES            | ✓ YES  | `filterVisiblePosts` allows FRIENDS for friends only |
| FRIENDS         | ❌ NO            | ❌ NO  | Not a friend, cannot see FRIENDS posts               |
| FOLLOWERS       | ✓ YES            | ✓ YES  | If followed author                                   |
| PRIVATE         | N/A              | ❌ NO  | Never visible (author only)                          |

---

## Implementation Summary

**File:** `social-content.service.ts::createPost()`

**Before (BUGGY):**

```typescript
const vis = dto.visibility ?? SocialPostVisibility.PUBLIC;
// Trip Plan visibility is completely ignored!
```

**After (FIXED):**

```typescript
let vis = dto.visibility ?? SocialPostVisibility.PUBLIC;

if (linkedTrip) {
  // Trip plan posts must respect the plan's shareVisibility
  const tripShareVis =
    linkedTrip.shareVisibility === 'FRIENDS'
      ? SocialPostVisibility.FRIENDS
      : SocialPostVisibility.PUBLIC;

  if (dto.visibility && dto.visibility !== tripShareVis) {
    throw new BadRequestException(
      'Post visibility must match trip plan shareVisibility',
    );
  }
  vis = tripShareVis;
}
```

---

## Related Files

- `entities/social-post.entity.ts` — `SocialPostVisibility` enum
- `entities/trip-planner.entity.ts` — `shareVisibility` field
- `dto/trip-sharing.dto.ts` — `ShareVisibility` type definition
