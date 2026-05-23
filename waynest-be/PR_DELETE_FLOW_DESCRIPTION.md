PR: Deletion-safety fixes — FK policies + service purge improvements

Summary

- Adds defensive migrations to update foreign-key `ON DELETE` behaviors for user-related and provider/place/event graphs.
- Adds/aligns `onDelete` metadata in entities where appropriate (`TripPlan`, `Wishlist`, `SocialPost`, `Review`, `EventComment`, etc.).
- Updates `ProvidersService.remove` to purge provider-scoped data transactionally and demote owner user role as needed.
- Expands `UsersService.purgeUserData()` to remove or null dependent rows in a transactional manner.

Files of interest

- `src/migrations/20260523120000-FixDeletionForeignKeys.ts`
- `src/migrations/20260523143000-FixPlaceEventDeletionForeignKeys.ts`
- `src/modules/providers/providers.service.ts` (provider removal changes)
- `src/modules/users/users.service.ts` (purgeUserData enhancements)
- Entity files with explicit `onDelete` added/verified: `social-post.entity.ts`, `review.entity.ts`, `trip-plan-view.entity.ts`, `wishlist.entity.ts`, `notifications.entity.ts`, etc.

Testing

- See `DELETE_FLOW_TEST_PLAN.md` for an actionable staging checklist and SQL verification queries.

Reviewer notes

- These migrations are safe but must be applied on staging before running destructive deletes in production.
- Soft-deletes remain in place for `places` and `events`; DB cascades are for hard deletes.
- If you want, I can add automated `psql` scripts or a Node.js integration test harness to exercise the scenarios.

Request

- Please review the migrations and service logic and confirm whether you want all `NO ACTION` -> `CASCADE`/`SET NULL` changes applied now, or staged by table group.
