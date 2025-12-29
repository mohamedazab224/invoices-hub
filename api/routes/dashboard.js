const express = require('express');
const router = express.Router();
const dataStore = require('../utils/dataStore');
const { auth } = require('../middleware/auth');

router.get('/stats', auth, async (req, res) => {
  try {
    const [projects, invoices, reviews] = await Promise.all([
      dataStore.read('projects'),
      dataStore.read('invoices'),
      dataStore.read('reviews')
    ]);
    
    const stats = {
      projects: {
        total: projects.length,
        active: projects.filter(p => p.status === 'active').length,
        completed: projects.filter(p => p.status === 'completed').length
      },
      invoices: {
        total: invoices.length,
        pending: invoices.filter(i => i.status === 'pending').length,
        underReview: invoices.filter(i => i.status === 'under_review').length,
        approved: invoices.filter(i => i.status === 'approved').length,
        signed: invoices.filter(i => i.status === 'signed').length
      },
      reviews: {
        total: reviews.length,
        byDepartment: {
          engineering: reviews.filter(r => r.department === 'engineering').length,
          accounting: reviews.filter(r => r.department === 'accounting').length,
          purchasing: reviews.filter(r => r.department === 'purchasing').length
        }
      },
      user: {
        name: req.user.name,
        role: req.user.role,
        department: req.user.department
      }
    };
    
    // Get pending reviews for user's department
    if (req.user.department) {
      const pendingInvoices = invoices.filter(i => 
        i.status === 'pending' || i.status === 'under_review'
      );
      
      stats.pendingForMe = [];
      
      for (const invoice of pendingInvoices) {
        const reviewed = await dataStore.findOne('reviews', {
          documentId: invoice.id,
          department: req.user.department
        });
        
        if (!reviewed) {
          stats.pendingForMe.push(invoice);
        }
      }
    }
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في جلب الإحصائيات' });
  }
});

module.exports = router;