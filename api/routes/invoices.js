const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const dataStore = require('../utils/dataStore');
const { auth, authorize } = require('../middleware/auth');
const daftra = require('../integrations/daftra');

// Get all invoices
router.get('/', auth, async (req, res) => {
  try {
    const invoices = await dataStore.read('invoices');
    const { projectId, status, type } = req.query;
    
    let filtered = invoices;
    
    if (projectId) filtered = filtered.filter(i => i.projectId === projectId);
    if (status) filtered = filtered.filter(i => i.status === status);
    if (type) filtered = filtered.filter(i => i.type === type);
    
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في جلب الفواتير' });
  }
});

// Get invoice by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await dataStore.findById('invoices', req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ error: 'الفاتورة غير موجودة' });
    }
    
    // Get project
    const project = await dataStore.findById('projects', invoice.projectId);
    
    // Get reviews
    const reviews = await dataStore.find('reviews', { documentId: invoice.id });
    
    res.json({
      ...invoice,
      project,
      reviews
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في جلب الفاتورة' });
  }
});

// Sync from Daftra
router.post('/sync-daftra/:invoiceNumber', auth, authorize('admin'), async (req, res) => {
  try {
    const result = await daftra.getInvoiceByNumber(req.params.invoiceNumber);
    
    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }
    
    const invoice = {
      id: uuidv4(),
      ...result.data,
      projectId: req.body.projectId,
      status: 'pending',
      source: 'daftra',
      syncedAt: new Date().toISOString()
    };
    
    await dataStore.create('invoices', invoice);
    
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في مزامنة الفاتورة' });
  }
});

// Create invoice manually
router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const invoice = {
      id: uuidv4(),
      ...req.body,
      status: 'pending',
      createdBy: req.user.id
    };
    
    await dataStore.create('invoices', invoice);
    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في إنشاء الفاتورة' });
  }
});

// Update invoice
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const invoice = await dataStore.findById('invoices', req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ error: 'الفاتورة غير موجودة' });
    }
    
    if (invoice.status === 'signed') {
      return res.status(400).json({ error: 'لا يمكن تعديل فاتورة موقعة' });
    }
    
    const updated = await dataStore.update('invoices', req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في تحديث الفاتورة' });
  }
});

// Delete invoice
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const invoice = await dataStore.findById('invoices', req.params.id);
    
    if (invoice.status === 'signed') {
      return res.status(400).json({ error: 'لا يمكن حذف فاتورة موقعة' });
    }
    
    await dataStore.delete('invoices', req.params.id);
    res.json({ message: 'تم حذف الفاتورة بنجاح' });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في حذف الفاتورة' });
  }
});

module.exports = router;