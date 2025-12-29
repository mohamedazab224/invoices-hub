/**
 * Daftra PDF Downloader
 * تحميل ملفات PDF من دفترة وحفظها في التخزين
 */

const axios = require('axios');
const StorageManager = require('./storage-manager');

const DAFTRA_API_BASE = 'https://alazab.daftra.com/api/v2';
const DAFTRA_API_KEY = process.env.DAFTRA_API_KEY;
const DAFTRA_ACCESS_TOKEN = process.env.DAFTRA_ACCESS_TOKEN;

class DaftraPDFDownloader {
  
  /**
   * جلب معلومات الفاتورة من دفترة
   */
  static async getInvoiceDetails(invoiceNumber) {
    try {
      const response = await axios.get(`${DAFTRA_API_BASE}/invoices`, {
        headers: {
          'APIKEY': DAFTRA_API_KEY,
          'Authorization': `Bearer ${DAFTRA_ACCESS_TOKEN}`
        },
        params: {
          'filter[invoice_number]': invoiceNumber
        }
      });
      
      if (response.data && response.data.data && response.data.data.length > 0) {
        return response.data.data[0];
      }
      
      throw new Error(`الفاتورة ${invoiceNumber} غير موجودة في دفترة`);
      
    } catch (error) {
      throw new Error(`فشل جلب معلومات الفاتورة: ${error.message}`);
    }
  }
  
