const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Go to the live site
  await page.goto('https://petrelmaterialflow.web.app', { waitUntil: 'networkidle0' });

  // Try to find the edge select options
  const selects = await page.$$eval('select.edge-input', selects => {
    return selects.map(s => {
      const options = Array.from(s.querySelectorAll('option'));
      return options.map(o => o.textContent + ' (' + o.value + ')');
    });
  });

  console.log("Found edge selects:");
  console.log(JSON.stringify(selects, null, 2));

  await browser.close();
})();
