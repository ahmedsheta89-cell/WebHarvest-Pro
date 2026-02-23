/**
 * WebHarvest Pro - Offline Mode Module
 *     // Sync pending changes
    async syncPendingChanges() {
        if (navigator.onLine && this.pendingChanges.length > 0) {
            this.isSyncing = true;
            this.emit('sync:start');

            let synced = 0;
            let failed = 0;

            for (const change of this.pendingChanges) {
                try {
                    await this.applyChange(change);
                    synced++;
                    this.pendingChanges = this.pendingChanges.filter(c => c.id !== change.id);
                } catch (error) {
                    failed++;
                    console.error('Sync failed for change:', change.id, error);
                }
            }

            this.isSyncing = false;
            this.emit('sync:end', { synced, failed });
            this.savePendingChanges();

            return { synced, failed };
        }

        return { synced: 0, failed: 0 };
    }

    // Apply a pending change
    async applyChange(change) {
        switch (change.type) {
            case 'create':
                await productManager.createProduct(change.data);
                break;
            case 'update':
                await productManager.updateProduct(change.id, change.data);
                break;
            case 'delete':
                await productManager.deleteProduct(change.id);
                break;
        }
    }

    // Events
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(cb => cb(data));
        }
    }

    // Get offline status
    getStatus() {
        return {
            isOnline: navigator.onLine,
            hasPendingChanges: this.pendingChanges.length > 0,
            pendingCount: this.pendingChanges.length,
            lastSync: this.lastSync
        };
    }
}

// Export singleton
const offlineManager = new OfflineManager();
export { offlineManager, OfflineManager };
