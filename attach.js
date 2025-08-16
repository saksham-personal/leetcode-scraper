// inspector-attach.js
import { chromium } from 'playwright';

(async () => {
  try {
    // The endpoint of your running browser
    const endpointURL = 'http://localhost:9222';
    console.log(`Connecting to browser at ${endpointURL}...`);

    // Connect to the browser session
    const browser = await chromium.connectOverCDP(endpointURL);

    // Get the first browser context (your main window)
    const context = browser.contexts()[0];

    // Get the currently active tab
    const page = context.pages()[0];

    if (!page) {
      throw new Error("No active page found. Make sure a tab is open in Chrome.");
    }

    console.log('Successfully attached. Opening Playwright Inspector...');
    console.log('Use the "Pick Locator" button in the Inspector to find elements.');
    
    // This is the key command: it pauses the script and opens the Inspector UI
    await page.pause();

  } catch (error) {
    console.error('Error:', error.message);
  }
})();