// Serviço de cache usando IndexedDB para armazenar dados do Google Sheets
const DB_NAME = 'SheetsCacheDB';
const DB_VERSION = 1;
const STORE_NAME = 'sheetsData';
const METADATA_STORE = 'cacheMetadata';

interface CacheMetadata {
  tableName: string;
  spreadsheetId: string;
  lastUpdated: number;
  version: number; // Para detectar mudanças
}

class CacheService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  private async initDB(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store para dados das tabelas
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('tableName', 'tableName', { unique: false });
          store.createIndex('spreadsheetId', 'spreadsheetId', { unique: false });
        }

        // Store para metadados (timestamps, versões)
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          const metadataStore = db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
          metadataStore.createIndex('tableName', 'tableName', { unique: false });
          metadataStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  // Gerar chave composta
  private getKey(tableName: string, spreadsheetId: string): string {
    return `${tableName}::${spreadsheetId}`;
  }

  // Salvar dados no cache
  async setCache(
    tableName: string,
    spreadsheetId: string,
    data: any[],
    version?: number
  ): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    const key = this.getKey(tableName, spreadsheetId);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME, METADATA_STORE], 'readwrite');
      
      const dataStore = transaction.objectStore(STORE_NAME);
      const metadataStore = transaction.objectStore(METADATA_STORE);

      const dataRequest = dataStore.put({
        key,
        tableName,
        spreadsheetId,
        data,
        timestamp: Date.now(),
      });

      const metadataRequest = metadataStore.put({
        key,
        tableName,
        spreadsheetId,
        lastUpdated: Date.now(),
        version: version || Date.now(),
      });

      dataRequest.onsuccess = () => {
        metadataRequest.onsuccess = () => resolve();
        metadataRequest.onerror = () => reject(metadataRequest.error);
      };
      dataRequest.onerror = () => reject(dataRequest.error);
    });
  }

  // Obter dados do cache
  async getCache(tableName: string, spreadsheetId: string): Promise<any[] | null> {
    await this.initDB();
    if (!this.db) return null;

    const key = this.getKey(tableName, spreadsheetId);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Obter metadados do cache
  async getMetadata(tableName: string, spreadsheetId: string): Promise<CacheMetadata | null> {
    await this.initDB();
    if (!this.db) return null;

    const key = this.getKey(tableName, spreadsheetId);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(METADATA_STORE, 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? {
          tableName: result.tableName,
          spreadsheetId: result.spreadsheetId,
          lastUpdated: result.lastUpdated,
          version: result.version,
        } : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Verificar se o cache está válido (não muito antigo)
  async isCacheValid(
    tableName: string,
    spreadsheetId: string,
    maxAge: number = 5 * 60 * 1000 // 5 minutos padrão
  ): Promise<boolean> {
    const metadata = await this.getMetadata(tableName, spreadsheetId);
    if (!metadata) return false;

    const age = Date.now() - metadata.lastUpdated;
    return age < maxAge;
  }

  // Limpar cache de uma tabela específica
  async clearCache(tableName: string, spreadsheetId: string): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    const key = this.getKey(tableName, spreadsheetId);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME, METADATA_STORE], 'readwrite');
      
      const dataStore = transaction.objectStore(STORE_NAME);
      const metadataStore = transaction.objectStore(METADATA_STORE);

      const dataRequest = dataStore.delete(key);
      const metadataRequest = metadataStore.delete(key);

      dataRequest.onsuccess = () => {
        metadataRequest.onsuccess = () => resolve();
        metadataRequest.onerror = () => reject(metadataRequest.error);
      };
      dataRequest.onerror = () => reject(dataRequest.error);
    });
  }

  // Limpar todo o cache
  async clearAllCache(): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME, METADATA_STORE], 'readwrite');
      
      const dataStore = transaction.objectStore(STORE_NAME);
      const metadataStore = transaction.objectStore(METADATA_STORE);

      const dataRequest = dataStore.clear();
      const metadataRequest = metadataStore.clear();

      dataRequest.onsuccess = () => {
        metadataRequest.onsuccess = () => resolve();
        metadataRequest.onerror = () => reject(metadataRequest.error);
      };
      dataRequest.onerror = () => reject(dataRequest.error);
    });
  }

  // Invalidar cache após insert/update/delete
  async invalidateTable(tableName: string, spreadsheetId: string): Promise<void> {
    await this.clearCache(tableName, spreadsheetId);
  }
}

export const cacheService = new CacheService();

