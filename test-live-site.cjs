const puppeteer = require('puppeteer');


(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Go to the live site
  await page.goto('https://petrelmaterialflow.web.app', { waitUntil: 'networkidle0' });

  // Get all script tags src attributes
  const scriptUrls = await page.$$eval('script[src]', scripts => scripts.map(s => s.src));
  console.log("Found script URLs:", scriptUrls);

  const mainJsUrl = scriptUrls.find(url => url.includes('/assets/index-'));
  if (mainJsUrl) {
    console.log("Fetching main JS bundle:", mainJsUrl);
    await page.goto(mainJsUrl);
    const jsContent = await page.evaluate(() => document.body.textContent);
    
    const hasSmartStep = jsContent.includes('Pametna (ovire)') || jsContent.includes('smartstep');
    const hasCoreProcess = jsContent.includes('Jedrni proces') || jsContent.includes('core');
    const hasSupply = jsContent.includes('Stranska dobava') || jsContent.includes('supply');
    
    console.log("Check results in deployed JS:");
    console.log("- contains 'Pametna (ovire)' or 'smartstep':", hasSmartStep);
    console.log("- contains 'Jedrni proces' or 'core':", hasCoreProcess);
    console.log("- contains 'Stranska dobava' or 'supply':", hasSupply);
  } else {
    console.log("No main JS bundle found!");
  }

  await browser.close();
})();
