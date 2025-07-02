import fetch from "node-fetch"
import * as core from "@actions/core"
import * as github from "@actions/github"

const MW_API = process.env.MW_API;
const MW_USERNAME = process.env.MW_USERNAME;
const MW_PASSWORD = process.env.MW_PASSWORD;

const cookieJar: Array<string> = [];

/**
 * Fetch the specified URL.
 * @param {string} url url
 * @param {Record<string, any>} options options
 * @returns {Promise<any>} response
 */
async function fetchWithCookies(url: string, options: Record<string, any> = {}) {
    options.headers = options.headers || {};
    options.headers.Cookie = cookieJar.join('; ');
    const response = await fetch(url, options);
    const setCookie = response.headers.raw()['set-cookie'] || [];
    setCookie.forEach(cookie => {
        const item = cookie.split(';')[0];
        const [name] = item.split('=');
        const index = cookieJar.findIndex(c => c.startsWith(name + '='));
        if (index !== -1) cookieJar[index] = item;
        else cookieJar.push(item);
    });
    return response;
}

/**
 * Log-in to the Wiki and get the CSRF token.
 * @returns {Promise<string>} CSRF token
 */
async function getCSRFToken() {
    try {
        // check env value
        if (!(MW_API && MW_USERNAME && MW_PASSWORD)) {
            throw new Error("no env values.")
        }

        //  login token
        const tokenRes = await fetchWithCookies(`${MW_API}?action=query&meta=tokens&type=login&format=json`);
        const tokenData = await tokenRes.json();
        const loginToken = tokenData.query.tokens.logintoken;

        // login
        const loginRes = await fetchWithCookies(`${MW_API}?action=login&format=json`, {
            method: 'POST',
            body: new URLSearchParams({
                lgname: MW_USERNAME,
                lgpassword: MW_PASSWORD,
                lgtoken: loginToken
            }),
        });
        const loginData = await loginRes.json();
        if (loginData?.login?.result !== 'Success') {
            console.warn(loginData)
            throw Error('Login failed.');
        }

        // csrf token
        const csrfTokenRes = await fetchWithCookies(`${MW_API}?action=query&meta=tokens&format=json`);
        const csrfTokenData = await csrfTokenRes.json();
        const csrfToken = csrfTokenData.query.tokens.csrftoken;

        return csrfToken
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

getCSRFToken().then((res) => {
    console.log(core)
    core.setOutput("token", res)
    core.setOutput("cookie", cookieJar.join("; "))
}).catch((e) => {
    console.error(e);
    process.exit(1);
})