import { defineConfig, devices } from "@playwright/test";
import { getAuthStoragePath } from "./src/utils/authStoragePaths";
import path from "path";
import { OrtoniReportConfig } from "ortoni-report";

const reportConfig: OrtoniReportConfig = {
  open: process.env.CI ? "never" : "always",
  folderPath: "ortoni-report",
  filename: "ortoni-report.html",
  logo: path.resolve(process.cwd(), ""),
  authorName: "Tshifhiwa Sinugo",
  base64Image: false,
  preferredTheme: "dark",
  projectName: "Playwright Automation Report",
  testType: "Regression | Sanity",
};

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

// Storage state files setup for CI and Local Environment
const storagePath = getAuthStoragePath();

// Skip browser initialization when running crypto and database operations
const skipBrowserInit = process.env.SKIP_BROWSER_INIT?.toLowerCase() === "true";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  // Base timeouts that apply to ci and local run
  timeout: process.env.CI ? 300 * 1000 : 160 * 1000,
  expect: {
    timeout: process.env.CI ? 300 * 1000 : 160 * 1000,
  },
  testDir: "./tests",
  globalSetup: "./src/utils/environment/globalEnvironmentSetup.ts",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? [
        ["html", { open: "never" }],
        ["junit", { outputFile: "results.xml" }],
        ["ortoni-report", reportConfig],
        ["dot"],
        ["playwright-trx-reporter", { outputFile: "results.trx" }],
      ]
    : [
        ["html", { open: "never" }],
        ["junit", { outputFile: "results.xml" }],
        ["ortoni-report", reportConfig],
        ["dot"],
        ["playwright-trx-reporter", { outputFile: "results.trx" }],
      ],
  grep:
    typeof process.env.PLAYWRIGHT_GREP === "string"
      ? new RegExp(process.env.PLAYWRIGHT_GREP)
      : process.env.PLAYWRIGHT_GREP || /.*/,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* waits timeout */
    actionTimeout: process.env.CI ? 180 * 1000 : 120 * 1000, // For actions like click, fill, etc.
    navigationTimeout: process.env.CI ? 240 * 1000 : 180 * 1000,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
    screenshot: "on",
    video: "on",
  },

  /* Configure projects for major browsers */
  projects: [
      // Include setup unless explicitly skipped
      ...(!skipBrowserInit
        ? [
            {
              name: "setup",
              use: { ...devices["Desktop Chrome"] },
              testMatch: /.*\.setup\.ts/,
            },
          ]
        : []),
  
      {
        name: "chromium",
        use: {
          ...devices["Desktop Chrome"],
          storageState: storagePath, // Ensure storagePath is defined
        },
        dependencies: skipBrowserInit ? [] : ["setup"], // If SKIP_BROWSER_INIT mode is true, skip the "setup" task
      },
    // {
    //   name: "chromium",
    //   use: { ...devices["Desktop Chrome"] },
    // },

    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },

    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
