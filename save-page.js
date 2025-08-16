// save-pages.js

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

// --- Configuration ---
const INPUT_FILE = 'sql_problems.json';
const OUTPUT_DIR = 'Database-sql'; // UPDATED: Folder name changed to MySQL
const CONCURRENCY = 20; // Number of tabs to open in parallel

/**
 * A utility function to create a valid folder name from a problem title.
 */
const sanitizeName = (name) => {
  return name.replace(/[\/\\?%*:|"<>]/g, '_');
};

/**
 * The main worker function. It opens a new tab, clicks Schema/Companies,
 * and saves the page as MHTML.
 * @param {object} problem - The problem object with { Name, link }.
 * @param {import('playwright').BrowserContext} context - The shared browser context.
 */
const processProblem = async (problem, context) => {
  const problemFolderName = sanitizeName(problem.Name);
  const problemFolderPath = path.join(OUTPUT_DIR, problemFolderName);
  const outputFilePath = path.join(problemFolderPath, 'index.mhtml');

  let page;

  try {
    await fs.mkdir(problemFolderPath, { recursive: true });
    
    try {
      await fs.access(outputFilePath);
      console.log(`✅ SKIPPED: "${problem.Name}" already exists.`);
      return;
    } catch (e) {
      // File doesn't exist, proceed.
    }

    page = await context.newPage();
    
    console.log(`🚀 STARTING: "${problem.Name}"`);
    await page.goto(problem.link, { waitUntil: 'networkidle', timeout: 90000 });

    // =================================================================
    // NEW SEQUENCE: SQL Schema -> Companies
    // =================================================================

    // Step 1: Click the "SQL Schema" button and wait for the modal.
    try {
      // Using :has-text to find the clickable parent div containing the "SQL Schema" text.
      const schemaButton = page.locator('div:has-text("SQL Schema")').last();
      await schemaButton.click({ timeout: 5000 });
      console.log(`   -> Clicked "SQL Schema" for "${problem.Name}"`);
      
      // Wait for the modal dialog to become visible.
    //   await page.waitForSelector('div[role="dialog"]', { state: 'visible', timeout: 10000 });
      console.log(`   -> SQL Schema modal loaded for "${problem.Name}"`);
    } catch (error) {
      console.log(`   -> INFO: "SQL Schema" button not found for "${problem.Name}".`);
    }

    // Step 2: Topics logic is now commented out.
    /*
    try {
      const topicsButton = page.locator('div.group:has-text("Topics")');
      await topicsButton.click({ timeout: 5000 });
      console.log(`   -> Clicked "Topics" tab for "${problem.Name}"`);
      
      await page.waitForSelector('a[href*="/tag/"]', { timeout: 10000 });
      console.log(`   -> Topic data loaded for "${problem.Name}"`);
    } catch (error) {
      console.log(`   -> INFO: "Topics" tab not found or no data loaded for "${problem.Name}".`);
    }
    */

    // Step 3: Click the "Companies" tab and wait for content.
    try {
      const companiesButton = page.locator('div.group:has-text("Companies")');
      await companiesButton.click({ timeout: 5000 });
      console.log(`   -> Clicked "Companies" tab for "${problem.Name}"`);
      
      await page.waitForSelector('a[href*="/company/"]', { timeout: 10000 });
      console.log(`   -> Company data loaded for "${problem.Name}"`);
    } catch (error) {
      console.log(`   -> INFO: "Companies" tab not found or no data loaded for "${problem.Name}".`);
    }
    // =================================================================

    // Capture the full page snapshot (MHTML) after expanding sections.
    const session = await context.newCDPSession(page);
    const { data } = await session.send('Page.captureSnapshot', { format: 'mhtml' });
    
    await fs.writeFile(outputFilePath, data);
    console.log(`✅ FINISHED: "${problem.Name}"`);

  } catch (error) {
    console.error(`❌ FAILED: "${problem.Name}" - ${error.message}`);
  } finally {
    if (page && !page.isClosed()) {
      await page.close();
    }
  }
};


// --- Main Execution Logic ---
(async () => {
  let browser;
  try {
    const problemsRaw = await fs.readFile(INPUT_FILE, 'utf-8');
    const problems = JSON.parse(problemsRaw);
    console.log(`Found ${problems.length} problems to process.`);
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    const endpointURL = 'http://localhost:9222';
    console.log(`Connecting to existing browser at: ${endpointURL}`);
    browser = await chromium.connectOverCDP(endpointURL);

    const mainContext = browser.contexts()[0];
    if (!mainContext) {
      throw new Error("Could not find an active browser context. Please ensure your browser is running and has at least one tab open.");
    }
    console.log("Successfully attached to the main browser context.");

    console.log(`Starting download process with a concurrency of ${CONCURRENCY}...`);
    for (let i = 0; i < problems.length; i += CONCURRENCY) {
      const chunk = problems.slice(i, i + CONCURRENCY);
      
      const workerPromises = chunk.map(problem => processProblem(problem, mainContext));
      
      await Promise.all(workerPromises);
      console.log(`--- Chunk ${Math.floor(i / CONCURRENCY) + 1} completed ---`);
    }

    console.log('\nAll problems have been processed!');

  } catch (error) {
    console.error('An unrecoverable error occurred:', error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Disconnected from the browser session.');
    }
  }
})();