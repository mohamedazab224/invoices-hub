const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const dataStore = require('../api/utils/dataStore');

async function initSystem() {
    console.log('🚀 Initializing Alazab Invoices Hub...');
    
    // Create default users
    const users = [
        {
            id: uuidv4(),
            username: 'admin',
            password: await bcrypt.hash('admin123', 10),
            name: 'المدير العام',
            role: 'admin',
            department: null,
            email: 'admin@al-azab.co'
        },
        {
            id: uuidv4(),
            username: 'eng_manager',
            password: await bcrypt.hash('eng123', 10),
            name: 'مدير الهندسة',
            role: 'manager',
            department: 'engineering',
            email: 'eng@al-azab.co'
        },
        {
            id: uuidv4(),
            username: 'acc_manager',
            password: await bcrypt.hash('acc123', 10),
            name: 'مدير الحسابات',
            role: 'manager',
            department: 'accounting',
            email: 'acc@al-azab.co'
        },
        {
            id: uuidv4(),
            username: 'pur_manager',
            password: await bcrypt.hash('pur123', 10),
            name: 'مدير المشتريات',
            role: 'manager',
            department: 'purchasing',
            email: 'pur@al-azab.co'
        }
    ];
    
    await dataStore.write('users', users);
    console.log('✅ Users created');
    
    // Create sample project
    const project = {
        id: uuidv4(),
        name: 'مشروع مول الأعزب التجاري',
        clientName: 'شركة التطوير العقاري',
        description: 'بناء مول تجاري متعدد الطوابق',
        status: 'active',
        startDate: '2024-01-01',
        magicplanId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    await dataStore.write('projects', [project]);
    console.log('✅ Sample project created');
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✨ System initialized successfully!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('Login credentials:');
    console.log('  👑 Admin: admin / admin123');
    console.log('  🏗️ Engineering: eng_manager / eng123');
    console.log('  💰 Accounting: acc_manager / acc123');
    console.log('  📦 Purchasing: pur_manager / pur123');
    console.log('');
}

initSystem().catch(console.error);
