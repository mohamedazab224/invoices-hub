const fs = require('fs').promises;
const path = require('path');

class DataStore {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    this.ensureDataDir();
  }

  async ensureDataDir() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      console.error('Error creating data directory:', error);
    }
  }

  async read(filename) {
    try {
      const filePath = path.join(this.dataDir, `${filename}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async write(filename, data) {
    try {
      const filePath = path.join(this.dataDir, `${filename}.json`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error(`Error writing to ${filename}:`, error);
      return false;
    }
  }

  async create(filename, item) {
    const data = await this.read(filename);
    const timestamp = new Date().toISOString();
    item.createdAt = timestamp;
    item.updatedAt = timestamp;
    data.push(item);
    await this.write(filename, data);
    return item;
  }

  async update(filename, id, updates) {
    const data = await this.read(filename);
    const index = data.findIndex(item => item.id === id);
    if (index !== -1) {
      data[index] = { 
        ...data[index], 
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      await this.write(filename, data);
      return data[index];
    }
    return null;
  }

  async delete(filename, id) {
    const data = await this.read(filename);
    const filtered = data.filter(item => item.id !== id);
    return await this.write(filename, filtered);
  }

  async findById(filename, id) {
    const data = await this.read(filename);
    return data.find(item => item.id === id) || null;
  }

  async findOne(filename, query) {
    const data = await this.read(filename);
    return data.find(item => {
      return Object.keys(query).every(key => item[key] === query[key]);
    }) || null;
  }

  async find(filename, query = {}) {
    const data = await this.read(filename);
    if (Object.keys(query).length === 0) {
      return data;
    }
    return data.filter(item => {
      return Object.keys(query).every(key => item[key] === query[key]);
    });
  }

  async count(filename, query = {}) {
    const items = await this.find(filename, query);
    return items.length;
  }
}

module.exports = new DataStore();