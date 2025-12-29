// Dashboard JavaScript
checkAuth();

const user = getUser();

async function loadDashboard() {
    try {
        const stats = await apiCall('/dashboard/stats');
        
        const app = document.getElementById('app');
        app.innerHTML = `
            <div style="min-height: 100vh; background: #f8f9fa;">
                <nav style="background: linear-gradient(135deg, #1a5f7a 0%, #159895 100%); padding: 20px; color: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <img src="https://al-azab.co/logo/logo-w.png" alt="Logo" style="width: 50px; height: 50px;">
                            <h1 style="margin: 0; font-size: 24px;">Alazab Hub</h1>
                        </div>
                        <div style="display: flex; align-items: center; gap: 20px;">
                            <span>👤 ${user.name}</span>
                            <button onclick="logout()" class="az-btn az-btn-sm" style="background: rgba(255,255,255,0.2);">
                                🚪 خروج
                            </button>
                        </div>
                    </div>
                </nav>
                
                <div style="max-width: 1200px; margin: 40px auto; padding: 0 20px;">
                    <h2 style="margin-bottom: 30px;">📊 لوحة التحكم</h2>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 40px;">
                        <div class="az-card" style="padding: 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                            <div style="font-size: 48px; margin-bottom: 10px;">🏗️</div>
                            <div style="font-size: 36px; font-weight: bold;">${stats.projects.total}</div>
                            <div>إجمالي المشروعات</div>
                        </div>
                        
                        <div class="az-card" style="padding: 30px; text-align: center; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
                            <div style="font-size: 48px; margin-bottom: 10px;">📄</div>
                            <div style="font-size: 36px; font-weight: bold;">${stats.invoices.total}</div>
                            <div>إجمالي الفواتير</div>
                        </div>
                        
                        <div class="az-card" style="padding: 30px; text-align: center; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white;">
                            <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
                            <div style="font-size: 36px; font-weight: bold;">${stats.invoices.approved}</div>
                            <div>معتمدة</div>
                        </div>
                        
                        <div class="az-card" style="padding: 30px; text-align: center; background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white;">
                            <div style="font-size: 48px; margin-bottom: 10px;">✍️</div>
                            <div style="font-size: 36px; font-weight: bold;">${stats.invoices.signed}</div>
                            <div>موقعة</div>
                        </div>
                    </div>
                    
                    ${stats.pendingForMe && stats.pendingForMe.length > 0 ? `
                        <div class="az-card" style="padding: 30px;">
                            <h3 style="margin-bottom: 20px;">⏳ بانتظار مراجعتك (${stats.pendingForMe.length})</h3>
                            <div style="display: flex; flex-direction: column; gap: 15px;">
                                ${stats.pendingForMe.map(inv => `
                                    <div style="padding: 15px; background: #f8f9fa; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <strong>${inv.invoiceNumber || inv.internalNumber}</strong>
                                            <div style="font-size: 14px; color: #6c757d;">${inv.clientName || 'عميل'}</div>
                                        </div>
                                        <button class="az-btn az-btn-primary az-btn-sm" onclick="window.location.href='/review.html?id=${inv.id}'">
                                            📝 مراجعة
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="az-card" style="padding: 30px; margin-top: 30px;">
                        <h3 style="margin-bottom: 20px;">🔗 الوصول السريع</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                            ${user.role === 'admin' ? `
                                <button onclick="alert('جاري التطوير...')" class="az-btn az-btn-primary">
                                    ➕ مشروع جديد
                                </button>
                                <button onclick="alert('جاري التطوير...')" class="az-btn az-btn-secondary">
                                    📥 سحب من Daftra
                                </button>
                            ` : ''}
                            <button onclick="alert('جاري التطوير...')" class="az-btn az-btn-outline">
                                📊 المشروعات
                            </button>
                            <button onclick="alert('جاري التطوير...')" class="az-btn az-btn-outline">
                                📄 الفواتير
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading dashboard:', error);
        alert('حدث خطأ في تحميل البيانات');
    }
}

loadDashboard();