  /**
   * تحميل PDF من رابط
   */
  static async downloadPDF(url, filename) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'APIKEY': DAFTRA_API_KEY,
          'Authorization': `Bearer ${DAFTRA_ACCESS_TOKEN}`
        }
      });
      
      return Buffer.from(response.data);
      
    } catch (error) {
      throw new Error(`فشل تحميل ${filename}: ${error.message}`);
    }
  }
  
  /**
   * تحميل الفاتورة التفصيلية
   */
  static async downloadDetailedInvoice(invoiceId, invoiceNumber) {
    try {
      // رابط PDF التفصيلي من دفترة
      const pdfUrl = `${DAFTRA_API_BASE}/invoices/${invoiceId}/pdf`;
      
      console.log(`📥 تحميل الفاتورة التفصيلية: ${invoiceNumber}`);
      const pdfBuffer = await this.downloadPDF(pdfUrl, 'detailed invoice');
      
      // حفظ في التخزين
      const savedPath = await StorageManager.saveInvoiceFile(
        invoiceNumber,
        'detailed',
        pdfBuffer
      );
      
      console.log(`✅ تم حفظ الفاتورة التفصيلية: ${savedPath}`);
      
      return {
        type: 'detailed',
        path: savedPath,
        size: pdfBuffer.length
      };
      
    } catch (error) {
      console.error(`❌ فشل تحميل الفاتورة التفصيلية: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * تحميل قائمة الاستلام
   */
  static async downloadReceipt(invoiceId, invoiceNumber) {
    try {
      // في دفترة، قد يكون هناك endpoint مختلف للـ receipt
      // أو قد يكون مرفق مع الفاتورة
      // سنحاول جلبه من المرفقات
      
      const response = await axios.get(`${DAFTRA_API_BASE}/invoices/${invoiceId}`, {
        headers: {
          'APIKEY': DAFTRA_API_KEY,
          'Authorization': `Bearer ${DAFTRA_ACCESS_TOKEN}`
        }
      });
      
      const invoice = response.data.data;
      
      // البحث عن Receipt في المرفقات
      if (invoice.attachments && invoice.attachments.length > 0) {
        for (const attachment of invoice.attachments) {
          if (attachment.name && attachment.name.toLowerCase().includes('receipt')) {
            console.log(`📥 تحميل قائمة الاستلام: ${invoiceNumber}`);
            
            const receiptBuffer = await this.downloadPDF(
              attachment.url,
              'receipt'
            );
            
            const savedPath = await StorageManager.saveInvoiceFile(
              invoiceNumber,
              'receipt',
              receiptBuffer
            );
            
            console.log(`✅ تم حفظ قائمة الاستلام: ${savedPath}`);
            
            return {
              type: 'receipt',
              path: savedPath,
              size: receiptBuffer.length
            };
          }
        }
      }
      
      console.log(`⚠️  لم يتم العثور على قائمة استلام للفاتورة: ${invoiceNumber}`);
      return null;
      
    } catch (error) {
      console.error(`❌ فشل تحميل قائمة الاستلام: ${error.message}`);
      // لا نرمي خطأ هنا لأن Receipt قد يكون اختياري
      return null;
    }
  }
  
  /**
   * سحب فاتورة كاملة (كل الملفات)
   */
  static async syncInvoice(invoiceNumber) {
    console.log(`\n🔄 بدء سحب الفاتورة: ${invoiceNumber}`);
    console.log('='.repeat(50));
    
    try {
      // 1. جلب معلومات الفاتورة
      console.log('1️⃣ جلب معلومات الفاتورة من دفترة...');
      const invoiceDetails = await this.getInvoiceDetails(invoiceNumber);
      
      console.log(`✅ تم جلب معلومات الفاتورة - ID: ${invoiceDetails.id}`);
      
      // 2. إنشاء مجلد الفاتورة
      console.log('2️⃣ إنشاء مجلد التخزين...');
      await StorageManager.createInvoiceFolder(invoiceNumber);
      
      const downloadedFiles = [];
      
      // 3. تحميل الفاتورة التفصيلية
      try {
        const detailedFile = await this.downloadDetailedInvoice(
          invoiceDetails.id,
          invoiceNumber
        );
        downloadedFiles.push(detailedFile);
      } catch (error) {
        console.error(`⚠️  تخطي الفاتورة التفصيلية: ${error.message}`);
      }
      
      // 4. تحميل قائمة الاستلام
      try {
        const receiptFile = await this.downloadReceipt(
          invoiceDetails.id,
          invoiceNumber
        );
        if (receiptFile) {
          downloadedFiles.push(receiptFile);
        }
      } catch (error) {
        console.error(`⚠️  تخطي قائمة الاستلام: ${error.message}`);
      }
      
      console.log('='.repeat(50));
      console.log(`✅ تم سحب الفاتورة بنجاح!`);
      console.log(`📊 عدد الملفات المحملة: ${downloadedFiles.length}`);
      console.log('');
      
      return {
        success: true,
        invoiceNumber: invoiceNumber,
        invoiceId: invoiceDetails.id,
        files: downloadedFiles,
        invoiceDetails: {
          client: invoiceDetails.client_name,
          total: invoiceDetails.total,
          date: invoiceDetails.invoice_date,
          status: invoiceDetails.status
        }
      };
      
    } catch (error) {
      console.error(`❌ فشل سحب الفاتورة: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * سحب كل الفواتير الجديدة
   */
  static async syncNewInvoices(lastSyncDate) {
    try {
      console.log('\n🔄 بدء سحب الفواتير الجديدة...');
      console.log('='.repeat(50));
      
      // جلب الفواتير من دفترة
      const response = await axios.get(`${DAFTRA_API_BASE}/invoices`, {
        headers: {
          'APIKEY': DAFTRA_API_KEY,
          'Authorization': `Bearer ${DAFTRA_ACCESS_TOKEN}`
        },
        params: {
          'filter[created_at_from]': lastSyncDate || '2025-01-01',
          'per_page': 50
        }
      });
      
      const invoices = response.data.data;
      
      console.log(`📊 عدد الفواتير الجديدة: ${invoices.length}`);
      console.log('');
      
      const results = [];
      
      for (const invoice of invoices) {
        try {
          const result = await this.syncInvoice(invoice.invoice_number);
          results.push(result);
          
          // تأخير بسيط بين كل فاتورة
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`⚠️  تخطي ${invoice.invoice_number}: ${error.message}`);
          results.push({
            success: false,
            invoiceNumber: invoice.invoice_number,
            error: error.message
          });
        }
      }
      
      console.log('='.repeat(50));
      console.log('✅ انتهى سحب الفواتير الجديدة');
      console.log(`📊 النجاحات: ${results.filter(r => r.success).length}`);
      console.log(`❌ الفشل: ${results.filter(r => !r.success).length}`);
      console.log('');
      
      return results;
      
    } catch (error) {
      throw new Error(`فشل سحب الفواتير الجديدة: ${error.message}`);
    }
  }
}

module.exports = DaftraPDFDownloader;
