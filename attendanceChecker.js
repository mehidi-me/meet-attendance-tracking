const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs").promises;
require("dotenv").config();

const APP_ENV = process.env.APP_ENV;
const EMAIL = process.env.EMAIL_ID;
const PASSWORD = process.env.EMAIL_PASSWORD;
const COOKIES_PATH = "./cookies.json";

const stealth = StealthPlugin();
stealth.enabledEvasions.delete("iframe.contentWindow");
stealth.enabledEvasions.delete("media.codecs");
puppeteer.use(stealth);

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const saveCookies = async (page) => {
  const cookies = await page.cookies();
  await fs.writeFile(COOKIES_PATH, JSON.stringify(cookies, null, 2));
  console.log("✅ Cookies saved");
};

const loadCookies = async (page) => {
  try {
    const cookiesJSON = await fs.readFile(COOKIES_PATH, "utf-8");
    const cookies = JSON.parse(cookiesJSON);
    await page.setCookie(...cookies);
    delay(2000);
    console.log("🍪 Cookies loaded");
    return true;
  } catch {
    return false;
  }
};

const findParticipants = async (page, participantName) => {
  try {
    await page.evaluate(() => {
      const openPeopleTabButton = document.querySelector(
        "div.VfPpkd-T0kwCb > button"
      );
      if (openPeopleTabButton) openPeopleTabButton.click();
    });
    await page.waitForSelector('button[aria-label="People"]', {
      visible: true,
    });

    await page.click('button[aria-label="People"]');
    await delay(1000);
    const participants = await page.evaluate(() => {
      const elements = document.querySelectorAll("div.jKwXVe span");
      return Array.from(elements).map((el) => el.innerText);
    });
    console.log("👥 Participants:", participants);
    return participants.includes(participantName);
  } catch (error) {
    console.log(error);
  }
};

const loginWithEmail = async (page) => {
  await page.goto(
    "https://accounts.google.com/ServiceLogin?hl=en&passive=true&continue=https://www.google.com/&ec=GAZAAQ",
    { waitUntil: "networkidle2" }
  );

  await page.type('input[type="email"]', EMAIL, { delay: 50 });
  await page.click("#identifierNext");
  await delay(2000);

  await page.waitForSelector('input[type="password"]', { visible: true });
  await page.type('input[type="password"]', PASSWORD, { delay: 50 });
  await page.click("#passwordNext");
  await page.waitForNavigation({ waitUntil: "networkidle2" });
  console.log("🔐 Logged in to Google");
};

const isLoggedIn = async (page) => {
  const isLogged = await page.evaluate(() => {
    // Look for some DOM element that's only visible when logged in
    return !!document.querySelector('div[jscontroller="VXdfxd"]'); // Example: sign-out link
  });

  return isLogged;
};

const attendanceChecker = async (meetLink, participantName) => {
  console.time();
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    headless: APP_ENV === "production",
    args: [
      "--start-maximized",
      "--use-fake-ui-for-media-stream",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--headless=new", // or --headless=chrome or --headless if needed
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-software-rasterizer",
    ],
    defaultViewport: null,
  });

  const page = await browser.newPage();

  const hasCookies = await loadCookies(page);

  if (hasCookies) {
    await page.goto(meetLink, { waitUntil: "networkidle2" });
    await saveCookies(page);
    const notValid = await isLoggedIn(page);
    if (notValid) {
      await loginWithEmail(page);
      await page.goto(meetLink, { waitUntil: "networkidle2" });
      await saveCookies(page);
    }
  } else {
    await loginWithEmail(page);
    await page.goto(meetLink, { waitUntil: "networkidle2" });
    await saveCookies(page);
  }

  // Turn off mic
  try {
    await page.waitForSelector('div[jscontroller="dLMF9"]', { timeout: 8000 });
    await page.click('div[jscontroller="dLMF9"]');
    console.log("🎙️ Mic turned off");
  } catch {
    console.log("⚠️ Mic button not found or already off");
  }

  // Turn off camera
  try {
    await page.waitForSelector('div[jscontroller="c3SwJc"]', { timeout: 8000 });
    await page.click('div[jscontroller="c3SwJc"]');
    console.log("📷 Camera turned off");
  } catch {
    console.log("⚠️ Camera button not found or already off");
  }

  // Click Join or Ask to Join
  try {
    await page.waitForSelector('button[jscontroller="O626Fe"]', {
      visible: true,
    });
    await page.click('button[jscontroller="O626Fe"]');
    console.log("✅ Asked to join the meeting");
    console.timeEnd();
    await page.waitForSelector('button[jsname="CQylAd"]', { visible: true });
    console.log("✅ Meeting has been joined");
    const result = await findParticipants(page, participantName);
    await delay(2000);
    await page.click('button[jsname="CQylAd"]');
    console.log(result);
    await browser.close();
    return result;
  } catch (error) {
    console.log("❌ Join button not found", error);
    await browser.close();
    return error;
  }
};

module.exports = attendanceChecker;
