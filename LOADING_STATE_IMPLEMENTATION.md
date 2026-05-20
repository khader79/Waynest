# Loading State & Message Delivery Status Implementation Guide

## Overview

Complete system for tracking loading states and message delivery status throughout the Waynest app. Includes backend API endpoints, frontend hooks, components, and global loading context.

## Backend Changes

### 1. Message Entity (`waynest-be/src/modules/chat/entities/message.entity.ts`)

- Added `deliveryStatus` column with enum: `'pending' | 'sent' | 'delivered' | 'seen'`
- Default value: `'pending'`
- Used to track message lifecycle from sending to being seen by recipients

### 2. Migration (`waynest-be/src/migrations/20260520130000-AddMessageDeliveryStatus.ts`)

- Creates ENUM type for delivery status
- Adds `delivery_status` column to `messages` table
- Creates index `idx_messages_delivery_status` for query optimization
- Non-transactional to support PostgreSQL ENUM creation

### 3. DTO (`waynest-be/src/modules/chat/dto/update-message-delivery-status.dto.ts`)

```typescript
export class UpdateMessageDeliveryStatusDto {
  deliveryStatus: "sent" | "delivered" | "seen";
}
```

### 4. Controller Endpoint (`waynest-be/src/modules/chat/chat.controller.ts`)

```typescript
@Patch('messages/:id/delivery-status')
updateMessageDeliveryStatus(
  @Request() req: AuthRequest,
  @Param('id') id: string,
  @Body() dto: UpdateMessageDeliveryStatusDto,
) {
  return this.chatService.updateMessageDeliveryStatus(id, req.user.sub, dto);
}
```

### 5. Service Method (`waynest-be/src/modules/chat/chat.service.ts`)

```typescript
async updateMessageDeliveryStatus(
  messageId: string,
  actorId: string,
  dto: { deliveryStatus: 'sent' | 'delivered' | 'seen' },
): Promise<{ updated: boolean; deliveryStatus: string }>
```

- Finds message by ID
- Verifies user is conversation member
- Updates delivery status in database
- Emits WebSocket event to conversation members for real-time updates

### 6. API Route

**Endpoint**: `PATCH /messaging/messages/:id/delivery-status`
**Body**: `{ deliveryStatus: 'sent' | 'delivered' | 'seen' }`
**Response**: `{ updated: true, deliveryStatus: 'delivered' }`

## Frontend Changes

### 1. Hooks

#### `useLoading()` Hook

```typescript
import { useLoading } from '@/hooks/useLoading';

// Usage
const {
  isLoading,     // (key?: string) => boolean
  getError,      // (key: string) => string
  startLoading,  // (key: string) => void
  stopLoading,   // (key: string) => void
  executeAsync,  // <T,>(key, asyncFn) => Promise
} = useLoading();

// Track operation
const { success, data } = await loading.executeAsync('save-event', async () => {
  return await createCalendarEntry(...)
});
```

#### `useMessageStatus()` Hook

```typescript
import { useMessageStatus } from "@/hooks/useMessageStatus";

// Usage
const {
  status, // 'pending' | 'sent' | 'delivered' | 'seen'
  isUpdating, // boolean
  error, // string | null
  updateStatus, // (messageId, newStatus) => Promise
  setStatus, // (newStatus) => void
} = useMessageStatus("pending");

// Update message delivery status
await messageStatus.updateStatus(messageId, "delivered");
```

### 2. Context

#### `LoadingProvider`

```typescript
import { LoadingProvider, useGlobalLoading } from '@/context/LoadingContext';

// Wrap app in provider (already done in App.jsx)
<LoadingProvider>
  <YourApp />
</LoadingProvider>

// Use in components
const { isLoading, startLoading, stopLoading } = useGlobalLoading();
```

### 3. Components

#### `MessageStatusIndicator`

```typescript
import { MessageStatusIndicator } from '@/components/chat/MessageStatusIndicator';

// Usage
<MessageStatusIndicator
  status="delivered"  // 'pending' | 'sent' | 'delivered' | 'seen'
  isLoading={false}   // optional: show loading spinner
/>
```

**Visual Indicators**:

