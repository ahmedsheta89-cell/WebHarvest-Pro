/**
 * WebHarvest Pro - Firebase Operations Module
 * عمليات قاعدة البيانات
 */

import { CONFIG, ConfigManager } from './config.js';

// Firebase Realtime Database Manager
class FirebaseDB {
    constructor() {
        this.db = null;
        this.connected = false;
        this.listeners = new Map();
    }

    async initialize() {
        try {
            // Initialize Firebase
            if (typeof firebase !== 'undefined') {
                const app = firebase.initializeApp(CONFIG.firebase);
                this.db = firebase.database();
                this.connected = true;
                
                // Monitor connection
                this.monitorConnection();
                console.log('✅ Firebase متصل');
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ خطأ في الاتصال بـ Firebase:', error);
            return false;
        }
    }

    monitorConnection() {
        const connectedRef = this.db.ref('.info/connected');
        connectedRef.on('value', (snap) => {
            this.connected = snap.val() === true;
            document.dispatchEvent(new CustomEvent('firebase-connection', {
                detail: { connected: this.connected }
            }));
        });
    }

    // Products CRUD
    async addProduct(product) {
        if (!this.connected) throw new Error('غير متصل بقاعدة البيانات');
        
        const ref = this.db.ref('products');
        const newRef = ref.push();
        
        const productData = {
            ...product,
            id: newRef.key,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1
        };
        
        await newRef.set(productData);
        await this.logActivity('add', productData);
        
        return productData;
    }

    async updateProduct(productId, updates) {
        if (!this.connected) throw new Error('غير متصل بقاعدة البيانات');
        
        const ref = this.db.ref(`products/${productId}`);
        const snapshot = await ref.once('value');
        const current = snapshot.val();
        
        if (!current) throw new Error('المنتج غير موجود');
        
        // Save version history
        await this.saveVersion(productId, current);
        
        const updatedData = {
            ...updates,
            updatedAt: Date.now(),
            version: (current.version || 1) + 1
        };
        
        await ref.update(updatedData);
        await this.logActivity('update', { id: productId, changes: updates });
        
        return updatedData;
    }

    async deleteProduct(productId) {
        if (!this.connected) throw new Error('غير متصل بقاعدة البيانات');
        
        const ref = this.db.ref(`products/${productId}`);
        const snapshot = await ref.once('value');
        const product = snapshot.val();
        
        if (product) {
            // Move to trash
            await this.db.ref(`trash/${productId}`).set({
                ...product,
                deletedAt: Date.now()
            });
            
            await ref.remove();
            await this.logActivity('delete', { id: productId, name: product.name });
        }
        
        return true;
    }

    async getProduct(productId) {
        const ref = this.db.ref(`products/${productId}`);
        const snapshot = await ref.once('value');
        return snapshot.val();
    }

    async getAllProducts(filters = {}) {
        let ref = this.db.ref('products');
        
        // Apply filters
        if (filters.category) {
            ref = ref.orderByChild('category').equalTo(filters.category);
        } else if (filters.status) {
            ref = ref.orderByChild('status').equalTo(filters.status);
        }
        
        const snapshot = await ref.once('value');
        let products = [];
        
        snapshot.forEach((child) => {
            products.push({ id: child.key, ...child.val() });
        });
        
        // Apply additional filters
        if (filters.search) {
            const search = filters.search.toLowerCase();
            products = products.filter(p => 
                p.name?.toLowerCase().includes(search) ||
                p.nameAr?.includes(search) ||
                p.barcode?.includes(search)
            );
        }
        
        if (filters.minPrice) {
            products = products.filter(p => p.salePrice >= filters.minPrice);
        }
        
        if (filters.maxPrice) {
            products = products.filter(p => p.salePrice <= filters.maxPrice);
        }
        
        if (filters.stockLow) {
            products = products.filter(p => p.stock <= CONFIG.inventory.lowStockThreshold);
        }
        
        // Sort
        if (filters.sortBy) {
            products.sort((a, b) => {
                const aVal = a[filters.sortBy];
                const bVal = b[filters.sortBy];
                return filters.sortDesc ? bVal - aVal : aVal - bVal;
            });
        } else {
            products.sort((a, b) => b.createdAt - a.createdAt);
        }
        
        return products;
    }

    // Bulk Operations
    async bulkAddProducts(products) {
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };
        
        for (const product of products) {
            try {
                await this.addProduct(product);
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push({ product: product.name, error: error.message });
            }
        }
        
        await this.logActivity('bulk_add', results);
        return results;
    }

