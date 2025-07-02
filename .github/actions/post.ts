import fetch from "node-fetch"
import * as core from "@actions/core"
import * as github from "@actions/github"

const MW_API = process.env.MW_API;
const MW_CSRF_TOKEN = process.env.MW_CSRF_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const MW_TARGET_PAGE = process.env.MW_TARGET_PAGE;
const GITHUB_TARGET_DIR = process.env.GITHUB_TARGET_DIR;
const MW_COOKIE = process.env.MW_COOKIE

/**
 * Get the source code from the repository.
 * @param {string} path file path
 * @returns {Promise<string>} source code
 */
async function getContentFromRepos(path: string) {
    if (!(GITHUB_TOKEN)) {
        throw new Error("no env values.")
    }

    const repo = github.context.repo
    const branch = github.context.ref
    const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/contents/${path}?ref=${branch}`;

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
 * @param {string} page page title
 * @param {string} content content
 * @returns {Promise<any>} response
 */
async function editPage(page: string, content: string) {
    if (!(MW_API && MW_CSRF_TOKEN && MW_COOKIE)) {
        throw new Error("no env values.")
    }

    const res = await fetch(`${MW_API}?format=json`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Cookie: MW_COOKIE
        },
        body: new URLSearchParams({
            action: 'edit',
            title: page,
            text: content,
            token: MW_CSRF_TOKEN,
            summary: 'Posted via GitHub Actions',
            bot: 'true'
        }),
    });
    const data = await res.json();
    console.log('Edit response:', JSON.stringify(data, null, 2));

    if (data.edit && data.edit.result === 'Success') {
        console.log('✅ Page edited successfully');
    } else {
        console.warn('❌ Failed to edit page');
        console.warn(data)
        throw Error(data.error.info)
    }
    return data
}

async function main() {
    try {
        if (!(MW_TARGET_PAGE && GITHUB_TARGET_DIR)) {
            throw Error("no env values.")
        }
        const content = await getContentFromRepos(GITHUB_TARGET_DIR)
        await editPage(MW_TARGET_PAGE, content)
    } catch (e) {
        console.warn(e)
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
})
