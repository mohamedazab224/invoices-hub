/**
 * API Routes لسحب الفواتير من دفترة
 * POST /api/invoices/sync-from-daftra
 */

const express = require('express');
const router = express.Router();
const DaftraPDFDownloader = require('../utils/daftra-pdf-downloader');
const StorageManager = require('../utils/storage-manager');
const dataStore = require('../utils/dataStore');
const { auth, authorize } = require('../middleware/auth');

/**
 * سحب فاتورة واحدة من دفترة
 * POST /api/invoices/sync-from-daftra
 */
router.post('/sync-from-daftra', auth, authorize('admin'), async (req, res) => {
  try {
    const { invoiceNumber } = req.body;
    
    if (!invoiceNumber) {
      return res.status(400).json({ error: 'رقم الفاتورة مطلوب' });
    }
    
    console.log(`\n📥 طلب سحب فاتورة: ${invoiceNumber}`);
    console.log(`👤 المستخدم: ${req.user.username}`);
    
    // التحقق من أن الفاتورة غير موجودة مسبقاً
    const existing = await dataStore.findOne('invoices', { invoiceNumber });
    
    if (existing && existing.syncedFromDaftra) {
      return res.status(400).json({
        error: 'الفاتورة موجودة مسبقاً',
        invoice: existing
      });
    }
    
    // سحب الفاتورة من دفترة
    const result = await DaftraPDFDownloader.syncInvoice(invoiceNumber);
    
    // حفظ أو تحديث الفاتورة في قاعدة البيانات
    let invoice;
    
    if (existing) {
      // تحديث فاتورة موجودة
      invoice = await dataStore.update('invoices', existing.id, {
        syncedFromDaftra: true,
        daftraInvoiceId: result.invoiceId,
        documents: {
          ...existing.documents,
          ...result.files.reduce((acc, file) => {
            acc[file.type] = file.path;
            return acc;
          }, {})
        },
        lastSyncedAt: new Date().toISOString()
      });
    } else {
      // إنشاء فاتورة جديدة
      invoice = await dataStore.create('invoices', {
        id: require('uuid').v4(),
        invoiceNumber: invoiceNumber,
        daftraInvoiceId: result.invoiceId,
        clientName: result.invoiceDetails.client,
        total: result.invoiceDetails.total,
        date: result.invoiceDetails.date,
        status: 'synced',
        syncedFromDaftra: true,
        documents: result.files.reduce((acc, file) => {
          acc[file.type] = file.path;
          return acc;
        }, {}),
        createdAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString()
      });
    }
    
    // تسجيل في Audit Log
    await dataStore.create('audit-logs', {
      id: require('uuid').v4(),
      userId: req.user.id,
      username: req.user.username,
      action: 'sync_invoice_from_daftra',
      invoiceNumber: invoiceNumber,
      filesCount: result.files.length,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      message: 'تم سحب الفاتورة بنجاح',
      invoice: invoice,
      files: result.files
    });
    
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      error: 'فشل سحب الفاتورة',
      details: error.message
    });
  }
});

/**
 * سحب كل الفواتير الجديدة
 * POST /api/invoices/sync-all-new
 */
router.post('/sync-all-new', auth, authorize('admin'), async (req, res) => {
  try {
    const { lastSyncDate } = req.body;
    
    console.log(`\n📥 طلب سحب كل الفواتير الجديدة`);
    console.log(`👤 المستخدم: ${req.user.username}`);
    console.log(`📅 من تاريخ: ${lastSyncDate || 'البداية'}`);
    
    // سحب الفواتير
    const results = await DaftraPDFDownloader.syncNewInvoices(lastSyncDate);
    
    // حفظ الفواتير في قاعدة البيانات
    const savedInvoices = [];
    
    for (const result of results) {
      if (result.success) {
        try {
          const existing = await dataStore.findOne('invoices', {
            invoiceNumber: result.invoiceNumber
          });
          
          let invoice;
          
          if (existing) {
            invoice = await dataStore.update('invoices', existing.id, {
              syncedFromDaftra: true,
              daftraInvoiceId: result.invoiceId,
              documents: {
                ...existing.documents,
                ...result.files.reduce((acc, file) => {
                  acc[file.type] = file.path;
                  return acc;
                }, {})
              },
              lastSyncedAt: new Date().toISOString()
            });
          } else {
            invoice = await dataStore.create('invoices', {
              id: require('uuid').v4(),
              invoiceNumber: result.invoiceNumber,
              daftraInvoiceId: result.invoiceId,
              clientName: result.invoiceDetails.client,
              total: result.invoiceDetails.total,
              date: result.invoiceDetails.date,
              status: 'synced',
              syncedFromDaftra: true,
              documents: result.files.reduce((acc, file) => {
                acc[file.type] = file.path;
                return acc;
              }, {}),
              createdAt: new Date().toISOString(),
              lastSyncedAt: new Date().toISOString()
            });
          }
          
          savedInvoices.push(invoice);
          
        } catch (error) {
          console.error(`فشل حفظ ${result.invoiceNumber}:`, error);
        }
      }
    }
    
    // تسجيل في Audit Log
    await dataStore.create('audit-logs', {
      id: require('uuid').v4(),
      userId: req.user.id,
      username: req.user.username,
      action: 'sync_all_invoices_from_daftra',
      totalInvoices: results.length,
      successCount: results.filter(r => r.success).length,
      failedCount: results.filter(r => !r.success).length,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      message: 'تم سحب الفواتير',
      total: results.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      invoices: savedInvoices,
      details: results
    });
    
  } catch (error) {
    console.error('Sync all error:', error);
    res.status(500).json({
      error: 'فشل سحب الفواتير',
      details: error.message
    });
  }
});

/**
 * الحصول على حالة التخزين
 * GET /api/storage/status
 */
router.get('/storage/status', auth, async (req, res) => {
  try {
    const status = await StorageManager.checkStorage();
    
    if (!status.ready) {
      return res.status(503).json({
        error: 'التخزين غير جاهز',
        details: status.error
      });
    }
    
    const detailedStats = await StorageManager.getDetailedStats();
    
    res.json({
      ready: true,
      stats: detailedStats
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'فشل الحصول على حالة التخزين',
      details: error.message
    });
  }
});

/**
 * تحميل ملف
 * GET /api/invoices/:invoiceNumber/files/:fileType
 */
router.get('/:invoiceNumber/files/:fileType', auth, async (req, res) => {
  try {
    const { invoiceNumber, fileType } = req.params;
    
    // جلب معلومات الفاتورة
    const invoice = await dataStore.findOne('invoices', { invoiceNumber });
    
    if (!invoice) {
      return res.status(404).json({ error: 'الفاتورة غير موجودة' });
    }
    
    const filePath = invoice.documents?.[fileType];
    
    if (!filePath) {
      return res.status(404).json({ error: 'الملف غير موجود' });
    }
    
    // قراءة الملف
    const fileBuffer = await StorageManager.readFile(filePath);
    
    // إرسال الملف
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoiceNumber}-${fileType}.pdf"`
    });
    
    res.send(fileBuffer);
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      error: 'فشل تحميل الملف',
      details: error.message
    });
  }
});

module.exports = router;
