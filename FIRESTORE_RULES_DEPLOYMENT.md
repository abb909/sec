# Firestore Rules Deployment

The notification system requires new Firestore security rules to be deployed.

## Quick Fix

The "Failed to fetch" error occurs because the `notifications` collection doesn't have proper security rules defined.

### Option 1: Deploy via Firebase CLI (Recommended)

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy only the Firestore rules
firebase deploy --only firestore:rules

# Deploy both rules and indexes
firebase deploy --only firestore
```

### Option 2: Manual Deployment via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (`secteur-25`)
3. Navigate to **Firestore Database** → **Rules**
4. Copy the contents of `firestore.rules` from this project
5. Paste into the Firebase Console rules editor
6. Click **Publish**

### Option 3: Temporary Fix (Development Only)

For immediate testing, you can temporarily modify the rules to allow all writes:

```javascript
// TEMPORARY - DO NOT USE IN PRODUCTION
match /notifications/{notificationId} {
  allow read, write: if request.auth != null;
}
```

## Current Rules Status

The project now includes proper rules for:
- ✅ `notifications` collection - Users can read their own, admins can write
- ✅ `transfer_notifications` collection  
- ✅ `stock_alerts` collection
- ✅ All existing collections (workers, fermes, rooms, etc.)

## Verification

After deployment, test the notification system:
1. Try to register a worker that exists in another farm
2. Check if notifications appear in the notification bell
3. Verify popup notifications work for urgent priority

## Error Handling

The system now includes:
- ✅ Offline detection
- ✅ Permission error handling  
- ✅ Network error graceful degradation
- ✅ Silent failure to prevent UI breaks
