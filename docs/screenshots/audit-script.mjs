import puppeteer from 'puppeteer';

const SCREENSHOTS = '/Users/owner/Desktop/Metriqfit-elite/docs/screenshots';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(120000);
  page.setDefaultTimeout(60000);
  await page.setViewport({ width: 1440, height: 900 });

  // Collect console errors
  const consoleErrors = [];
  const consoleWarns = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.type() === 'warning') consoleWarns.push(msg.text());
  });

  // 1. SIGN UP PAGE
  console.log('=== SIGN UP PAGE ===');
  await page.goto('http://localhost:8081/sign-up', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise(r => setTimeout(r, 8000));

  const inputs = await page.$$('input');
  console.log('Input count:', inputs.length);

  // Fill form
  await inputs[0].click({ clickCount: 3 });
  await inputs[0].type('audituser_' + Date.now() + '@metriqfit.test');
  await inputs[1].click({ clickCount: 3 });
  await inputs[1].type('TestPass123!');
  await inputs[2].click({ clickCount: 3 });
  await inputs[2].type('TestPass123!');

  await page.screenshot({ path: `${SCREENSHOTS}/03-signup-filled.png` });
  console.log('Signup form filled screenshot saved');

  // Find and click Create Account
  const createAccountXpath = "//div[contains(text(),'Create Account')]";
  const createBtns = await page.$x(createAccountXpath);
  if (createBtns.length > 0) {
    console.log('Clicking Create Account button...');
    await createBtns[0].click();
  } else {
    // Try role=button
    const allElements = await page.$$('[role="button"]');
    for (const el of allElements) {
      const text = await el.evaluate(e => e.textContent);
      if (text && text.includes('Create Account')) {
        console.log('Found Create Account via role=button');
        await el.click();
        break;
      }
    }
  }

  await new Promise(r => setTimeout(r, 8000));
  await page.screenshot({ path: `${SCREENSHOTS}/04-after-signup.png` });
  console.log('After signup URL:', page.url());

  // 2. Check if redirected to onboarding or got error
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);

  if (currentUrl.includes('onboarding') || currentUrl.includes('step')) {
    console.log('=== ONBOARDING FLOW ===');
    await page.screenshot({ path: `${SCREENSHOTS}/05-onboarding-step1.png` });

    // Discover what's on the onboarding page
    const pageContent = await page.evaluate(() => {
      const texts = [];
      document.querySelectorAll('div, span, p, h1, h2, h3, label').forEach(el => {
        const t = el.textContent?.trim();
        if (t && t.length < 200 && t.length > 1) texts.push(t);
      });
      return [...new Set(texts)].slice(0, 50);
    });
    console.log('Onboarding page text elements:', JSON.stringify(pageContent, null, 2));

    // Try to discover interactive elements
    const interactives = await page.evaluate(() => {
      const elements = [];
      document.querySelectorAll('input, select, [role="button"], [role="radio"], [role="checkbox"], button, a').forEach(el => {
        elements.push({
          tag: el.tagName,
          type: el.type || null,
          role: el.getAttribute('role'),
          text: el.textContent?.trim()?.substring(0, 100),
          placeholder: el.placeholder || null,
          visible: el.offsetParent !== null || el.offsetHeight > 0
        });
      });
      return elements;
    });
    console.log('Interactive elements:', JSON.stringify(interactives, null, 2));
  } else if (currentUrl.includes('sign-up') || currentUrl.includes('sign-in')) {
    console.log('Still on auth page - checking for error messages...');
    const errorTexts = await page.evaluate(() => {
      const errors = [];
      document.querySelectorAll('div, span, p').forEach(el => {
        const t = el.textContent?.trim();
        const style = window.getComputedStyle(el);
        if (t && (style.color.includes('255, 0') || style.color.includes('red') || t.toLowerCase().includes('error') || t.toLowerCase().includes('invalid'))) {
          errors.push(t);
        }
      });
      return [...new Set(errors)];
    });
    console.log('Error messages found:', errorTexts);
  } else {
    console.log('Unexpected URL after signup:', currentUrl);
    await page.screenshot({ path: `${SCREENSHOTS}/05-unexpected-state.png` });
  }

  // Summary
  console.log('\n=== CONSOLE ERRORS ===');
  consoleErrors.forEach(e => console.log('ERROR:', e));
  console.log('\n=== CONSOLE WARNINGS ===');
  consoleWarns.forEach(w => console.log('WARN:', w));

  await browser.close();
  console.log('\nAudit script completed.');
})();
