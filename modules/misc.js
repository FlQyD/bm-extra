const IDENTIFIER_TABLE_CLASS_NAME = "css-11gv980";
const MAIN_ELEMENT_CLASS_NAME = "main";
const RCON_PLAYER_PAGE_ID = "RCONPlayerPage";
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
    if (!_rconElement || Date.now() > (_rconElement.timestamp + 50)) {
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

let running = false;
let _main = null;
export async function getMain() {
    if ((!_main || Date.now() > (_main.timestamp + 100)) && !running) {
        _main = {
            timestamp: Date.now(),
            element: findMain()
        }
    }

    return _main.element;
}
async function findMain() {
    running = true;
    try {
        const url = window.location.href;
        if (url.includes("players") && url.split("/").length == 6) 
            return await getMainFromRconElement();
        
        return await getMainElement()
    } catch (error) {
        console.error(error);
    } finally {
        running = false
    }
}
async function getMainFromRconElement() {
    let element = document.getElementById(RCON_PLAYER_PAGE_ID);
    let count = 0;
    while (!element) {
        count++;
        if (count > 100) {
            console.error("BM-EXTRA: Failed to locate the main element.");
            return null;
        }
        await new Promise(r => { setTimeout(r, 25 + (count * 5)); })
        element = document.getElementById(RCON_PLAYER_PAGE_ID);
    }
    return element.parentElement;

}
async function getMainElement() {
    let element = document.getElementsByClassName(MAIN_ELEMENT_CLASS_NAME)[0];
    let count = 0;
    while (!element) {
        count++;
        if (count > 100) {
            console.error("BM-EXTRA: Failed to locate the main element.");
            return null;
        }
        await new Promise(r => { setTimeout(r, 25 + (count * 5)); })
        element = document.getElementsByClassName(MAIN_ELEMENT_CLASS_NAME)[0];
    }
    return element;

}

let _identifierTable = null;
export async function getIdentifierTable() {
    if (!_identifierTable || Date.now() > (_identifierTable.timestamp + 50)) {
        _identifierTable = {
            timestamp: Date.now(),
            element: findIdentifierTable()
        }
    }

    return _identifierTable.element;
}
async function findIdentifierTable() {
    let element = document.getElementsByClassName(IDENTIFIER_TABLE_CLASS_NAME);
    let count = 0;
    while (!element[0]) {
        count++;
        if (count > 50) {
            console.error("BM-EXTRA: Failed to locate the Identifier table element.");
            return null;
        }
        await new Promise(r => { setTimeout(r, 25 + (count * 5)); })
        element = document.getElementsByClassName(IDENTIFIER_TABLE_CLASS_NAME);
    }
    return element[0].lastChild.children;
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
    } else {
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
export function getStreamerModeName(steamId) {
    const names = JSON.parse(localStorage.getItem("BME_SM_NAMES"))?.names;
    if (!names) return null;

    let v = BigInt(steamId) % 2147483647n;
    v = v % BigInt(names.length);

    return names[Number(v)];
}
export function checkIfAlright(bmId, elementId) {
    const urlId = location.href.split("/")[5];
    if (urlId !== bmId) return true; //Page changed
    if (elementId) {
        const elementCheck = document.getElementById(elementId);
        if (elementCheck) return true; //Already exist
    }
    return false; //Good to go!
}