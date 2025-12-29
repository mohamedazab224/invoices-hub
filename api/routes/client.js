const express = require('express');
const router = express.Router();
const dataStore = require('../utils/dataStore');

// Public route - no auth required (in production, use separate auth)
router.get('/project/:id', async (req, res) => {
  try {
    const project = await dataStore.findById('projects', req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'المشروع غير موجود' });
    }
    
    // Get only signed/approved documents
    const invoices = await dataStore.find('invoices', { 
      projectId: project.id 
    });
    
    const approved = invoices.filter(i => 
      i.status === 'approved' || i.status === 'signed'
    );
    
    res.json({
      project: {
        name: project.name,
        clientName: project.clientName,
        description: project.description
      },
      documents: approved.map(doc => ({
        id: doc.id,
        number: doc.invoiceNumber || doc.internalNumber,
        date: doc.date,
        total: doc.total,
        status: doc.status,
        type: doc.type
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

module.exports = router;