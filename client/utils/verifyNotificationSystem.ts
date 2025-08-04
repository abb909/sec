/**
 * Verification test for the updated notification system
 * This file tests that notifications are properly filtered to exclude:
 * 1. The sender of the notification
 * 2. Superadmin users
 */

import { User } from '@shared/types';

export interface TestScenario {
  description: string;
  users: User[];
  currentUserId: string;
  farmAdminIds: string[];
  expectedFilteredIds: string[];
}

/**
 * Simulates the notification filtering logic
 */
export function filterNotificationRecipients(
  adminIds: string[],
  currentUserId: string,
  users: User[]
): string[] {
  return adminIds.filter(adminId => {
    // Don't send to the sender (current user)
    if (adminId === currentUserId) {
      console.log(`🚫 Skipping sender: ${adminId}`);
      return false;
    }
    
    // Don't send to superadmin
    const adminUser = users.find(u => u.uid === adminId);
    if (adminUser?.role === 'superadmin') {
      console.log(`🚫 Skipping superadmin: ${adminId}`);
      return false;
    }
    
    return true;
  });
}

/**
 * Test scenarios for notification filtering
 */
export const testScenarios: TestScenario[] = [
  {
    description: "Should exclude sender and superadmin",
    users: [
      { uid: "user1", email: "admin1@farm.com", role: "admin", fermeId: "farm1", nom: "Admin 1", telephone: "123" },
      { uid: "user2", email: "admin2@farm.com", role: "admin", fermeId: "farm1", nom: "Admin 2", telephone: "456" },
      { uid: "user3", email: "super@admin.com", role: "superadmin", nom: "Super Admin", telephone: "789" },
      { uid: "user4", email: "sender@farm.com", role: "admin", fermeId: "farm2", nom: "Sender", telephone: "000" }
    ],
    currentUserId: "user4", // sender
    farmAdminIds: ["user1", "user2", "user3", "user4"],
    expectedFilteredIds: ["user1", "user2"] // should exclude user3 (superadmin) and user4 (sender)
  },
  {
    description: "Should handle case with only superadmin and sender",
    users: [
      { uid: "user1", email: "super@admin.com", role: "superadmin", nom: "Super Admin", telephone: "789" },
      { uid: "user2", email: "sender@farm.com", role: "admin", fermeId: "farm2", nom: "Sender", telephone: "000" }
    ],
    currentUserId: "user2", // sender
    farmAdminIds: ["user1", "user2"],
    expectedFilteredIds: [] // should exclude both
  },
  {
    description: "Should include regular admin users",
    users: [
      { uid: "user1", email: "admin1@farm.com", role: "admin", fermeId: "farm1", nom: "Admin 1", telephone: "123" },
      { uid: "user2", email: "admin2@farm.com", role: "admin", fermeId: "farm1", nom: "Admin 2", telephone: "456" },
      { uid: "user3", email: "sender@farm.com", role: "admin", fermeId: "farm2", nom: "Sender", telephone: "000" }
    ],
    currentUserId: "user3", // sender
    farmAdminIds: ["user1", "user2"],
    expectedFilteredIds: ["user1", "user2"] // should include both admins
  }
];

/**
 * Run all test scenarios
 */
export function runNotificationFilterTests(): boolean {
  console.log("🧪 Running notification filter tests...");
  
  let allTestsPassed = true;
  
  testScenarios.forEach((scenario, index) => {
    console.log(`\n📝 Test ${index + 1}: ${scenario.description}`);
    
    const result = filterNotificationRecipients(
      scenario.farmAdminIds,
      scenario.currentUserId,
      scenario.users
    );
    
    const passed = JSON.stringify(result.sort()) === JSON.stringify(scenario.expectedFilteredIds.sort());
    
    console.log(`Expected: [${scenario.expectedFilteredIds.join(', ')}]`);
    console.log(`Got: [${result.join(', ')}]`);
    console.log(`Result: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (!passed) {
      allTestsPassed = false;
    }
  });
  
  console.log(`\n🏁 Overall result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  return allTestsPassed;
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testNotificationFiltering = runNotificationFilterTests;
}
