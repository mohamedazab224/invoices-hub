/**
 * ═══════════════════════════════════════════════════════════
 * Magicplan API Integration
 * ═══════════════════════════════════════════════════════════
 * 
 * الدور: سحب البيانات الفنية من Magicplan
 * - الصور
 * - المخططات
 * - النماذج ثلاثية الأبعاد (3D)
 * - المعلومات الفنية
 */

const axios = require('axios');

class MagicplanAPI {
  constructor() {
    this.baseURL = process.env.MAGICPLAN_API_URL || 'https://api.magicplan.app/v2';
    this.apiKey = process.env.MAGICPLAN_API_KEY;
    this.userId = process.env.MAGICPLAN_ID;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * احصل على جميع المشروعات من Magicplan
   */
  async getProjects(params = {}) {
    try {
      const response = await this.client.get('/projects', { params });
      
      return {
        success: true,
        data: response.data.projects || [],
        total: response.data.total || 0
      };
    } catch (error) {
      console.error('Magicplan Get Projects Error:', error.message);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * احصل على مشروع محدد
   */
  async getProject(projectId) {
    try {
      const response = await this.client.get(`/projects/${projectId}`);
      
      return {
        success: true,
        data: this.transformProject(response.data)
      };
    } catch (error) {
      console.error('Magicplan Get Project Error:', error.message);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * احصل على صور المشروع
   */
  async getProjectImages(projectId) {
    try {
      const response = await this.client.get(`/projects/${projectId}/images`);
      
      const images = (response.data.images || []).map(img => ({
        id: img.id,
        url: img.url,
        thumbnailUrl: img.thumbnail_url,
        title: img.title || 'صورة المشروع',
        description: img.description,
        uploadedAt: img.created_at,
        roomName: img.room_name,
        tags: img.tags || []
      }));
      
      return {
        success: true,
        data: images
      };
    } catch (error) {
      console.error('Magicplan Get Images Error:', error.message);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * احصل على المخططات
   */
  async getProjectFloorplans(projectId) {
    try {
      const response = await this.client.get(`/projects/${projectId}/floorplans`);
      
      const floorplans = (response.data.floorplans || []).map(fp => ({
        id: fp.id,
        name: fp.name,
        imageUrl: fp.image_url,
        pdfUrl: fp.pdf_url,
        level: fp.level || 0,
        createdAt: fp.created_at,
        updatedAt: fp.updated_at
      }));
      
      return {
        success: true,
        data: floorplans
      };
    } catch (error) {
      console.error('Magicplan Get Floorplans Error:', error.message);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * احصل على النموذج ثلاثي الأبعاد
   */
  async getProject3DModel(projectId) {
    try {
      const response = await this.client.get(`/projects/${projectId}/3d-model`);
      
      return {
        success: true,
        data: {
          id: response.data.id,
          embedUrl: response.data.embed_url,
          viewerUrl: response.data.viewer_url,
          downloadUrl: response.data.download_url,
          thumbnailUrl: response.data.thumbnail_url,
          format: response.data.format || 'gltf',
          fileSize: response.data.file_size,
          createdAt: response.data.created_at
        }
      };
    } catch (error) {
      console.error('Magicplan Get 3D Model Error:', error.message);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * احصل على معلومات الغرف
   */
  async getProjectRooms(projectId) {
    try {
      const response = await this.client.get(`/projects/${projectId}/rooms`);
      
      const rooms = (response.data.rooms || []).map(room => ({
        id: room.id,
        name: room.name,
        type: room.type,
        level: room.level || 0,
        area: room.area,
        perimeter: room.perimeter,
        height: room.height,
        notes: room.notes
      }));
      
      return {
        success: true,
        data: rooms
      };
    } catch (error) {
      console.error('Magicplan Get Rooms Error:', error.message);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * احصل على القياسات والملاحظات
   */
  async getProjectMeasurements(projectId) {
    try {
      const response = await this.client.get(`/projects/${projectId}/measurements`);
      
      return {
        success: true,
        data: response.data.measurements || []
      };
    } catch (error) {
      console.error('Magicplan Get Measurements Error:', error.message);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * احصل على معرض المشروع الكامل (صور + مخططات + 3D)
   */
  async getProjectGallery(projectId) {
    try {
      const [images, floorplans, model3D, rooms] = await Promise.all([
        this.getProjectImages(projectId),
        this.getProjectFloorplans(projectId),
        this.getProject3DModel(projectId),
        this.getProjectRooms(projectId)
      ]);
      
      return {
        success: true,
        data: {
          images: images.data || [],
          floorplans: floorplans.data || [],
          model3D: model3D.data || null,
          rooms: rooms.data || [],
          totalAssets: (images.data?.length || 0) + (floorplans.data?.length || 0)
        }
      };
    } catch (error) {
      console.error('Magicplan Get Gallery Error:', error.message);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * تحويل بيانات المشروع إلى الصيغة الداخلية
   */
  transformProject(magicplanProject) {
    return {
      id: magicplanProject.id,
      name: magicplanProject.name,
      address: magicplanProject.address,
      clientName: magicplanProject.client_name,
      
      // معلومات المشروع
      description: magicplanProject.description,
      status: magicplanProject.status || 'active',
      createdAt: magicplanProject.created_at,
      updatedAt: magicplanProject.updated_at,
      
      // الإحصائيات
      stats: {
        totalRooms: magicplanProject.total_rooms || 0,
        totalArea: magicplanProject.total_area || 0,
        totalImages: magicplanProject.total_images || 0,
        totalFloorplans: magicplanProject.total_floorplans || 0
      },
      
      // المصدر
      source: 'magicplan',
      sourceId: magicplanProject.id,
      sourceUrl: magicplanProject.project_url
    };
  }

  /**
   * إنشاء رابط Embed للنموذج ثلاثي الأبعاد
   */
  generate3DEmbedCode(projectId, options = {}) {
    const width = options.width || '100%';
    const height = options.height || '600px';
    const autoRotate = options.autoRotate ? 'true' : 'false';
    
    return `
      <iframe 
        src="https://viewer.magicplan.app/3d/${projectId}?autorotate=${autoRotate}" 
        width="${width}" 
        height="${height}" 
        frameborder="0" 
        allowfullscreen
        style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
      </iframe>
    `;
  }

  /**
   * اختبار الاتصال بـ Magicplan
   */
  async testConnection() {
    try {
      const response = await this.client.get('/user');
      return {
        success: true,
        message: 'الاتصال بـ Magicplan ناجح',
        data: {
          userId: response.data.id,
          name: response.data.name
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'فشل الاتصال بـ Magicplan',
        error: error.message
      };
    }
  }

  /**
   * احصل على إحصائيات من Magicplan
   */
  async getStatistics() {
    try {
      const projects = await this.getProjects({ per_page: 1 });
      
      return {
        success: true,
        data: {
          totalProjects: projects.total || 0,
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

module.exports = new MagicplanAPI();
