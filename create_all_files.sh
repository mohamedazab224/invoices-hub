#!/bin/bash

# This script will create ALL remaining files for the system

echo "🔨 Creating complete Alazab Invoices Hub system..."

# Create all remaining frontend HTML files
cat > public/dashboard.html << 'DASHBOARD'
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>لوحة التحكم | Alazab Hub</title>
    <link rel="icon" href="https://al-azab.co/logo/favicon.png">
    <link rel="stylesheet" href="/css/alazab.css">
    <script src="/js/auth.js"></script>
    <script src="/js/api.js"></script>
</head>
<body>
    <div id="app">Loading...</div>
    <script src="/js/dashboard.js"></script>
</body>
</html>
DASHBOARD

echo "✅ dashboard.html"

# Create JS helper files
mkdir -p public/js

cat > public/js/auth.js << 'AUTH_JS'
// Authentication Helper
function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

function checkAuth() {
    if (!getToken()) {
        window.location.href = '/';
        return false;
    }
    return true;
}

// Check auth on page load
if (window.location.pathname !== '/' && !getToken()) {
    window.location.href = '/';
}
AUTH_JS

echo "✅ auth.js"

cat > public/js/api.js << 'API_JS'
// API Client
const API_BASE = '/api';

async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    });
    
    if (response.status === 401) {
        logout();
        return;
    }
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'حدث خطأ');
    }
    
    return data;
}
API_JS

echo "✅ api.js"

# Create init script
cat > scripts/init-system.js << 'INIT_SCRIPT'
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
INIT_SCRIPT

echo "✅ init-system.js"

echo ""
echo "✨ All core files created!"
echo "📦 Ready for packaging..."

