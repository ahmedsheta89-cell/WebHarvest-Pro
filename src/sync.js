/**
 * WebHarvest Pro - Sync Manager Module
 * مزامنة البيانات
 */

import { offlineStorage } from './offline.js';
import { productManager } from './products.js';

// Sync Manager
class SyncManager {
    constructor() {
        this.syncing = false;
        this.lastSync = null;
        this.syncInterval = null;
    }

    // Initialize sync
    async init() {
        // Listen for online/offline events
        window.addEventListener('online', () => this.sync());
        window.addEventListener('offline', () => this.stopAutoSync());

        // Start auto sync if online
        if (navigator.onLine) {
            this.startAutoSync();
        }
    }

    // Start auto sync
    startAutoSync(intervalMs = 300000) { // 5 minutes
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        this.syncInterval = setInterval(() => {
            if (navigator.onLine && !this.syncing) {
                this.sync();
            }
        }, intervalMs);
    }

    // Stop auto sync
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    // Sync data
    async sync() {
        if (this.syncing || !navigator.onLine) {
            return { success: false, message: 'Sync in progress or offline' };
        }

        this.syncing = true;

        try {
            // Get sync queue
            const queue = await offlineStorage.getSyncQueue();
            const results = [];

            for (const item of queue) {
                try {
                    let result;
                    switch (item.action) {
                        case 'create':
                        case 'update':
                            result = await productManager.updateProduct(item.data.id, item.data);
                            break;
                        case 'delete':
                            result = await productManager.deleteProduct(item.data.id);
                            break;
                    }
                    results.push({ id: item.id, success: true, result });
                } catch (error) {
                    results.push({ id: item.id, success: false, error: error.message });
                }
            }

            // Clear sync queue
            await offlineStorage.clearSyncQueue();

            this.lastSync = new Date();
            this.syncing = false;

            return { success: true, results, lastSync: this.lastSync };
        } catch (error) {
            this.syncing = false;
            return { success: false, error: error.message };
        }
    }

    // Get last sync time
    getLastSync() {
        return this.lastSync;
    }

    // Force sync
    async forceSync() {
        return this.sync();
    }

    // Check sync status
    getStatus() {
        return {
            syncing: this.syncing,
            lastSync: this.lastSync,
            online: navigator.onLine,
            autoSyncEnabled: this.syncInterval !== null
        };
    }
}

// Export singleton
const syncManager = new SyncManager();
export { syncManager, SyncManager };