    async bulkUpdateProducts(updates) {
        const batch = {};
        
        for (const { id, data } of updates) {
            batch[`products/${id}`] = {
                ...data,
                updatedAt: Date.now()
            };
        }
        
        await this.db.ref().update(batch);
        await this.logActivity('bulk_update', { count: updates.length });
        
        return { updated: updates.length };
    }

    async bulkDeleteProducts(productIds) {
        const batch = {};
        const timestamp = Date.now();
        
        for (const id of productIds) {
            batch[`trash/${id}`] = { movedAt: timestamp };
            batch[`products/${id}`] = null;
        }
        
        await this.db.ref().update(batch);
        await this.logActivity('bulk_delete', { count: productIds.length });
        
        return { deleted: productIds.length };
    }

    // Version History
    async saveVersion(productId, data) {
        const ref = this.db.ref(`history/${productId}`).push();
        await ref.set({
            ...data,
            savedAt: Date.now()
        });
        
        // Keep only last 10 versions
        const historyRef = this.db.ref(`history/${productId}`).orderByKey().limitToFirst(10);
        const snapshot = await historyRef.once('value');
        const versions = [];
        
        snapshot.forEach(child => versions.push(child.key));
        
        if (versions.length >= 10) {
            const toDelete = versions.slice(0, versions.length - 10);
            for (const key of toDelete) {
                await this.db.ref(`history/${productId}/${key}`).remove();
            }
        }
    }

    async getVersionHistory(productId) {
        const ref = this.db.ref(`history/${productId}`).orderByChild('savedAt');
        const snapshot = await ref.once('value');
        const history = [];
        
        snapshot.forEach(child => {
            history.push({ versionId: child.key, ...child.val() });
        });
        
        return history.reverse();
    }

    async restoreVersion(productId, versionId) {
        const versionRef = this.db.ref(`history/${productId}/${versionId}`);
        const snapshot = await versionRef.once('value');
        const data = snapshot.val();
        
        if (data) {
            await this.updateProduct(productId, data);
            await this.logActivity('restore', { productId, versionId });
        }
        
        return data;
    }

    // Activity Log
    async logActivity(action, data) {
        const ref = this.db.ref('activity_log').push();
        await ref.set({
            action,
            data,
            timestamp: Date.now(),
            user: navigator.userAgent
        });
    }

    async getActivityLog(limit = 100) {
        const ref = this.db.ref('activity_log').orderByChild('timestamp').limitToLast(limit);
        const snapshot = await ref.once('value');
        const logs = [];
        
        snapshot.forEach(child => {
            logs.push({ id: child.key, ...child.val() });
        });
        
        return logs.reverse();
    }

    // Settings
    async saveSettings(settings) {
        await this.db.ref('settings').set({
            ...settings,
            updatedAt: Date.now()
        });
    }

    async getSettings() {
        const snapshot = await this.db.ref('settings').once('value');
        return snapshot.val() || {};
    }

    // Statistics
    async getStats() {
        const products = await this.getAllProducts();
        
        return {
            totalProducts: products.length,
            totalValue: products.reduce((sum, p) => sum + (p.salePrice * (p.stock || 0)), 0),
            totalCost: products.reduce((sum, p) => sum + (p.purchasePrice * (p.stock || 0)), 0),
            potentialProfit: products.reduce((sum, p) => sum + ((p.salePrice - p.purchasePrice) * (p.stock || 0)), 0),
            lowStock: products.filter(p => p.stock <= CONFIG.inventory.lowStockThreshold).length,
            outOfStock: products.filter(p => !p.stock || p.stock === 0).length,
            categories: [...new Set(products.map(p => p.category))].length,
            lastUpdated: Date.now()
        };
    }

    // Real-time Listeners
    subscribeToProducts(callback) {
        const ref = this.db.ref('products');
        ref.on('value', (snapshot) => {
            const products = [];
            snapshot.forEach(child => {
                products.push({ id: child.key, ...child.val() });
            });
            callback(products);
        });
        
        this.listeners.set('products', ref);
        return () => ref.off('value');
    }

    subscribeToStats(callback) {
        const ref = this.db.ref('products');
        ref.on('value', async () => {
            const stats = await this.getStats();
            callback(stats);
        });
        
        this.listeners.set('stats', ref);
        return () => ref.off('value');
    }

    // Cleanup
    disconnect() {
        for (const [name, ref] of this.listeners) {
            ref.off('value');
        }
        this.listeners.clear();
    }
}

// Export singleton
const firebaseDB = new FirebaseDB();
export { firebaseDB };
