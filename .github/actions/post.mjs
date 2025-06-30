import fetch from "node-fetch"
import * as core from "@actions/core";
import * as github from "@actions/github";

const MW_ENDPOINT = process.env.MW_ENDPOINT;
const MW_API = process.env.MW_API;
const MW_USERNAME = process.env.MW_USERNAME;
const MW_PASSWORD = process.env.MW_PASSWORD;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH;

const cookieJar = [];

/**
 * Fetch the specified URL.
 * @param {string} url url
 * @param {Record<string, any>} options options
 * @returns {Promise<any>} response
 */
async function fetchWithCookies(url, options = {}) {
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

async function main() {
    const csrfToken = await getCSRFToken();

    const content_js = await getContentFromRepos("src/JSprite.js");
    await editPage(csrfToken, "MediaWiki:Gadget-JSprite.js", content_js)
    const content_lua = await getContentFromRepos("src/JSprite.lua");
    await editPage(csrfToken, "Module:JSprite", content_lua)
}

/**
 * Log-in to the Wiki and get the CSRF token.
 * @returns {Promise<string>} CSRF token
 */
async function getCSRFToken() {
    //  login token
    let res = await fetchWithCookies(`${MW_API}?action=query&meta=tokens&type=login&format=json`);
    let data = await res.json();
    const loginToken = data.query.tokens.logintoken;

    // login
    res = await fetchWithCookies(`${MW_API}?action=login&format=json`, {
        method: 'POST',
        body: new URLSearchParams({
            lgname: MW_USERNAME,
            lgpassword: MW_PASSWORD,
            lgtoken: loginToken
        }),
    });
    data = await res.json();
    if (data.login.result !== 'Success') {
        console.error('Login failed:', data);
        process.exit(1);
    }

    // csrf token
    res = await fetchWithCookies(`${MW_API}?action=query&meta=tokens&format=json`);
    data = await res.json();
    const csrfToken = data.query.tokens.csrftoken;

    return csrfToken
}

/**
 * Get the source code from the repository.
 * @param {string} path file path
 * @returns {Promise<string>} source code
 */
async function getContentFromRepos(path) {
    const url = `https://api.github.com/repos/${GITHUB_REPOSITORY}/contents/${path}?ref=${GITHUB_BRANCH}`;

    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3.raw'
        }
    });

    if (!res.ok)
        throw new Error(`Failed to fetch file: ${res.statusText}`);

    return await res.text();
}

/**
 * Edit a wiki page.
 * @param {string} csrfToken MediaWiki CSRF Token
 * @param {string} page page title
 * @param {string} content content
 * @returns {Promise<any>} response
 */
async function editPage(csrfToken, page, content) {
    const res = await fetchWithCookies(`${MW_API}?format=json`, {
        method: 'POST',
        body: new URLSearchParams({
            action: 'edit',
            title: page,
            text: content,
            token: csrfToken,
            summary: 'Posted via GitHub Actions',
            bot: 'true'
        }),
    });
    let data = await res.json();
    console.log('Edit response:', JSON.stringify(data, null, 2));

    if (data.edit && data.edit.result === 'Success') {
        console.log('✅ Page edited successfully');
    } else {
        console.error('❌ Failed to edit page');
        process.exit(1);
    }
    return data
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});