import fetch from "node-fetch"
import * as core from "@actions/core"

const MW_API = process.env.MW_API
const MW_COOKIE = process.env.MW_COOKIE
const MW_TARGET_PAGE = process.env.MW_TARGET_PAGE

async function getPage() {
    if (!MW_COOKIE || !MW_TARGET_PAGE) {
        throw Error("Page title is not defined.")
    }

    const pageRes = await fetch(`${MW_API}?format=json`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Cookie: MW_COOKIE
        },
        body: new URLSearchParams({
            action: 'query',
            titles: MW_TARGET_PAGE,
            prop: "revisions",
            formatversion: "2",
            rvprop: "content",
            rvslots: "*",
            bot: 'true',
        }),
    });

    const pageData = await pageRes.json()
    const content: string | undefined = pageData?.query?.pages[0]?.revisions[0]?.slots?.main?.content
    const user: string | undefined = pageData?.query?.pages[0]?.revisions[0]?.user
    if (content && user) {
        console.log('✅ Succeeded to get page content');
        console.log(pageData)
        core.setOutput("content", content)
        core.setOutput("user", user)
    } else {
        console.warn('❌ Failed to get page content');
        console.warn(pageData)
        throw Error("Failed to get page content.")
    }
}

getPage().catch((e) => {
    console.warn(e);
})