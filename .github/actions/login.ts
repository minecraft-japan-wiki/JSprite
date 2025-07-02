import core from "@actions/core"

const MW_API = process.env.MW_API;
const MW_USERNAME = process.env.MW_USERNAME;
const MW_PASSWORD = process.env.MW_PASSWORD;

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
        const tokenRes = await fetch(`${MW_API}?action=query&meta=tokens&type=login&format=json`);
        const tokenData = await tokenRes.json();
        const loginToken = tokenData.query.tokens.logintoken;

        // login
        const loginRes = await fetch(`${MW_API}?action=login&format=json`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                lgname: MW_USERNAME,
                lgpassword: MW_PASSWORD,
                lgtoken: loginToken
            }),
        });
        const loginData = await loginRes.json();
        if (loginData?.login?.result !== 'Success') {
            throw Error('Login failed.');
        }

        // csrf token
        const csrfTokenRes = await fetch(`${MW_API}?action=query&meta=tokens&format=json`);
        const csrfTokenData = await csrfTokenRes.json();
        const csrfToken = csrfTokenData.query.tokens.csrftoken;

        return csrfToken
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

getCSRFToken().then((token) => {
    core.setOutput("token", token)
}).catch((e) => {
    console.error(e);
    process.exit(1);
})