/**
 * Test utility to validate cross-farm duplicate notifications
 * This helps ensure notifications are sent only to the correct farm admins
 * and excludes superadmin users as per requirements.
 */

import { User, Ferme, Worker } from '@shared/types';

export interface NotificationTestResult {
  shouldReceiveNotification: boolean;
  reason: string;
  userId: string;
  userRole?: string;
  farmName?: string;
}

/**
 * Test which users should receive notifications when a cross-farm duplicate is detected
 */
export const testCrossFarmNotificationRecipients = (
  duplicateWorker: Worker,
  currentFarm: Ferme,
  attemptingUser: User,
  allUsers: User[]
): NotificationTestResult[] => {
  const results: NotificationTestResult[] = [];

  if (!currentFarm.admins || currentFarm.admins.length === 0) {
    return [{
      shouldReceiveNotification: false,
      reason: 'No admins found for the farm where worker is currently active',
      userId: 'none',
    }];
  }

  // Test each admin of the farm where the worker is currently active
  for (const adminId of currentFarm.admins) {
    const adminUser = allUsers.find(u => u.uid === adminId);
    
    let shouldReceive = true;
    let reason = `Admin of ${currentFarm.nom} where worker is currently active`;

    // Exclude the user who is attempting to register (shouldn't be admin of current farm anyway)
    if (adminId === attemptingUser.uid) {
      shouldReceive = false;
      reason = 'User attempting to register the worker (should not be admin of current farm)';
    }
    
    // Exclude superadmin users
    else if (adminUser?.role === 'superadmin') {
      shouldReceive = false;
      reason = 'Superadmin users should not receive these notifications';
    }
    
    // Include regular farm admins
    else if (adminUser?.role === 'admin') {
      shouldReceive = true;
      reason = `Farm admin of ${currentFarm.nom} - should be notified about worker conflict`;
    }
    
    // Handle case where user not found
    else if (!adminUser) {
      shouldReceive = false;
      reason = 'Admin user not found in users collection';
    }

    results.push({
      shouldReceiveNotification: shouldReceive,
      reason,
      userId: adminId,
      userRole: adminUser?.role,
      farmName: currentFarm.nom
    });
  }

  return results;
};

/**
 * Test the overall notification flow for cross-farm duplicates
 */
export const testCrossFarmNotificationFlow = (
  duplicateWorker: Worker,
  currentFarm: Ferme,
  attemptingFarm: Ferme,
  attemptingUser: User,
  allUsers: User[],
  allFarms: Ferme[]
): {
  isValidScenario: boolean;
  expectedRecipients: NotificationTestResult[];
  summary: string;
} => {
  // Validate scenario
  const isValidScenario = (
    duplicateWorker.statut === 'actif' &&
    duplicateWorker.fermeId === currentFarm.id &&
    duplicateWorker.fermeId !== attemptingFarm.id &&
    !duplicateWorker.dateSortie // Worker hasn't exited yet
  );

  if (!isValidScenario) {
    return {
      isValidScenario: false,
      expectedRecipients: [],
      summary: 'Invalid scenario - worker must be active in current farm without exit date'
    };
  }

  const recipients = testCrossFarmNotificationRecipients(
    duplicateWorker,
    currentFarm,
    attemptingUser,
    allUsers
  );

  const validRecipients = recipients.filter(r => r.shouldReceiveNotification);
  const excludedRecipients = recipients.filter(r => !r.shouldReceiveNotification);

  const summary = `
Cross-farm duplicate detected:
- Worker: ${duplicateWorker.nom} (CIN: ${duplicateWorker.cin})
- Currently active in: ${currentFarm.nom}
- Attempted registration from: ${attemptingFarm.nom}
- Valid recipients: ${validRecipients.length}
- Excluded recipients: ${excludedRecipients.length}
- Total admins in current farm: ${currentFarm.admins?.length || 0}

Recipients who SHOULD receive notification:
${validRecipients.map(r => `  • ${r.userId} (${r.userRole}) - ${r.reason}`).join('\n')}

Recipients who should NOT receive notification:
${excludedRecipients.map(r => `  • ${r.userId} (${r.userRole}) - ${r.reason}`).join('\n')}
  `.trim();

  return {
    isValidScenario: true,
    expectedRecipients: recipients,
    summary
  };
};

/**
 * Console test helper - run this to validate the notification logic
 */
export const runCrossFarmNotificationTest = (
  workerData: Worker,
  farmData: Ferme,
  userData: User,
  allUsers: User[],
  allFarms: Ferme[]
) => {
  console.log('🧪 Testing Cross-Farm Notification System');
  console.log('=' .repeat(50));
  
  const attemptingFarm = allFarms.find(f => f.id === userData.fermeId);
  if (!attemptingFarm) {
    console.error('❌ Attempting user farm not found');
    return;
  }

  const testResult = testCrossFarmNotificationFlow(
    workerData,
    farmData,
    attemptingFarm,
    userData,
    allUsers,
    allFarms
  );

  console.log(testResult.summary);
  
  if (testResult.isValidScenario) {
    console.log('\n✅ Test completed - review recipients above');
  } else {
    console.log('\n❌ Invalid test scenario');
  }
  
  return testResult;
};
