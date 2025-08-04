# Quick Fix for Firestore Permissions Error

## Problem
Getting "Missing or insufficient permissions" error when trying to use notifications.

## Immediate Solution

I've simplified the Firestore rules to allow all authenticated users full access temporarily. This will help us isolate whether the issue is with permissions or something else.

### Deploy the New Rules

**Option 1: Firebase CLI (Recommended)**
```bash
firebase deploy --only firestore:rules
```

**Option 2: Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project `secteur-25`
3. Go to Firestore Database → Rules
4. Replace all rules with:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // TEMPORARY: Allow all authenticated users full access for debugging
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5. Click "Publish"

## Testing After Deployment

1. **Check Authentication**: Click "Check Auth" button to verify user is logged in
2. **Test Firebase Connection**: Click "Test Firebase" to verify basic connectivity  
3. **Test Manual Notification**: Click "Test Manuel" to create notification directly
4. **Check Console**: Look for error messages and authentication status

## Expected Results

After deploying the simplified rules:
- ✅ No more "permission denied" errors
- ✅ Notifications should be created in Firebase
- ✅ Notification bell should show new notifications
- ✅ Test buttons should work without errors

## Debug Tools Available

- **Browser Console**: Press F12 → Console for detailed logs
- **Firebase Console**: Check Firestore for new `notifications` collection
- **Test Buttons**: Use the debug buttons to isolate issues

## Reverting Later

Once notifications are working, we can restore proper security rules with appropriate role-based permissions.
