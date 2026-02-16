export const rustApiKeyPermissionBits = {
    historicFriends: 54,
    historicAvatars: 56,
    publicBans: 57,
};

const _getElement = {};
/**
 * Returns a Promise that contains either the element or null if it cannot be found on the page.
 * @param {String} identifier 
 * @param {Boolean} isClass 
 * @returns {Promise<HTMLElement | null>}
 */
export function getElementWhenAppears(identifier, isClass) {
    identifier = isClass ? `.${identifier}` : `#${identifier}`;
    if (!_getElement[identifier] || Date.now() > (_getElement[identifier].timestamp + 50)) {
        _getElement[identifier] = {
            timestamp: Date.now(),
            element: findElementWhenAppears(identifier)
        }
    }

    return _getElement[identifier].element;
}
const MAX_ATTEMPTS = 100;
const BASE_DELAY_MS = 25;
const INCREMENTING_DELAY_MS = 5;
async function findElementWhenAppears(selector) {
    let element = document.querySelector(selector);
    let count = 0;

    while (count < MAX_ATTEMPTS) {
        element = document.querySelector(selector);
        if (element) return element;

        const delay = BASE_DELAY_MS + (count * INCREMENTING_DELAY_MS)
        await new Promise(r => setTimeout(r, delay));
        count++;
    }
    return null;
}

const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;
const ONE_MONTH = 30 * ONE_DAY;
const ONE_YEAR = 12 * ONE_MONTH;
export function getTimeString(timestamp, isDuration = false) {
    let since = null;

    if (isDuration) {
        since = timestamp;
    } else {
        const now = Date.now();
        since = now - timestamp;
    }

    if (since > ONE_YEAR) return plural((since / ONE_YEAR).toFixed(1), "year");
    if (since > ONE_MONTH) return plural((since / ONE_MONTH).toFixed(1), "month");
    if (since > ONE_DAY) return plural(Math.floor(since / ONE_DAY), "day");
    if (since > ONE_HOUR) return plural(Math.floor(since / ONE_HOUR), "hour");
    if (since > ONE_MINUTE) return plural(Math.floor(since / ONE_MINUTE), "minute");
    if (since > ONE_SECOND) return plural(Math.floor(since / ONE_SECOND), "second");
    return `${since} ms`;
}
export function getBmInfoTimeString(timestamp) {
    if (timestamp > (3 * ONE_DAY)) return `${Math.floor(timestamp / ONE_DAY)} days`;
    if (timestamp > ONE_HOUR) return plural(Math.floor(timestamp / ONE_HOUR), "hour");
    if (timestamp > ONE_MINUTE) return plural(Math.floor(timestamp / ONE_MINUTE), "minute");
    if (timestamp > ONE_SECOND) return plural(Math.floor(timestamp / ONE_SECOND), "second");
    return `${timestamp} ms`;
}
function plural(value, unit) {
    if (Math.floor(value) === 1) return `${value} ${unit}`;
    return `${value} ${unit}s`;
}

export async function getSteamFriendlistFromSteam(steamId) {
    try {
        const STEAM_API_KEY = localStorage.getItem("BME_STEAM_API_KEY");
        if (!STEAM_API_KEY) return "NO_API_KEY";

        return await talkToBackgroundScript("BME_STEAM_FRIENDLIST", steamId, STEAM_API_KEY)
    } catch (error) {
        console.error(error);
        if (error.message === "TIMEOUT") return error.message;
        return "ERROR";
    }
}
export async function getSteamFriendlistFromRustApi(steamId) {
    try {
        const RUST_API_KEY = localStorage.getItem("BME_RUST_API_KEY");
        if (!RUST_API_KEY) return "NO_API_KEY";
        if (RUST_API_KEY.length !== 64) return "INVALID_API_KEY";
        if (RUST_API_KEY[rustApiKeyPermissionBits.historicFriends] !== "1") return "MISSING_PERMISSION"

        return await talkToBackgroundScript("BME_RUST_API_FRIENDLIST", steamId, RUST_API_KEY);
    } catch (error) {
        console.error(error);
        if (error.message === "TIMEOUT") return "TIMEOUT";
        return "ERROR";
    }
}

export function getStreamerModeName(steamId) {
    try {
        const names = JSON.parse(localStorage.getItem("BME_SM_NAMES"))?.names;
        if (!names?.length) return null;

        //FP code
        let v = BigInt(steamId) % 2147483647n;
        v = v % BigInt(names.length);

        return names[Number(v)];
    } catch (error) {
        console.error(error);
        return null;
    }
}

export function shouldAbort(bmId, elementId, pageId) {
    const urlPaths = new URL(location.href).pathname.split("/").filter(Boolean);

    const urlId = urlPaths[2] || null;
    if (urlId !== bmId) return true; //Page changed

    if (elementId) {
        const elementCheck = document.getElementById(elementId);
        if (elementCheck) return true; //Already exist
    }

    if (pageId === "overview") {
        if (!urlPaths.includes("players")) return true;
        if (urlPaths.length !== 3) return true;
    }

    return false; //Good to go!
}

