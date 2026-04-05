بدي  # Provider Backend Validation Fixes - TODO

## Status: In Progress

### Step 1: [✅] Enhance CreateProviderDto with @IsNotEmpty(), @Transform(trim), stricter enum/phone validation

- File: waynest-be/src/modules/providers/dto/create-provider.dto.ts

### Step 2: [✅] Update providers.service.ts: add trimming, early city validation in create/updateOwnProfile

- File: waynest-be/src/modules/providers/providers.service.ts

### Step 3: [ ] Confirm Global ValidationPipe in main.ts

- File: waynest-be/src/main.ts
- Run: npm i class-validator class-transformer (if missing)

### Step 4: [ ] Test endpoints (restart server)

- POST providers (admin create)
- PATCH /providers/my (user update)
- Verify error messages for invalid data

### Step 5: [ ] Frontend alignment if needed (forms send city name string, exact enums)

- Check provider forms

### Step 6: [X] Complete - attempt_completion

**Next Action: Step 3 - Global ValidationPipe confirmed (already present in main.ts)**
