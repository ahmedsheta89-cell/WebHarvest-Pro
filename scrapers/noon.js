/**
 * Noon Egypt Scraper
 * سكرابر نون مصر
 */

const puppeteer = require('puppeteer');

async function scrapeNoon(searchQuery, maxProducts = 20) {
    console.log(`🔍 البحث في Noon: ${searchQuery}`);
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    const url = `https://www.noon.com/egypt-en/search/?q=${encodeURIComponent(searchQuery)}`;
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Wait for products to load
    await page.waitForSelector('[data-qa="product-name"]', { timeout: 10000 }).catch(() => {});
    
    const products = await page.evaluate(() => {
        const items = document.querySelectorAll('[data-qa="product-name"]');
        const results = [];
        
        items.forEach(item => {
            const container = item.closest('[data-qa="product-card"]');
            const priceEl = container?.querySelector('[data-qa="price"]');
            const imageEl = container?.querySelector('img');
            const linkEl = container?.querySelector('a');
            
            if (item.textContent) {
                results.push({
                    name: item.textContent.trim(),
                    price: priceEl ? priceEl.textContent.trim() : 'N/A',
                    image: imageEl ? imageEl.src : '',
                    link: linkEl ? 'https://www.noon.com' + linkEl.href : '',
                    source: 'noon.com'
                });
            }
        });
        
        return results;
    });
    
    await browser.close();
    return products.slice(0, maxProducts);
}

// CLI
if (require.main === module) {
    const query = process.argv[2] || 'laptop';
    scrapeNoon(query).then(products => {
        console.log(JSON.stringify({ success: true, count: products.length, products }, null, 2));
    }).catch(err => {
        console.error(JSON.stringify({ success: false, error: err.message }));
        process.exit(1);
    });
}

module.exports = { scrapeNoon };
