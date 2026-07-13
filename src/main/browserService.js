const { chromium } = require("playwright");

let browser;
let page;

async function launch(url) {
    browser = await chromium.launch({
        headless: false
    });

    page = await browser.newPage();

    await page.goto(url);

    return true;
}

function getPage() {
    return page;
}

async function close() {
    if (browser) {
        await browser.close();
    }
}

module.exports = {
    launch,
    getPage,
    close
};