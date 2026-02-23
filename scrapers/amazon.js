/**
 * Amazon Egypt Scraper
 * سكرابر أمازون مصر
 */

const puppeteer = require('puppeteer');

async function scrapeAmazon(searchQuery, maxProducts = 20) {
    console.log(`🔍 البحث في Amazon: ${searchQuery}`);
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    const url = `https://www.amazon.eg/s?k=${encodeURIComponent(searchQuery)}&language=ar`;
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    const products = await page.evaluate(() => {
        const items = document.querySelectorAll('[data-component-type="s-search-result"]');
        const results = [];
        
        items.forEach(item => {
            const titleEl = item.querySelector('h2 a span');
            const priceEl = item.querySelector('.a-price .a-offscreen');
            const imageEl = item.querySelector('img.s-image');
            const linkEl = item.querySelector('h2 a');
            
            if (titleEl) {
                results.push({
                    name: titleEl.textContent.trim(),
                    price: priceEl ? priceEl.textContent.trim() : 'N/A',
                    image: imageEl ? imageEl.src : '',
                    link: linkEl ? 'https://www.amazon.eg' + linkEl.href : '',
                    source: 'amazon.eg'
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
    scrapeAmazon(query).then(products => {
        console.log(JSON.stringify({ success: true, count: products.length, products }, null, 2));
    }).catch(err => {
        console.error(JSON.stringify({ success: false, error: err.message }));
        process.exit(1);
    });
}

module.exports = { scrapeAmazon };
