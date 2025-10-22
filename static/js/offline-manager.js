// Менеджер оффлайн-режима с IndexedDB
class OfflineManager {
  constructor() {
    this.dbName = 'DrillingJournalDB';
    this.storeName = 'wells';
    this.db = null;
    this.init();
  }

  async init() {
    await this.openDB();
    console.log('OfflineManager инициализирован');
  }

  // Открытие/создание базы данных
  openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        console.error('Ошибка открытия IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB открыта успешно');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        console.log('Создание/обновление IndexedDB');
        const db = event.target.result;

        // Создаем хранилище объектов если его нет
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, {
            keyPath: 'offline_id'
          });
          // Создаем индексы для быстрого поиска
          store.createIndex('sync_status', 'sync_status', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
          console.log('Хранилище wells создано');
        }
      };
    });
  }

  // Сохранить скважину в локальную базу
  async saveWell(wellData) {
    if (!this.db) await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      // Создаем объект скважины для сохранения
      const well = {
        ...wellData,
        offline_id: wellData.offline_id || `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sync_status: 'pending', // помечаем как ожидающую синхронизации
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const request = store.put(well);

      request.onsuccess = () => {
        console.log('Скважина сохранена локально:', well);
        resolve(well);
      };

      request.onerror = () => {
        console.error('Ошибка сохранения скважины:', request.error);
        reject(request.error);
      };
    });
  }

  // Получить все скважины из локальной базы
  async getLocalWells() {
    if (!this.db) await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        console.log('Загружены локальные скважины:', request.result.length);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Ошибка загрузки скважин:', request.error);
        reject(request.error);
      };
    });
  }

  // Удалить скважину из локальной базы после синхронизации
  async deleteWell(offlineId) {
    if (!this.db) await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(offlineId);

      request.onsuccess = () => {
        console.log('Скважина удалена из локальной базы:', offlineId);
        resolve();
      };

      request.onerror = () => {
        console.error('Ошибка удаления скважины:', request.error);
        reject(request.error);
      };
    });
  }

  // Очистить локальную базу (для тестирования)
  async clearLocalWells() {
    if (!this.db) await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('Локальная база очищена');
        resolve();
      };

      request.onerror = () => {
        console.error('Ошибка очистки базы:', request.error);
        reject(request.error);
      };
    });
  }
}