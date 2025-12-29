#!/bin/bash

#################################################
# سكريبت إعداد Volume التخزين لنظام الأعزب
# 20 GB مخصصة للنظام
#################################################

echo "🔍 فحص الأقراص المتاحة..."
echo "================================"
lsblk
echo ""

# التحقق من وجود Volume
if lsblk | grep -q "sdb"; then
    VOLUME_DEVICE="/dev/sdb"
    echo "✅ تم العثور على Volume: $VOLUME_DEVICE"
else
    echo "⚠️  لم يتم العثور على /dev/sdb، جاري البحث عن أقراص أخرى..."
    lsblk
    echo ""
    echo "❓ الرجاء تحديد اسم القرص (مثل: sdb، vdb، xvdb):"
    read VOLUME_DEVICE
    VOLUME_DEVICE="/dev/$VOLUME_DEVICE"
fi

echo ""
echo "📊 معلومات القرص المختار:"
echo "================================"
lsblk $VOLUME_DEVICE

echo ""
echo "⚠️  تحذير: هذا السكريبت سيقوم بـ:"
echo "   1. تهيئة القرص (format) - ستفقد أي بيانات موجودة"
echo "   2. إنشاء نظام ملفات ext4"
echo "   3. تركيب القرص على /mnt/alazab-storage"
echo ""
echo "❓ هل تريد المتابعة؟ (yes/no)"
read CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ تم الإلغاء"
    exit 1
fi

echo ""
echo "🔨 بدء الإعداد..."
echo "================================"

# 1. إلغاء تركيب القرص إذا كان مركباً
echo "1️⃣ إلغاء تركيب القرص (إن وجد)..."
umount $VOLUME_DEVICE 2>/dev/null || true
umount ${VOLUME_DEVICE}1 2>/dev/null || true

# 2. تهيئة القرص بنظام ext4
echo "2️⃣ تهيئة القرص بنظام ext4..."
mkfs.ext4 -F $VOLUME_DEVICE

# 3. إنشاء نقطة التركيب
echo "3️⃣ إنشاء مجلد التركيب..."
mkdir -p /mnt/alazab-storage

# 4. تركيب القرص
echo "4️⃣ تركيب القرص..."
mount $VOLUME_DEVICE /mnt/alazab-storage

# 5. التحقق من التركيب
if mountpoint -q /mnt/alazab-storage; then
    echo "✅ تم تركيب القرص بنجاح!"
else
    echo "❌ فشل تركيب القرص"
    exit 1
fi

# 6. إنشاء هيكل المجلدات
echo "5️⃣ إنشاء هيكل المجلدات..."
mkdir -p /mnt/alazab-storage/invoices/{2025,2026,2027}
mkdir -p /mnt/alazab-storage/projects
mkdir -p /mnt/alazab-storage/backups/weekly
mkdir -p /mnt/alazab-storage/temp/downloads

# 7. تعيين الصلاحيات
echo "6️⃣ تعيين الصلاحيات..."
chown -R www-data:www-data /mnt/alazab-storage
chmod -R 755 /mnt/alazab-storage

# 8. إضافة التركيب التلقائي عند الإقلاع
echo "7️⃣ إعداد التركيب التلقائي..."
VOLUME_UUID=$(blkid -s UUID -o value $VOLUME_DEVICE)
echo "UUID=$VOLUME_UUID /mnt/alazab-storage ext4 defaults,nofail 0 2" >> /etc/fstab

# 9. إنشاء رابط رمزي للوصول السريع
echo "8️⃣ إنشاء رابط رمزي..."
ln -sf /mnt/alazab-storage /var/www/alazab-invoices-hub/storage

echo ""
echo "✅ تم إعداد Volume التخزين بنجاح!"
echo "================================"
echo ""
echo "📊 معلومات القرص:"
df -h /mnt/alazab-storage
echo ""
echo "📁 هيكل المجلدات:"
tree -L 2 /mnt/alazab-storage || ls -la /mnt/alazab-storage
echo ""
echo "🔗 الرابط الرمزي:"
ls -la /var/www/alazab-invoices-hub/storage
echo ""
echo "✅ جاهز للاستخدام!"
