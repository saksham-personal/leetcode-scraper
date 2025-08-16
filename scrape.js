import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

// --- Configuration ---
const OUTPUT_DIR = 'company';
const OUTPUT_FILE = 'company_problems.json';

/**
 * Aggressively and repeatedly scrolls to the bottom of the page.
 * It only stops after it fails to see the loading indicator for a specific
 * number of consecutive checks.
 *
 * @param {import('playwright').Page} page The Playwright page object.
 * @param {object} [opts]
 * @param {string} [opts.loaderSelector]  CSS selector for the loading gif
 * @param {number} [opts.scrollInterval]  ms to wait between each scroll action
 * @param {number} [opts.confirmationsRequired] number of consecutive "no-loader" checks before exit
 * @param {boolean}[opts.verbose]         Log progress to console
 */
const scrollUntilEnd = async (
  page,
  {
    loaderSelector = 'img[alt="loading..."]',
    scrollInterval = 10, // The very short interval for "spamming" scrolls
    confirmationsRequired = 5, // How many times to confirm the end
    verbose = true,
  } = {}
) => {
  const loader = page.locator(loaderSelector);
  let confirmationCount = 0;
  let round = 0;

  if (verbose) console.log(`[scroll] Starting aggressive scroll with ${confirmationsRequired} confirmations required.`);

  while (true) {
    // 1. "Spam" a scroll-to-bottom command
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // 2. Check if the loader is visible right now (with a very short timeout)
    const isLoaderVisible = await loader.isVisible({ timeout: 50 });

    if (isLoaderVisible) {
      // If we see the loader, we're definitely not done. Reset the confirmation counter.
      confirmationCount = 0;
    } else {
      // If we DON'T see the loader, this might be the end. Increment the counter.
      confirmationCount++;
      if (verbose) console.log(`[scroll] Round ${round}: Loader NOT visible. Confirmations: ${confirmationCount}/${confirmationsRequired}`);
    }

    // 3. Check if we have enough confirmations to exit
    if (confirmationCount >= confirmationsRequired) {
      if (verbose) console.log('[scroll] Confirmed end of list.');
      break;
    }

    // 4. Wait for the tiny interval, then loop again
    await page.waitForTimeout(scrollInterval);
    round++;

    // Failsafe to prevent a truly infinite loop if something unexpected happens
    // if (round > undefined) {
    //   console.warn('[scroll] Exiting after 1000 attempts to prevent an infinite loop.');
    //   break;
    // }
  }
};

/**
 * Extracts all visible problem details from the main list.
 * @param {import('playwright').Page} page The Playwright page object.
 * @returns {Promise<object[]>} An array of problem objects.
 */
const extractProblems = async (page) => {
  const titleLocators = page.locator('div.ellipsis.line-clamp-1');
  const count = await titleLocators.count();
  const problems = [];
  for (let i = 0; i < count; i++) {
    const titleLocator = titleLocators.nth(i);
    const rowLocator = titleLocator.locator('xpath=ancestor::a');
    const name = await titleLocator.innerText();
    const link = await rowLocator.getAttribute('href');
    const difficulty = await rowLocator.locator('p[class*="text-sd-"]').innerText();
    problems.push({
      Name: name.trim(),
      link: `https://leetcode.com${link}`,
      difficulty: difficulty.replace('.', '').trim(),
    });
  }
  return problems;
};

// --- Main Execution Logic ---
(async () => {
  let browser;
  const allCompanyData = [];

  try {
    // --- Connect to Browser and Setup Page ---
    const endpointURL = 'http://localhost:9222';
    console.log(`Connecting to existing browser at: ${endpointURL}`);
    browser = await chromium.connectOverCDP(endpointURL);
    const context = browser.contexts()[0];
    const page = context.pages()[0] || await context.newPage();
    await page.goto('https://leetcode.com/problemset/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('Successfully navigated to problemset.');
    
    // --- Define Robust Locators ---
    const filterButton = page.locator('button:has(svg[data-icon="filter"])');
    const resetButton = page.getByRole('button', { name: 'Reset' });

    const companyDropdown = page.locator('div').filter({ hasText: /^Companiesis$/ }).locator('svg').nth(2);
    const closeFilterButton = page.getByRole('link', { name: 'All Topics' });

    // --- Get the list of all companies once ---
    console.log('Fetching the list of all available companies...');
    await filterButton.click();
    await resetButton.click();
    await companyDropdown.click();

    const companyChips = page.locator('div.flex.flex-wrap > div.inline-flex.cursor-pointer.rounded-xl');
    await companyChips.first().waitFor();

    const companyNames = (await companyChips.allInnerTexts())
      .map(s => s.trim())
      .filter(Boolean);

    console.log(`Found ${companyNames.length} companies to process.`);
    await closeFilterButton.click();
    await page.waitForTimeout(1000); // small pause

    // --- Iterate Through Each Company ---
    for (const companyName of companyNames) {
      console.log(`\n--- Processing Company: ${companyName} ---`);
      
      // 1. Open filter and select the company
      await filterButton.click();
      await resetButton.click();
      await companyDropdown.click();
      await companyChips.getByText(companyName, { exact: true }).click();
      console.log(`   -> Selected "${companyName}" filter.`);
      await closeFilterButton.click();
      
      console.log('   -> Waiting for problems to load...');
      await page.waitForResponse(resp => resp.url().includes('graphql'), { timeout: 15000 });
      
      // 2. Scroll to the end of the problem list
      console.log('   -> Scrolling to find all problems...');
      await scrollUntilEnd(page);
      
      // 3. Extract problem data
      const problems = await extractProblems(page);
      console.log(`   -> Found ${problems.length} problems for ${companyName}.`);
      
      // Save data for the company into its own file
      const companyFilePath = path.join(OUTPUT_DIR, `${companyName}.json`);
      await fs.mkdir(OUTPUT_DIR, { recursive: true });
      await fs.writeFile(companyFilePath, JSON.stringify(problems, null, 2));
      console.log(`   -> Problems for ${companyName} saved to ${companyFilePath}`);
    }

  } catch (error) {
    console.error('\n❌ An unrecoverable error occurred:', error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Disconnected from the browser session.');
    }
  }
})();