- ⏳ pending: Rotating loader
- ✓ sent: Single checkmark (blue)
- ✓✓ delivered: Double checkmark (blue)
- 👁 seen: Eye icon (green)

### 4. Integration Points

#### Calendar Component

```typescript
// Show loading on "Add item" button
<button
  disabled={loading.isLoading('create-event')}
>
  {loading.isLoading('create-event') ? '...' : 'Add Item'}
</button>

// Handle save with loading state
const handleSave = async () => {
  await loading.executeAsync('create-event', async () => {
    return await createCalendarEntry(data);
  });
};
```

#### Message Component (MessengerHub.jsx)

- Already integrated: `MessageStatusIndicator` displayed in message meta
- Shows delivery status next to message timestamp
- Only visible for sent messages (right side)
- Real-time updates via WebSocket

## Database Schema

### messages table

```sql
ALTER TABLE messages ADD COLUMN delivery_status VARCHAR(20);
CREATE INDEX idx_messages_delivery_status ON messages(delivery_status);
```

### Enum values

- `pending`: Message queued for sending
- `sent`: Message successfully sent to server
- `delivered`: Message delivered to recipient's device
- `seen`: Message read by recipient

## WebSocket Events

### Backend Emits

```typescript
// When delivery status updates
emitMessageStatusUpdated(
  conversationId,
  {
    messageId,
    deliveryStatus,
    updatedAt,
  },
  memberUserIds,
);
```

### Frontend Listens

```typescript
socket.on("messageStatusUpdated", (data) => {
  // Update message delivery status in UI
  setMessages((prev) =>
    prev.map((m) =>
      m.id === data.messageId
        ? { ...m, deliveryStatus: data.deliveryStatus }
        : m,
    ),
  );
});
```

## Migration Steps

### 1. Backend Setup

```bash
cd waynest-be
npm run migration:run
```

### 2. API Testing

```bash
# Update message delivery status
curl -X PATCH http://localhost:3001/messaging/messages/{id}/delivery-status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"deliveryStatus":"delivered"}'
```

### 3. Frontend Integration

- Message status already integrated in MessengerHub
- No additional setup needed
- Automatic real-time updates via WebSocket

## Usage Examples

### Calendar Loading State

```typescript
const { executeAsync, isLoading } = useLoading();

const handleAddItem = async () => {
  const result = await executeAsync("calendar-add", async () => {
    return await createCalendarEntry(itemData);
  });

  if (result.success) {
    toast.success("Item added");
  } else {
    toast.error(result.error);
  }
};
```

### Message Delivery Tracking

```typescript
// In message sending
const { updateStatus } = useMessageStatus("pending");

const handleSendMessage = async () => {
  // 1. Send message (status: pending)
  const message = await sendMessage(content);

  // 2. Mark as sent
  await updateStatus(message.id, "sent");

  // 3. On receipt, mark as delivered
  onMessageReceived(() => {
    updateStatus(message.id, "delivered");
  });
};
```

## Performance Considerations

1. **Loading State Batching**: Use single context for app-wide loading vs per-operation hooks
2. **WebSocket Real-time**: Delivery status updates stream in real-time without polling
3. **Database Index**: `idx_messages_delivery_status` ensures fast queries on delivery status
4. **Lazy Component Rendering**: MessageStatusIndicator only renders for own messages

## Error Handling

```typescript
const { executeAsync, getError } = useLoading();

const result = await executeAsync("operation-key", async () => {
  // operation code
});

if (!result.success) {
  const errorMsg = getError("operation-key");
  toast.error(errorMsg);
}
```

## Testing Checklist

- [ ] Run migration: `npm run migration:run` in waynest-be
- [ ] Verify ENUM type in PostgreSQL
- [ ] Test PATCH endpoint with valid/invalid delivery status
- [ ] Test message displays delivery indicator
- [ ] Verify real-time WebSocket updates
- [ ] Test loading state in calendar component
- [ ] Verify no console errors in frontend

## Future Enhancements

1. **Message Read Receipts**: Automatically mark delivered→seen when message viewed
2. **Batch Status Updates**: Group multiple message updates into single API call
3. **Offline Support**: Queue delivery status updates, sync when online
4. **Analytics**: Track message delivery metrics for troubleshooting
5. **Retry Logic**: Auto-retry failed delivery status updates
