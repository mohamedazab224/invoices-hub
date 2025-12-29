const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const dataStore = require('../utils/dataStore');
const { auth } = require('../middleware/auth');

// Get reviews for document
router.get('/:documentId', auth, async (req, res) => {
  try {
    const reviews = await dataStore.find('reviews', { 
      documentId: req.params.documentId 
    });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في جلب المراجعات' });
  }
});

// Get review status (for all departments)
router.get('/status/:documentId', auth, async (req, res) => {
  try {
    const reviews = await dataStore.find('reviews', { 
      documentId: req.params.documentId 
    });
    
    const status = {
      engineering: reviews.find(r => r.department === 'engineering')?.status || 'pending',
      accounting: reviews.find(r => r.department === 'accounting')?.status || 'pending',
      purchasing: reviews.find(r => r.department === 'purchasing')?.status || 'pending',
      allApproved: false
    };
    
    status.allApproved = 
      status.engineering === 'approved' &&
      status.accounting === 'approved' &&
      status.purchasing === 'approved';
    
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Create review (Approve or Reject with signature)
router.post('/', auth, async (req, res) => {
  try {
    const { documentId, action, comments, signature } = req.body;
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'الإجراء غير صحيح' });
    }
    
    if (action === 'approve' && !signature) {
      return res.status(400).json({ error: 'التوقيع مطلوب للاعتماد' });
    }
    
    if (action === 'reject' && !comments) {
      return res.status(400).json({ error: 'التعليقات مطلوبة للرفض' });
    }
    
    // Check if user already reviewed
    const existing = await dataStore.findOne('reviews', {
      documentId,
      reviewerId: req.user.id
    });
    
    if (existing) {
      return res.status(400).json({ error: 'لقد قمت بالمراجعة مسبقاً' });
    }
    
    const review = {
      id: uuidv4(),
      documentId,
      reviewerId: req.user.id,
      reviewerName: req.user.name,
      department: req.user.department,
      status: action === 'approve' ? 'approved' : 'rejected',
      comments: comments || '',
      signature: signature || null,
      reviewedAt: new Date().toISOString()
    };
    
    await dataStore.create('reviews', review);
    
    // Check if all departments approved
    const allReviews = await dataStore.find('reviews', { documentId });
    const approvedDepts = allReviews.filter(r => r.status === 'approved').map(r => r.department);
    
    if (approvedDepts.length === 3 && 
        approvedDepts.includes('engineering') &&
        approvedDepts.includes('accounting') &&
        approvedDepts.includes('purchasing')) {
      
      // Update document status to approved
      await dataStore.update('invoices', documentId, { status: 'approved' });
    }
    
    // Log audit
    await dataStore.create('audit-logs', {
      id: uuidv4(),
      userId: req.user.id,
      username: req.user.username,
      action: `review_${action}`,
      documentId,
      department: req.user.department,
      timestamp: new Date().toISOString()
    });
    
    res.json(review);
  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ error: 'حدث خطأ في المراجعة' });
  }
});

module.exports = router;