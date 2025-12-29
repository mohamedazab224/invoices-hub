# 📘 دليل النشر والتشغيل - Alazab Invoices Hub

## 🎯 الهدف
تشغيل نظام Alazab Invoices Hub على خادم Linux

---

## 🖥️ متطلبات النظام

### الأساسيات
- ✅ Linux Server (Ubuntu 20.04+ أو CentOS 8+)
- ✅ Node.js 18+
- ✅ npm 9+
- ✅ 2GB RAM (الحد الأدنى)
- ✅ 10GB مساحة تخزين

### اختياري (للإنتاج)
- Nginx (كـ Reverse Proxy)
- PM2 (لإدارة العمليات)
- SSL Certificate (Let's Encrypt)

---

## 🚀 خطوات التشغيل

### 1. رفع الملفات للخادم

\`\`\`bash
# على جهازك المحلي
scp alazab-invoices-hub-v1.0.0.tar.gz user@server:/home/user/

# على الخادم
cd /home/user
tar -xzf alazab-invoices-hub-v1.0.0.tar.gz
cd alazab-invoices-hub
\`\`\`

### 2. تثبيت Node.js (إذا لم يكن مثبت)

\`\`\`bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# تحقق من التثبيت
node --version
npm --version
\`\`\`

### 3. تثبيت المكتبات

\`\`\`bash
npm install
\`\`\`

### 4. تهيئة النظام

\`\`\`bash
# إنشاء المستخدمين والبيانات الأولية
npm run init
\`\`\`

### 5. تشغيل النظام

#### أ) تشغيل مباشر (للتجربة)
\`\`\`bash
npm start
\`\`\`

#### ب) تشغيل مع PM2 (للإنتاج)
\`\`\`bash
# تثبيت PM2
sudo npm install -g pm2

# تشغيل التطبيق
pm2 start api/server.js --name alazab-hub

# حفظ التكوين
pm2 save

# تشغيل تلقائي عند إعادة تشغيل الخادم
pm2 startup
\`\`\`

---

## 🔧 إعداد Nginx (اختياري)

### 1. تثبيت Nginx

\`\`\`bash
sudo apt install nginx
\`\`\`

### 2. إنشاء ملف التكوين

\`\`\`bash
sudo nano /etc/nginx/sites-available/alazab-hub
\`\`\`

### 3. إضافة التكوين

\`\`\`nginx
server {
    listen 80;
    server_name invoices.alazab.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
\`\`\`

### 4. تفعيل التكوين

\`\`\`bash
sudo ln -s /etc/nginx/sites-available/alazab-hub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
\`\`\`

---

## 🔐 إعداد SSL (Let's Encrypt)

\`\`\`bash
# تثبيت Certbot
sudo apt install certbot python3-certbot-nginx

# الحصول على الشهادة
sudo certbot --nginx -d invoices.alazab.com

# التجديد التلقائي
sudo certbot renew --dry-run
\`\`\`

---

## 🔄 تحديث النظام

\`\`\`bash
# إيقاف التطبيق
pm2 stop alazab-hub

# سحب التحديثات
# (استبدال الملفات)

# تثبيت المكتبات الجديدة
npm install

# إعادة التشغيل
pm2 restart alazab-hub
\`\`\`

---

## 📊 المراقبة والصيانة

### عرض السجلات

\`\`\`bash
# سجلات PM2
pm2 logs alazab-hub

# سجلات النظام
tail -f logs/app.log
\`\`\`

### حالة التطبيق

\`\`\`bash
pm2 status
pm2 monit
\`\`\`

### النسخ الاحتياطي

\`\`\`bash
# نسخ احتياطي للبيانات
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# جدولة نسخ احتياطي يومي
crontab -e
# أضف: 0 2 * * * cd /path/to/alazab-hub && tar -czf backup-$(date +\%Y\%m\%d).tar.gz data/
\`\`\`

---

## 🐛 حل المشاكل

### المنفذ 3000 مستخدم
\`\`\`bash
# تغيير المنفذ في ملف .env
PORT=3001
\`\`\`

### خطأ في الصلاحيات
\`\`\`bash
# إعطاء صلاحيات للمجلدات
chmod -R 755 data uploads logs
\`\`\`

### التطبيق لا يعمل بعد إعادة التشغيل
\`\`\`bash
# التحقق من PM2 startup
pm2 startup
pm2 save
\`\`\`

---

## 📧 الدعم

للمساعدة:
- 📧 Email: info@al-azab.co
- 🌐 Website: https://al-azab.co

---

**نجاح التشغيل! 🎉**
