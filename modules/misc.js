export function getAuthToken() {
    const authElement = document.getElementById("oauthToken");
    if (!authElement) {
        console.error("BM-EXTRA: Auth element wasn't found.")
        return null;
    }
    const authToken = authElement.innerText;
    if (!authToken) {
        console.error("BM-EXTRA: Auth Token is missing.")
        return null;
    }

    return authToken;
}

let _rconElement = null;
export async function getRconElement() {
    if (!_rconElement || Date.now() > (_rconElement.timestamp + 150)) {
        _rconElement = {
            timestamp: Date.now(),
            element: findRconElement()
        }
    }
    
    return _rconElement.element;
}
async function findRconElement() {
    let element = document.getElementById("RCONPlayerPage");
    let count = 0;
    while (!element) {
        count++;
        if (count > 50) {
            console.error("BM-EXTRA: Failed to locate the RCONPlayerPage element.");
            return null;
        }
        await new Promise(r => { setTimeout(r, 25 + (count * 5)); })
        element = document.getElementById("RCONPlayerPage");
    }
    return element;
}

const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;
const ONE_MONTH = 30 * ONE_DAY;
const ONE_YEAR = 12 * ONE_MONTH;
export function getTimeString(timestamp, left = false) {
    let since = null;

    if (left) {
        since = timestamp;
    }else{
        const now = Date.now();
        since = now - timestamp;
    } 

    if (since > ONE_YEAR) return `${(since / ONE_YEAR).toFixed(1)} years`;
    if (since > ONE_MONTH) return `${(since / ONE_MONTH).toFixed(1)} months`;
    if (since > ONE_DAY) return `${Math.floor(since / ONE_DAY)} days`;
    if (since > ONE_HOUR) return `${Math.floor(since / ONE_HOUR)} hours`;
    if (since > ONE_MINUTE) return `${Math.floor(since / ONE_MINUTE)} minutes`;
    if (since > ONE_SECOND) return `${Math.floor(since / ONE_SECOND)} seconds`
    return "NaN";
}
export function getBmInfoTimeString(timestamp) {
    if (timestamp > (3 * ONE_DAY)) return `${Math.floor(timestamp / ONE_DAY)} days`;
    if (timestamp > ONE_HOUR) return `${Math.floor(timestamp / ONE_HOUR)} hours`;
    if (timestamp > ONE_MINUTE) return `${Math.floor(timestamp / ONE_MINUTE)} minutes`;
    if (timestamp > ONE_SECOND) return `${Math.floor(timestamp / ONE_SECOND)} seconds`
    return "NaN";
}


export async function getSteamFriendlistFromSteam(steamId) {
    try {
        const STEAM_API_KEY = localStorage.getItem("BME_STEAM_API_KEY");
        if (!STEAM_API_KEY) return "NO_API_KEY";

        let value = null;
        chrome.runtime.onMessage.addListener(function (response) {
            if (response.type !== "BME_STEAM_FRIENDLIST_RESOLVED") return;
            if (response.status === "ERROR") throw new Error(`Failed to request steam friends: \n  ${response.message}`);

            value = response.value;
        })

        chrome.runtime.sendMessage({ type: "BME_STEAM_FRIENDLIST", subject: steamId, apiKey: STEAM_API_KEY });
        while (!value) await new Promise(r => { setTimeout(r, 10); })
        return value;
    } catch (error) {
        console.log(error);
        return "ERROR";
    }
}
export async function getSteamFriendlistFromRustApi(steamId) {
    try {
        const RUST_API_KEY = localStorage.getItem("BME_RUST_API_KEY");
        if (!RUST_API_KEY) return "NO_API_KEY";

        let value = null;
        chrome.runtime.onMessage.addListener(function (response) {
            if (response.type !== "BME_RUST_API_FRIENDLIST_RESOLVED") return;
            if (response.status === "ERROR") throw new Error(`Failed to request rust api friends: \n  ${response.message}`);

            value = response.value;
        })

        chrome.runtime.sendMessage({ type: "BME_RUST_API_FRIENDLIST", subject: steamId, apiKey: RUST_API_KEY });
        while (!value) await new Promise(r => { setTimeout(r, 10); })
        return value;
    } catch (error) {
        console.log(error);
        return "ERROR";
    }
}