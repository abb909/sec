import { testNotificationCreation } from './testNotificationCreation';

export const simulateWorkerConflict = async (
  currentUser: any,
  sendNotification: any,
  allWorkers: any[],
  fermes: any[]
) => {
  console.log('🧪 Starting worker conflict simulation...');
  
  try {
    // Step 1: Check if we have active workers from different farms
    const activeWorkersFromOtherFarms = allWorkers.filter(w => 
      w.statut === 'actif' && 
      w.fermeId !== currentUser?.fermeId
    );
    
    console.log('👥 Found active workers from other farms:', activeWorkersFromOtherFarms.length);
    
    if (activeWorkersFromOtherFarms.length === 0) {
      console.log('ℹ️ No active workers from other farms found for testing');
      return { success: false, reason: 'No test data available' };
    }
    
    // Step 2: Pick the first worker for simulation
    const testWorker = activeWorkersFromOtherFarms[0];
    const testWorkerFarm = fermes.find(f => f.id === testWorker.fermeId);
    
    console.log('🎯 Using test worker:', {
      name: testWorker.nom,
      cin: testWorker.cin,
      currentFarm: testWorkerFarm?.nom,
      farmId: testWorker.fermeId
    });
    
    // Step 3: Simulate the notification sending
    if (!testWorkerFarm || !testWorkerFarm.admins || testWorkerFarm.admins.length === 0) {
      console.warn('⚠️ Test farm has no admins:', testWorkerFarm?.nom);
      return { success: false, reason: 'Test farm has no admins' };
    }
    
    // Step 4: Send test notifications to the farm's admins
    const attemptingFarmName = fermes.find(f => f.id === currentUser?.fermeId)?.nom || 'Ferme de test';
    
    for (const adminId of testWorkerFarm.admins) {
      console.log(`📤 Sending test notification to admin: ${adminId}`);
      
      try {
        const notificationId = await sendNotification({
          type: 'worker_duplicate',
          title: '🧪 TEST - Tentative d\'enregistrement d\'un ouvrier actif',
          message: `[TEST] L'ouvrier ${testWorker.nom} (CIN: ${testWorker.cin}) est déjà actif dans votre ferme "${testWorkerFarm.nom}" mais quelqu'un de "${attemptingFarmName}" tente de l'enregistrer. CECI EST UN TEST.`,
          recipientId: adminId,
          recipientFermeId: testWorkerFarm.id,
          status: 'unread',
          priority: 'urgent',
          actionData: {
            workerId: testWorker.id,
            workerName: testWorker.nom,
            workerCin: testWorker.cin,
            requesterFermeId: currentUser?.fermeId,
            requesterFermeName: attemptingFarmName,
            actionRequired: '[TEST] Ceci est une notification de test',
            actionUrl: `/workers/${testWorker.id}`
          }
        });
        
        console.log(`✅ Test notification sent to ${adminId}:`, notificationId);
      } catch (error) {
        console.error(`❌ Failed to send test notification to ${adminId}:`, error);
        throw error;
      }
    }
    
    return { 
      success: true, 
      testWorker: testWorker.nom,
      testFarm: testWorkerFarm.nom,
      adminCount: testWorkerFarm.admins.length
    };
    
  } catch (error) {
    console.error('❌ Worker conflict simulation failed:', error);
    throw error;
  }
};
