# Firebase Connectivity Recovery Guide

## Error: "TypeError: Failed to fetch" or "Could not reach Cloud Firestore backend"

This error indicates that the application cannot connect to Firebase Firestore. Here are the solutions:

### Immediate Solutions (for users):

1. **Refresh the page**: Most network connectivity issues resolve with a simple page refresh
   - Press `Ctrl+F5` (or `Cmd+Shift+R` on Mac) for a hard refresh

2. **Check network connection**: Ensure you have stable internet connectivity

3. **Wait a moment**: Firebase may be temporarily experiencing high load

### For Developers/Admins:

1. **Check Firebase Project Status**:
   - Visit [Firebase Status Dashboard](https://status.firebase.google.com/)
   - Check if there are any current outages

2. **Verify Firebase Configuration**:
   ```typescript
   // In client/lib/firebase.ts, ensure config is correct:
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     // ... other config
   };
   ```

3. **Check Firestore Rules**:
   ```javascript
   // firestore.rules should allow authenticated users:
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

4. **Deploy Rules if needed**:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Recovery Features in the App:

1. **Automatic Retry**: The notification system will automatically retry failed operations up to 3 times

2. **Offline Mode**: When Firebase is unavailable, the app continues to work but notifications may be delayed

3. **Connection Status**: The notification panel shows connection status and offers a refresh option

4. **Emergency Recovery**: Use the emergency recovery button if connection issues persist

### If Problems Persist:

1. Clear browser cache and cookies
2. Try accessing the app in an incognito/private browser window
3. Check if the Firebase project billing is up to date
4. Verify that the Firebase project is not suspended or deleted

### Error Patterns:

- `Failed to fetch`: Network connectivity issue
- `permission-denied`: Firestore rules not deployed or incorrect
- `unavailable`: Firebase service temporarily unavailable
- `failed-precondition`: Firebase database not initialized or misconfigured

The application includes automatic error handling and retry mechanisms, so most connectivity issues will resolve automatically.
