const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const dataStore = require('../utils/dataStore');
const { auth, authorize } = require('../middleware/auth');
const magicplan = require('../integrations/magicplan');

// Get all projects
router.get('/', auth, async (req, res) => {
  try {
    const projects = await dataStore.read('projects');
    const { status, search } = req.query;
    
    let filtered = projects;
    
    if (status) {
      filtered = filtered.filter(p => p.status === status);
    }
    
    if (search) {
      filtered = filtered.filter(p => 
        p.name.includes(search) || p.clientName?.includes(search)
      );
    }
    
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في جلب المشروعات' });
  }
});

// Get project by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await dataStore.findById('projects', req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'المشروع غير موجود' });
    }
    
    // Get invoices for this project
    const invoices = await dataStore.find('invoices', { projectId: project.id });
    
    // Get Magicplan gallery if available
    let gallery = null;
    if (project.magicplanId) {
      const galleryResult = await magicplan.getProjectGallery(project.magicplanId);
      if (galleryResult.success) {
        gallery = galleryResult.data;
      }
    }
    
    res.json({
      ...project,
      invoices,
      gallery
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في جلب المشروع' });
  }
});

// Create project
router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const project = {
      id: uuidv4(),
      ...req.body,
      status: req.body.status || 'active',
      createdBy: req.user.id
    };
    
    await dataStore.create('projects', project);
    
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في إنشاء المشروع' });
  }
});

// Update project
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const updated = await dataStore.update('projects', req.params.id, req.body);
    
    if (!updated) {
      return res.status(404).json({ error: 'المشروع غير موجود' });
    }
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في تحديث المشروع' });
  }
});

// Delete project
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    await dataStore.delete('projects', req.params.id);
    res.json({ message: 'تم حذف المشروع بنجاح' });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في حذف المشروع' });
  }
});

module.exports = router;