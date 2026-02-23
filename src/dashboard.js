/**
 * WebHarvest Pro - Dashboard Module
 *     // Bind events
        this.bindEvents();

        // Start auto-refresh
        this.startAutoRefresh();
    }

    // Bind events
    bindEvents() {
        window.addEventListener('products:updated', () => this.refresh());
        window.addEventListener('config:updated', () => this.refresh());
    }

    // Start auto-refresh
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        this.refreshInterval = setInterval(() => {
            this.refresh();
        }, 60000); // Every minute
    }

    // Refresh dashboard
    async refresh() {
        if (!this.container) return;

        const products = await productManager.getAllProducts();
        const report = analytics.generateReport(products);

        this.render(report);
    }

    // Render dashboard
    render(report) {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="dashboard">
                ${this.renderSummaryCards(report.summary)}
                ${this.renderCharts(report)}
                ${this.renderTables(report)}
            </div>
        `;

        this.initCharts(report);
    }

    // Render summary cards
    renderSummaryCards(summary) {
        return `
            <div class="summary-cards">
                <div class="summary-card">
                    <div class="card-icon bg-primary">
                        <i class="fas fa-box"></i>
                    </div>
                    <div class="card-content">
                        <div class="card-value">${summary.totalProducts}</div>
                        <div class="card-label">Total Products</div>
                    </div>
                </div>
                <div class="summary-card">
                    <div class="card-icon bg-success">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="card-content">
                        <div class="card-value">${summary.published}</div>
                        <div class="card-label">Published</div>
                    </div>
                </div>
                <div class="summary-card">
                    <div class="card-icon bg-warning">
                        <i class="fas fa-edit"></i>
                    </div>
                    <div class="card-content">
                        <div class="card-value">${summary.draft}</div>
                        <div class="card-label">Draft</div>
                    </div>
                </div>
                <div class="summary-card">
                    <div class="card-icon bg-danger">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="card-content">
                        <div class="card-value">${summary.outOfStock}</div>
                        <div class="card-label">Out of Stock</div>
                    </div>
                </div>
                <div class="summary-card">
                    <div class="card-icon bg-info">
                        <i class="fas fa-pound-sign"></i>
                    </div>
                    <div class="card-content">
                        <div class="card-value">${summary.totalProfit}</div>
                        <div class="card-label">Total Profit</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Render charts placeholder
    renderCharts(report) {
        return `
            <div class="charts-row">
                <div class="chart-container">
                    <h3>Categories Distribution</h3>
                    <canvas id="categoryChart"></canvas>
                </div>
                <div class="chart-container">
                    <h3>Profit Margin Distribution</h3>
                    <canvas id="marginChart"></canvas>
                </div>
            </div>
        `;
    }

    // Render tables
    renderTables(report) {
        return `
            <div class="tables-row">
                <div class="table-container">
                    <h3>Top Profit Products</h3>
                    ${this.renderTopProductsTable(report.topProducts)}
                </div>
                <div class="table-container">
                    <h3>Low Stock Alert</h3>
                    ${this.renderLowStockTable(report.lowStock)}
                </div>
            </div>
        `;
    }

    // Render top products table
    renderTopProductsTable(products) {
        if (!products.length) {
            return '<p class="no-data">No data</p>';
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Profit</th>
                        <th>Margin</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => `
                        <tr>
                            <td>${p.nameAr || p.name}</td>
                            <td class="text-success">${p.profit}</td>
                            <td>${p.profitMargin}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // Render low stock table
    renderLowStockTable(products) {
        if (!products.length) {
            return '<p class="no-data">All products in stock</p>';
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Stock</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => `
                        <tr>
                            <td>${p.nameAr || p.name}</td>
                            <td class="text-warning">${p.stock}</td>
                            <td><button class="btn btn-sm btn-primary">Restock</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // Initialize charts
    async initCharts(report) {
        // Load Chart.js
        await this.loadChartJS();

        // Category chart
        const categoryCtx = document.getElementById('categoryChart');
        if (categoryCtx) {
            new Chart(categoryCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(report.categoryBreakdown),
                    datasets: [{
                        data: Object.values(report.categoryBreakdown),
                        backgroundColor: this.colors
                    }]
                }
            });
        }

        // Margin chart
        const marginCtx = document.getElementById('marginChart');
        if (marginCtx) {
            new Chart(marginCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(report.marginDistribution),
                    datasets: [{
                        label: 'Products',
                        data: Object.values(report.marginDistribution),
                        backgroundColor: this.colors[0]
                    }]
                }
            });
        }
    }

    // Load Chart.js
    loadChartJS() {
        return new Promise((resolve, reject) => {
            if (window.Chart) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
}

// Export singleton
const dashboard = new Dashboard();
export { dashboard, Dashboard };
