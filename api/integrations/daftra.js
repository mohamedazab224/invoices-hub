/**
 * ═══════════════════════════════════════════════════════════
 * Daftra API Integration
 * ═══════════════════════════════════════════════════════════
 * 
 * الدور: سحب البيانات المالية من دفترة
 * - الفواتير
 * - العملاء
 * - المنتجات/الخدمات
 * - المستخلصات
 */

const axios = require('axios');

class DaftraAPI {
  constructor() {
    this.baseURL = process.env.DAFTRA_URL;
    this.apiKey = process.env.DAFTRA_API_KEY;
    this.clientId = process.env.DAFTRA_CLIENT_ID;
    this.clientSecret = process.env.DAFTRA_CLIENT_SECRET;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'APIKEY': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Get access token from Daftra
   */
  async getAccessToken() {
    try {
      const response = await this.client.post('/auth/login', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        username: process.env.DAFTRA_USERNAME,
        password: process.env.DAFTRA_PASSWORD
      });
      
      return response.data.access_token;
    } catch (error) {
      console.error('Daftra Authentication Error:', error.message);
      throw new Error('فشل الاتصال بدفترة');
    }
  }

  /**
   * احصل على جميع الفواتير
   */
  async getInvoices(params = {}) {
    try {
      const response = await this.client.get('/invoices', { params });
      
      return {
        success: true,
        data: response.data.data || [],
        total: response.data.total || 0,
        page: response.data.page || 1
      };
    } catch (error) {
      console.error('Daftra Get Invoices Error:', error.message);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * احصل على فاتورة محددة
   */
  async getInvoice(invoiceId) {
    try {
      const response = await this.client.get(`/invoices/${invoiceId}`);
      
      return {
        success: true,
        data: this.transformInvoice(response.data)
      };
    } catch (error) {
      console.error('Daftra Get Invoice Error:', error.message);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * احصل على فاتورة بالرقم الداخلي
   */
  async getInvoiceByNumber(invoiceNumber) {
    try {
      const response = await this.client.get('/invoices', {
        params: { invoice_number: invoiceNumber }
      });
      
      if (response.data.data && response.data.data.length > 0) {
        return {
          success: true,
          data: this.transformInvoice(response.data.data[0])
        };
      }
      
      return {
        success: false,
        error: 'الفاتورة غير موجودة',
        data: null
      };
    } catch (error) {
      console.error('Daftra Get Invoice By Number Error:', error.message);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * احصل على المستخلصات
   */
  async getWorkExtracts(params = {}) {
    try {
      // في دفترة، المستخلصات قد تكون ضمن الفواتير أو كنوع منفصل
      const response = await this.client.get('/invoices', {
        params: {
          ...params,
          type: 'work_extract' // أو حسب تصنيف دفترة
        }
      });
      
      return {
        success: true,
        data: response.data.data || [],
        total: response.data.total || 0
      };
    } catch (error) {
      console.error('Daftra Get Work Extracts Error:', error.message);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * احصل على العملاء
   */
  async getClients(params = {}) {
    try {
      const response = await this.client.get('/clients', { params });
      
      return {
        success: true,
        data: response.data.data || [],
        total: response.data.total || 0
      };
    } catch (error) {
      console.error('Daftra Get Clients Error:', error.message);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * احصل على عميل محدد
   */
  async getClient(clientId) {
    try {
      const response = await this.client.get(`/clients/${clientId}`);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Daftra Get Client Error:', error.message);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * احصل على المنتجات/الخدمات
   */
  async getProducts(params = {}) {
    try {
      const response = await this.client.get('/products', { params });
      
      return {
        success: true,
        data: response.data.data || [],
        total: response.data.total || 0
      };
    } catch (error) {
      console.error('Daftra Get Products Error:', error.message);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * تحويل بيانات الفاتورة إلى الصيغة الداخلية
   */
  transformInvoice(daftraInvoice) {
    return {
      id: daftraInvoice.id,
      invoiceNumber: daftraInvoice.invoice_number,
      internalNumber: daftraInvoice.reference_number || daftraInvoice.invoice_number,
      date: daftraInvoice.invoice_date,
      dueDate: daftraInvoice.due_date,
      
      // معلومات العميل
      client: {
        id: daftraInvoice.client_id,
        name: daftraInvoice.client_name,
        taxNumber: daftraInvoice.client_tax_number,
        address: daftraInvoice.client_address
      },
      
      // البنود
      items: (daftraInvoice.items || []).map(item => ({
        description: item.description || item.name,
        quantity: item.quantity || 1,
        unit: item.unit || 'وحدة',
        unitPrice: item.unit_price || 0,
        total: item.total || 0,
        taxRate: item.tax_rate || 0,
        taxAmount: item.tax_amount || 0
      })),
      
      // المبالغ
      subtotal: daftraInvoice.subtotal || 0,
      taxAmount: daftraInvoice.tax_amount || 0,
      discount: daftraInvoice.discount || 0,
      total: daftraInvoice.total || 0,
      
      // الحالة
      status: daftraInvoice.status || 'draft',
      paid: daftraInvoice.paid || false,
      paidAmount: daftraInvoice.paid_amount || 0,
      
      // معلومات إضافية
      notes: daftraInvoice.notes,
      terms: daftraInvoice.terms,
      
      // المصدر
      source: 'daftra',
      sourceId: daftraInvoice.id,
      sourceUrl: `${process.env.DAFTRA_URL}/invoices/${daftraInvoice.id}`
    };
  }

  /**
   * اختبار الاتصال بدفترة
   */
  async testConnection() {
    try {
      const response = await this.client.get('/ping');
      return {
        success: true,
        message: 'الاتصال بدفترة ناجح',
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: 'فشل الاتصال بدفترة',
        error: error.message
      };
    }
  }

  /**
   * احصل على إحصائيات من دفترة
   */
  async getStatistics() {
    try {
      const [invoices, clients] = await Promise.all([
        this.getInvoices({ per_page: 1 }),
        this.getClients({ per_page: 1 })
      ]);
      
      return {
        success: true,
        data: {
          totalInvoices: invoices.total || 0,
          totalClients: clients.total || 0,
          lastSync: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new DaftraAPI();
