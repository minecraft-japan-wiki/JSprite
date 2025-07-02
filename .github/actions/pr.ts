import fs from 'fs';
import path from 'path';
import * as github from "@actions/github"
import { execSync } from 'child_process';
import { Octokit } from '@octokit/rest';

// 入力を受け取る
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_TARGET_DIR = process.env.GITHUB_TARGET_DIR
const MW_PAGE_CONTENT = process.env.MW_PAGE_CONTENT

async function main() {
    if (!GITHUB_TOKEN || !GITHUB_TARGET_DIR || !MW_PAGE_CONTENT) {
        throw Error('Missing required environment info.');
    }

    const repo = github.context.repo
    const uploadedContent = normalizeNewlines(MW_PAGE_CONTENT);

    function normalizeNewlines(text: string): string {
        return text.replace(/\r\n|\r/g, '\n');
    }

    // 現在のファイル内容を読み取り
    let currentContent = await getContentFromRepos(GITHUB_TARGET_DIR)

    // 差分なしなら終了
    if (currentContent === uploadedContent) {
        console.log('No changes detected.');
        return
    }

    // 差分あり：Git処理準備
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
    const branchName = `auto/update-file-${timestamp}`;
    const commitMessage = 'chore: auto-update file';

    execSync('git config user.name "github-actions[bot]"');
    execSync('git config user.email "github-actions[bot]@users.noreply.github.com"');
    execSync(`git checkout -b ${branchName}`);

    // 書き込みとコミット
    fs.writeFileSync(GITHUB_TARGET_DIR, uploadedContent);
    execSync(`git add ${GITHUB_TARGET_DIR}`);
    execSync(`git commit -m "${commitMessage}"`);
    execSync(`git push origin ${branchName}`);

    // OctokitでPRをチェック・作成
    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    (async () => {
        const existingPRs = await octokit.pulls.list({
            owner: repo.owner,
            repo: repo.repo,
            state: 'open',
            head: `${repo.owner}:${branchName}`,
        });

        if (existingPRs.data.length > 0) {
            console.log(`PR already exists for branch: ${branchName}`);
            return
        }

        const pr = await octokit.pulls.create({
            owner: repo.owner,
            repo: repo.repo,
            title: 'Auto Update: File content',
            head: branchName,
            base: 'main',
            body: 'This PR updates the file based on uploaded content.',
        });

        console.log(`PR created: ${pr.data.html_url}`);
    })()
}

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


main().catch((e) => {
    console.warn(e)
})