export async function getLastServer(bmProfile, onlyMyServer) {
    const myServers = await getMyServers(true);
    if (!myServers) return null;

    let servers = bmProfile.included
        .filter(item => item.type === "server")
        .map(server => {
            return {
                name: server.attributes?.name,
                id: server.id,
                orgId: server?.relationships?.organization?.data?.id,
                lastPlayed: new Date(server.meta.lastSeen).getTime(),
                online: server.meta.online,
            }
        })
        .sort((a, b) => b.lastPlayed - a.lastPlayed);


    if (onlyMyServer) {
        servers = servers.filter(item => myServers.includes(item.id));
        const lastServer = servers[0];
        if (!lastServer) return null;
        return lastServer;
    }

    const lastServer = servers[0];
    if (!lastServer) return null;
    return lastServer
}

async function fetchMyServers(token) {
    const responses = [];
    if (!await fetchServers(`https://api.battlemetrics.com/servers?filter[rcon]=true&page[size]=100&access_token=${token}`)) return null;

    const json = responses[0];
    for (let i = 1; i < responses.length; i++) {
        json.data.push(...responses[i].data);
    }
    json.links = undefined;
    json.included = undefined;

    return json;

    async function fetchServers(url) {
        const response = await fetch(url);
        if (!response.ok) return false;

        const json = await response.json();
        responses.push(json);

        if (json.links.next) await fetchServers(json.links.next + `&access_token=${token}`);
        return true;
    }
}

export async function getMyServers(onlyIds) {
    const externalAuthToken = localStorage.getItem("BME_BATTLEMETRICS_API_KEY");
    const internalAuthToken = !externalAuthToken ? getAuthToken() : null;
    const token = externalAuthToken ? externalAuthToken : internalAuthToken;

    let myServers = JSON.parse(localStorage.getItem("BME_MY_SERVER_CACHE"));
    if (myServers && myServers.timestamp > Date.now() - 24 * 60 * 60 * 1000) {
        if (onlyIds) return myServers.servers.map(server => server.id);
        else return myServers.servers;
    }

    const data = await fetchMyServers(token);
    if (data == null) {
        console.error(`Failed to request your servers`);
        return null;
    }

    myServers = {
        timestamp: Date.now(),
        servers: data.data.map(server => {
            return {
                id: server.id,
                name: server?.attributes?.name,
                orgId: server?.relationships?.organization?.data?.id
            }
        })
    }

    console.log(`BM-EXTRA: Fetched ${myServers.servers.length} servers`);

    localStorage.setItem("BME_MY_SERVER_CACHE", JSON.stringify(myServers))
    if (onlyIds) return myServers.servers.map(server => server.id);
    else return myServers.servers;
}
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

export function setNativeValue(select, value, highlight) {
    const originalValue = select.value;

    select.value = value;
    if (select.value !== value) {
        select.value = originalValue;
        if (highlight) highlightElement(select, "red");
        return;
    }
    if (highlight) highlightElement(select, "green");

    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
}
function highlightElement(element, color) {
    element.classList.add(`bme-${color}-change`);
    setTimeout(() => { element.classList.remove(`bme-${color}-change`); }, 400);
}

export function getSteamIdObject(array) {
    const steamId = array.find(item => {
        if (item.type !== "identifier") return false;
        if (item.attributes?.type !== "steamID") return false;
        return true;
    })
    return steamId;
}

export function getIdentifierType(identifier) {
    const innerText = identifier?.children[1]?.innerText;
    const type = Boolean(innerText) ? innerText.trim() : null;
    if (type === null) return { type, id: null };

    const typeElements = identifier?.childNodes[1].children;
    const offset = type === "Name" ? 1 : 2;
    const searchLink = typeElements[typeElements.length - offset]?.href;
    const id = searchLink ? searchLink.split("=")[1] : null;
    return { type, id }
}

export function talkToBackgroundScript(type, subject, apiKey) {
    const requestId = Math.floor(Math.random() * 1000000);
    type = `${type}_${requestId}`;

    return new Promise((resolve, reject) => {
        function handler(response) {
            if (response?.type !== `${type}_RESOLVED`) return;

            clearTimeout(timer);
            chrome.runtime.onMessage.removeListener(handler);

            if (response.status === "ERROR") reject(new Error(response.message || "ERROR"));
            else resolve(response.value);
        }

        const timer = setTimeout(() => {
            chrome.runtime.onMessage.removeListener(handler);
            reject(new Error(`TIMEOUT`));
        }, 10000);

        chrome.runtime.onMessage.addListener(handler);
        chrome.runtime.sendMessage({ type, subject, apiKey });
    });
}

export function removeSidebars() {
    const elementsToRemove = document.querySelectorAll(".bme-sidebar");
    elementsToRemove.forEach(item => item.remove())
}