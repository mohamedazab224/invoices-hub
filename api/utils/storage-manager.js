/**
 * Storage Manager - إدارة التخزين على Volume
 * مسار التخزين: /mnt/alazab-storage/
 */

const fs = require('fs').promises;
const path = require('path');
const fsSync = require('fs');

const STORAGE_ROOT = '/mnt/alazab-storage';
const INVOICES_DIR = path.join(STORAGE_ROOT, 'invoices');
const PROJECTS_DIR = path.join(STORAGE_ROOT, 'projects');
const BACKUPS_DIR = path.join(STORAGE_ROOT, 'backups');
const TEMP_DIR = path.join(STORAGE_ROOT, 'temp');

class StorageManager {
  
  /**
   * التحقق من جاهزية التخزين
   */
  static async checkStorage() {
    try {
      // التحقق من وجود المجلد الرئيسي
      await fs.access(STORAGE_ROOT);
      
      // الحصول على معلومات المساحة
      const stats = await this.getStorageStats();
      
      return {
        ready: true,
        stats: stats
      };
    } catch (error) {
      return {
        ready: false,
        error: error.message
      };
    }
  }
  
  /**
   * الحصول على إحصائيات المساحة
   */
  static async getStorageStats() {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      
      exec(`df -h ${STORAGE_ROOT} --output=size,used,avail,pcent`, (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        
        const lines = stdout.trim().split('\n');
        const data = lines[1].trim().split(/\s+/);
        
        resolve({
          total: data[0],
          used: data[1],
          available: data[2],
          percentage: data[3]
        });
      });
    });
  }
  
  /**
   * إنشاء مجلد فاتورة جديد
   */
  static async createInvoiceFolder(invoiceNumber) {
    const year = invoiceNumber.split('-')[2]; // AZ-INV-2025-0142 -> 2025
    const invoicePath = path.join(INVOICES_DIR, year, invoiceNumber);
    
    try {
      await fs.mkdir(invoicePath, { recursive: true });
      return invoicePath;
    } catch (error) {
      throw new Error(`فشل إنشاء مجلد الفاتورة: ${error.message}`);
    }
  }
  
  /**
   * حفظ ملف PDF
   */
  static async saveInvoiceFile(invoiceNumber, fileType, fileBuffer) {
    const year = invoiceNumber.split('-')[2];
    const invoicePath = path.join(INVOICES_DIR, year, invoiceNumber);
    
    // التأكد من وجود المجلد
    await fs.mkdir(invoicePath, { recursive: true });
    
    // تحديد اسم الملف
    let fileName;
    switch (fileType) {
      case 'tax':
        fileName = `${invoiceNumber}.pdf`;
        break;
      case 'detailed':
        fileName = `${invoiceNumber}-detailed.pdf`;
        break;
      case 'receipt':
        fileName = `${invoiceNumber}-receipt.pdf`;
        break;
      default:
        fileName = `${invoiceNumber}-${fileType}.pdf`;
    }
    
    const filePath = path.join(invoicePath, fileName);
    
    // حفظ الملف
    await fs.writeFile(filePath, fileBuffer);
    
    // إرجاع المسار النسبي (للتخزين في DB)
    return path.relative(STORAGE_ROOT, filePath);
  }
  
  /**
   * قراءة ملف
   */
  static async readFile(relativePath) {
    const fullPath = path.join(STORAGE_ROOT, relativePath);
    return await fs.readFile(fullPath);
  }
  
  /**
   * التحقق من وجود ملف
   */
  static async fileExists(relativePath) {
    try {
      const fullPath = path.join(STORAGE_ROOT, relativePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * حذف ملف
   */
  static async deleteFile(relativePath) {
    const fullPath = path.join(STORAGE_ROOT, relativePath);
    await fs.unlink(fullPath);
  }
  
  /**
   * حذف مجلد فاتورة كامل
   */
  static async deleteInvoiceFolder(invoiceNumber) {
    const year = invoiceNumber.split('-')[2];
    const invoicePath = path.join(INVOICES_DIR, year, invoiceNumber);
    
    await fs.rm(invoicePath, { recursive: true, force: true });
  }
  
  /**
   * الحصول على حجم ملف
   */
  static async getFileSize(relativePath) {
    const fullPath = path.join(STORAGE_ROOT, relativePath);
    const stats = await fs.stat(fullPath);
    return stats.size;
  }
  
  /**
   * الحصول على قائمة ملفات فاتورة
   */
  static async getInvoiceFiles(invoiceNumber) {
    const year = invoiceNumber.split('-')[2];
    const invoicePath = path.join(INVOICES_DIR, year, invoiceNumber);
    
    try {
      const files = await fs.readdir(invoicePath);
      
      const fileDetails = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(invoicePath, file);
          const stats = await fs.stat(filePath);
          
          return {
            name: file,
            path: path.relative(STORAGE_ROOT, filePath),
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime
          };
        })
      );
      
      return fileDetails;
    } catch (error) {
      return [];
    }
  }
  
  /**
   * إنشاء نسخة احتياطية
   */
  static async createBackup(source, backupName) {
    const backupPath = path.join(BACKUPS_DIR, 'weekly', backupName);
    
    // استخدام tar لضغط المجلد
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      
      const cmd = `tar -czf ${backupPath} -C ${source} .`;
      
      exec(cmd, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve(backupPath);
        }
      });
    });
  }
  
  /**
   * تنظيف الملفات المؤقتة
   */
  static async cleanTempFiles(olderThanDays = 7) {
    const now = Date.now();
    const maxAge = olderThanDays * 24 * 60 * 60 * 1000;
    
    const files = await fs.readdir(TEMP_DIR);
    
    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        await fs.unlink(filePath);
      }
    }
  }
  
  /**
   * الحصول على إحصائيات التخزين التفصيلية
   */
  static async getDetailedStats() {
    const invoicesSize = await this.getFolderSize(INVOICES_DIR);
    const projectsSize = await this.getFolderSize(PROJECTS_DIR);
    const backupsSize = await this.getFolderSize(BACKUPS_DIR);
    const tempSize = await this.getFolderSize(TEMP_DIR);
    
    const storageStats = await this.getStorageStats();
    
    return {
      total: storageStats,
      breakdown: {
        invoices: this.formatBytes(invoicesSize),
        projects: this.formatBytes(projectsSize),
        backups: this.formatBytes(backupsSize),
        temp: this.formatBytes(tempSize)
      }
    };
  }
  
  /**
   * حساب حجم مجلد
   */
  static async getFolderSize(folderPath) {
    let totalSize = 0;
    
    try {
      const items = await fs.readdir(folderPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(folderPath, item.name);
        
        if (item.isDirectory()) {
          totalSize += await this.getFolderSize(itemPath);
        } else {
          const stats = await fs.stat(itemPath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // المجلد غير موجود أو فارغ
    }
    
    return totalSize;
  }
  
  /**
   * تحويل Bytes إلى صيغة قابلة للقراءة
   */
  static formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = StorageManager;
