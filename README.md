

# LeetCode Company Problems Scraper

This project contains a powerful Playwright script designed to automate the process of scraping LeetCode problems.

## ⚙️ Setup Instructions

Follow these steps to get the project running.

### Prerequisites

  * **Node.js**: You must have Node.js installed on your system. You can download it from [nodejs.org](https://nodejs.org/).
  * **Google Chrome**: The script is designed to work with a standard installation of Google Chrome.

### Installation

1.  **Download the Script**:
    Place the `scrape.js` script in a new project folder.

2.  **Open a Terminal**:
    Navigate into your project folder using your terminal (like PowerShell, Command Prompt, or Terminal on macOS/Linux).

3.  **Initialize the Project**:
    If you haven't already, initialize a Node.js project. This will create a `package.json` file.

    ```bash
    npm init -y
    ```

4.  **Install Dependencies**:
    This command installs Playwright, the core automation library.

    ```bash
    npm install playwright
    ```

5.  **Install Browsers**:
    This command downloads the browser binaries that Playwright needs to operate correctly.

    ```bash
    npx playwright install
    ```

-----

## 🚀 How to Use the Script

This script uses a **two-terminal process**. You need one terminal to run a special instance of Chrome and a second terminal to run the scraper script itself.

### Step 1: Launch Chrome with Remote Debugging

The script needs to connect to a browser that has its debugging port open.

➡️ **In your FIRST terminal**, run the command for your operating system.

**For Windows** (in Command Prompt or PowerShell):

```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\Chrome-debug-profile"
```
or ask gpt on how to do this

**For macOS:**

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=~/Chrome-debug-profile
```

**What this command does:**

  * `--remote-debugging-port=9222`: Opens a special port that automation tools like Playwright can connect to.
  * `--user-data-dir="..."`: Creates a dedicated profile for this session. This is important to keep your main Chrome profile separate.

A new Chrome window will open. **In this new window, log in to your LeetCode account.** Keep both this Chrome window and the first terminal window open.

### Step 2: Run the Scraper Script

➡️ **In a SECOND terminal**, navigate to your project folder and run the script using `node`.

```bash
node scrape.js
```

The script will now start. You will see log messages in the terminal as it:

1.  Connects to your running browser.
2.  Goes to the problemset page.
3.  Fetches the complete list of companies.
4.  Begins the main loop, processing each company one by one.
5.  Scrolls, scrapes, and resets the filter for each company.

This process will take a very long time to complete, depending on the number of companies.

-----

## 📝 Output

Once the script is finished, you will find the results in the `company` folder (this can be configured at the top of the script).

  * **Folder**: `company/`
  * **File**: `companyName.json`

The JSON file will contain an array of objects, where each object represents a company and its associated problems.
