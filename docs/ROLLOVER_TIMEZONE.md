# Rollover Timezone Implementation

## Overview

The Kossabos platform now uses a "rollover timezone" of GMT+9:00 (Asia/Tokyo timezone) for all date tagging in DynamoDB. This ensures that daily boundaries for game events, leaderboards, and other time-based features roll over at a reasonable time for users in the US and Europe.

## What Changed

### Before
- All dates were calculated using the server's local timezone or UTC
- Day boundaries could occur at inconvenient times for users (e.g., mid-afternoon in the US)

### After
- All dates are calculated using GMT+9:00 (Asia/Tokyo timezone)
- Day boundaries occur at:
  - **US East Coast**: 11:00 AM EST / 12:00 PM EDT
  - **US West Coast**: 8:00 AM PST / 9:00 AM PDT  
  - **Europe (CET)**: 5:00 PM CET / 6:00 PM CEST

## Technical Implementation

### Updated Functions

1. **`getCurrentDay()`** - Now returns the current date in YYYY-MM-DD format using the rollover timezone
2. **`getDateFromTimestamp(timestamp)`** - Converts timestamps to dates using the rollover timezone
3. **New: `getCurrentDayInTimezone(timezone)`** - Get current date for any specific timezone
4. **New: `getCurrentTimeInRolloverTimezone()`** - Get current time in the rollover timezone

### Constants

- **`ROLLOVER_TIMEZONE`** - Exported constant set to 'Asia/Tokyo' (GMT+9:00)

### Dependencies

Added `date-fns-tz` package and upgraded `date-fns` to v4 for timezone support.

## Usage Examples

```typescript
import { getCurrentDay, ROLLOVER_TIMEZONE, getCurrentDayInTimezone } from '@/utils/date';

// Get current day using rollover timezone
const gameDay = getCurrentDay(); // e.g., "2025-07-05"

// Get current day for user's timezone  
const userDay = getCurrentDayInTimezone(user.timezone);

// Reference the rollover timezone
console.log(`Using rollover timezone: ${ROLLOVER_TIMEZONE}`);
```

## Impact on Services

### Event Service
- Events are now tagged with dates based on the rollover timezone
- Daily event queries use consistent date boundaries

### Leaderboard Service  
- Daily leaderboards reset at the rollover time
- Score submissions are tagged with dates using the rollover timezone

### I18n Service
- Translation versioning and timestamps remain in UTC for consistency
- Only date tagging uses the rollover timezone

## Benefits

1. **Consistent User Experience**: Daily resets happen at reasonable times for most users
2. **Global Fairness**: All users experience day boundaries at the same absolute time
3. **Operational Convenience**: Day boundaries occur during business hours in major markets
4. **Future Flexibility**: Easy to change the rollover timezone if needed

## Testing

Tests have been updated to account for timezone differences and edge cases around day boundaries. The test suite verifies:

- Correct date formatting in the rollover timezone
- Proper handling of timezone boundary cases
- Consistency across different timestamp scenarios

## Migration Notes

This change is backward compatible for existing data, as it only affects how new dates are calculated. Existing DynamoDB items with date tags will continue to work correctly.
