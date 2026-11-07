import { existsSync } from "node:fs";

// Turns an HTML page into a PDF with a real (headless) Chromium, which is what gives correct Arabic shaping, right-to-left
// layout and page numbering. On the server (Vercel) it uses the bundled serverless Chromium; on a developer's machine it uses the
// Chrome that is installed (or the one named in CHROME_PATH).

const LOCAL_CHROME = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter((p): p is string => !!p);

const onServerless = () => !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

export async function htmlToPdf(html: string): Promise<Buffer> {
  const { default: puppeteer } = await import("puppeteer-core");
  let executablePath: string;
  let args: string[];
  if (onServerless()) {
    const { default: chromium } = await import("@sparticuz/chromium");
    executablePath = await chromium.executablePath();
    args = await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" });
  } else {
    const local = LOCAL_CHROME.find((p) => existsSync(p));
    if (!local) throw new Error("No Chrome was found to build the PDF. Set CHROME_PATH to a Chrome or Chromium executable.");
    executablePath = local;
    args = ["--no-sandbox", "--disable-gpu"];
  }
  const browser = await puppeteer.launch({ args, executablePath, headless: "shell" });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
