class MarkSpaceDB {
  constructor() {
    this.dbName = 'MarkSpaceDB';
    this.dbVersion = 1;
    this.storageKey = 'projects';
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject('Error opening database');
      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storageKey)) {
          db.createObjectStore(this.storageKey, { keyPath: 'id' });
        }
      };
    });
  }

  async getAllProjects() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storageKey], 'readonly');
      const store = transaction.objectStore(this.storageKey);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject('Error fetching projects');
    });
  }

  async saveProject(project) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storageKey], 'readwrite');
      const store = transaction.objectStore(this.storageKey);
      const request = store.put(project);

      request.onsuccess = () => resolve();
      request.onerror = () => reject('Error saving project');
    });
  }

  async getProject(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storageKey], 'readonly');
      const store = transaction.objectStore(this.storageKey);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject('Error fetching project');
    });
  }

  async deleteProject(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storageKey], 'readwrite');
      const store = transaction.objectStore(this.storageKey);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject('Error deleting project');
    });
  }
}

export const db = new MarkSpaceDB();
