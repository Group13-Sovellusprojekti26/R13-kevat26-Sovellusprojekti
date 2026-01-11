# Firebase Cloud Functions for TaloFix

This directory contains Firebase Cloud Functions for the TaloFix backend.

## Available Functions

### Authentication Triggers
- **createUserProfile** - Automatically creates a user profile in Firestore when a new user signs up

### HTTP Callable Functions
- **updateFaultReportStatus** - Update the status of a fault report
- **getBuildingStats** - Get statistics for a building (total reports, status breakdown)

### Firestore Triggers
- **onFaultReportCreated** - Triggered when a new fault report is created (for notifications)

### Scheduled Functions
- **cleanupOldReports** - Runs daily to clean up closed reports older than 6 months

## Setup

1. Install dependencies:
   ```bash
   cd functions
   npm install
   ```

2. Build TypeScript:
   ```bash
   npm run build
   ```

3. Test locally with emulators:
   ```bash
   npm run serve
   ```

4. Deploy to Firebase:
   ```bash
   npm run deploy
   ```

## Development

- Source code is in `src/index.ts`
- Compiled JavaScript goes to `lib/`
- Use TypeScript for all functions
- Follow ESLint rules (Google style)

## Calling Functions from App

### Callable Functions
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const updateStatus = httpsCallable(functions, 'updateFaultReportStatus');

// Call the function
const result = await updateStatus({ 
  reportId: 'abc123', 
  status: 'in_progress' 
});
```

### Getting Stats
```typescript
const getStats = httpsCallable(functions, 'getBuildingStats');
const stats = await getStats({ buildingId: 'building123' });
console.log(stats.data); // { total: 10, open: 3, ... }
```

## Security

- All callable functions check authentication
- Use Firestore security rules for data access
- Never expose sensitive data in function responses

## Monitoring

View logs:
```bash
npm run logs
```

Or in Firebase Console: Functions > Logs
