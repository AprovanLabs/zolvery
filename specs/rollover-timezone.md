# Rollover Timezone Implementation

## Overview

The Kossabos platform uses a "rollover timezone" of GMT+9:00 (Asia/Tokyo timezone) for all date tagging in DynamoDB. This ensures that daily boundaries for game events, leaderboards, and other time-based features roll over at a reasonable time for users in the US and Europe.

- All dates are calculated using GMT+9:00 (Asia/Tokyo timezone)
- Day boundaries occur at:
  - **US East Coast**: 11:00 AM EST / 12:00 PM EDT
  - **US West Coast**: 8:00 AM PST / 9:00 AM PDT  
  - **Europe (CET)**: 5:00 PM CET / 6:00 PM CEST
