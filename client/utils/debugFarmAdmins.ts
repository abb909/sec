import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const debugFarmAdminData = async () => {
  console.log('🔍 Debugging farm admin data...');
  
  try {
    // Get all farms
    const farmesQuery = query(collection(db, 'fermes'));
    const farmesSnapshot = await getDocs(farmesQuery);
    const fermes = farmesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get all users
    const usersQuery = query(collection(db, 'users'));
    const usersSnapshot = await getDocs(usersQuery);
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log('📊 Farm Admin Analysis:');
    console.log('======================');

    fermes.forEach(farm => {
      console.log(`\n🏢 Farm: ${farm.nom} (ID: ${farm.id})`);
      console.log('Admin field analysis:', {
        admins: farm.admins,
        adminsType: typeof farm.admins,
        adminsLength: farm.admins?.length || 0,
        isArray: Array.isArray(farm.admins),
        allFields: Object.keys(farm)
      });

      if (farm.admins && Array.isArray(farm.admins)) {
        console.log(`👥 Admin IDs (${farm.admins.length}):`, farm.admins);
        
        // Check if these admin IDs correspond to actual users
        farm.admins.forEach(adminId => {
          const user = users.find(u => u.id === adminId || u.uid === adminId);
          if (user) {
            console.log(`  ✅ ${adminId} → ${user.nom} (${user.email}) - Role: ${user.role}`);
          } else {
            console.log(`  ❌ ${adminId} → User not found`);
          }
        });
      } else {
        console.log('❌ No valid admins array found');
      }
    });

    // Summary
    const farmsWithAdmins = fermes.filter(f => f.admins && Array.isArray(f.admins) && f.admins.length > 0);
    const totalAdmins = farmsWithAdmins.reduce((sum, farm) => sum + farm.admins.length, 0);
    
    console.log('\n📈 Summary:');
    console.log(`• Total farms: ${fermes.length}`);
    console.log(`• Farms with admins: ${farmsWithAdmins.length}`);
    console.log(`• Total admin assignments: ${totalAdmins}`);
    console.log(`• Users with admin role: ${users.filter(u => u.role === 'admin').length}`);

    return {
      fermes,
      users,
      summary: {
        totalFarms: fermes.length,
        farmsWithAdmins: farmsWithAdmins.length,
        totalAdminAssignments: totalAdmins,
        adminUsers: users.filter(u => u.role === 'admin').length
      }
    };

  } catch (error) {
    console.error('❌ Failed to debug farm admin data:', error);
    throw error;
  }
};

export const checkSpecificFarmAdmins = async (farmId: string) => {
  console.log(`🔍 Checking admins for farm: ${farmId}`);
  
  try {
    const farmesQuery = query(collection(db, 'fermes'));
    const farmesSnapshot = await getDocs(farmesQuery);
    const farm = farmesSnapshot.docs.find(doc => doc.id === farmId);
    
    if (!farm) {
      console.error(`❌ Farm ${farmId} not found`);
      return null;
    }
    
    const farmData = farm.data();
    console.log('🏢 Farm data:', farmData);
    
    if (!farmData.admins || !Array.isArray(farmData.admins)) {
      console.error('❌ No admins array found in farm data');
      return null;
    }
    
    console.log(`👥 Found ${farmData.admins.length} admin(s):`, farmData.admins);
    return {
      farmId,
      farmName: farmData.nom,
      admins: farmData.admins,
      adminCount: farmData.admins.length
    };
    
  } catch (error) {
    console.error(`❌ Failed to check farm ${farmId} admins:`, error);
    throw error;
  }
};
