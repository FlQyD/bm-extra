console.log("EXTENSION: bm-extra loaded!")
const cache = {};
cache.connectedPlayersData = [];
cache.connectedPlayersBanData = [];

const connectedPlayersData = new Proxy(cache.connectedPlayersData, {
    set(target, prop, value) {
        target[prop] = value;
        if (prop === "length") invokePlayerProfileUpdates();
        return true;
    }
});
const connectedPlayersBanData = new Proxy(cache.connectedPlayersBanData, {
    set(target, prop, value) {
        target[prop] = value;
        if (prop === "length") invokePlayerProfileUpdates();
        return true;
    }
});
async function invokePlayerProfileUpdates() {
    const { updatePlayerProfileElements } = await import(chrome.runtime.getURL('./modules/display.js'));
    updatePlayerProfileElements(cache)
}


//Extension should fire/refresh on page change
window.addEventListener("load", () => main(window.location.href))
navigation.addEventListener("navigate", async (event) => {
    main(event.destination.url);
});
//Extension should fire/refresh on page change

async function main(url) {
    const { checkAndSetupSettingsIfMissing } = await import(chrome.runtime.getURL('./modules/settings.js'));
    checkAndSetupSettingsIfMissing();

    const urlArray = url.split("/");

    if (urlArray[4] && urlArray[4] !== "players") return; //Not player page
    if (!urlArray[5]) return; //Search page

    const bmId = urlArray[5];
    if (isNaN(Number(bmId))) return;

    if (!cache[bmId]) setupCacheFor(bmId);

    if (!urlArray[6]) onOverviewPage(bmId);
    if (urlArray[6] && urlArray[6] === "identifiers") onIdentifierPage(bmId, cache[bmId].bmProfile, cache[bmId].steamData, cache[bmId].bmActivity)
}

async function onOverviewPage(bmId) {
    const settings = JSON.parse(localStorage.getItem("BME_MAIN_SETTINGS"))
    if (!settings) return console.error(`BM-EXTRA: Main settings are missing!`);
    const sidebarSettings = JSON.parse(localStorage.getItem("BME_SIDEBAR_SETTINGS"));
    if (!sidebarSettings) return console.error(`BME-EXTRA: Sidebar settings are missing!`)

    const {
        displaySettingsButton, displayServerActivity, displayInfoPanel, displayAvatar,
        removeSteamInformation, insertSidebars, closeAdminLog, advancedBans, insertFriendsSidebarElement
    } = await import(chrome.runtime.getURL('./modules/display.js'));

    const playerCache = cache[bmId];
    const bmProfile = playerCache.bmProfile;
    const steamData = playerCache.steamData;
    const bmActivity = playerCache.bmActivity;
    const bmBanData = playerCache.bmBanData;
    const steamFriends = playerCache.steamFriends;

    displaySettingsButton();
    if (settings.showServer) displayServerActivity(bmId, bmProfile);
    if (settings.showInfoPanel) displayInfoPanel(bmId, bmProfile, steamData, bmActivity);
    if (settings.showAvatarOverview) displayAvatar(bmId, bmProfile, steamData);
    if (settings.removeSteamInfo) removeSteamInformation(bmId);
    if (settings.advancedBans) advancedBans(bmId, bmBanData);
    if (settings.closeAdminLog) closeAdminLog(bmId);
    
    await insertSidebars();
    if (sidebarSettings.friends.enabled) insertFriendsSidebarElement(bmId, steamFriends, cache.connectedPlayersData, cache.connectedPlayersBanData)
}
async function onIdentifierPage(bmId, bmProfile, steamData, bmActivity) {

}


function setupCacheFor(bmId) {
    const authToken = localStorage.getItem("BME_BATTLEMETRICS_API_KEY");
    if (!authToken) return;

    if (!cache[bmId]) cache[bmId] = {};
    cache[bmId].bmProfile = getBmProfileData(bmId, authToken);
    cache[bmId].steamFriends = getSteamFriends(cache[bmId].bmProfile, "steam");
    cache[bmId].historicFriends = {}
    cache[bmId].historicFriends.rustApi = getSteamFriends(cache[bmId].bmProfile, "rust-api");
    //cache.historicFriends.steamidCom
    //cache.historicFriends.steamidUk

    cache[bmId].bmActivity = getBmActivity(bmId, authToken);
    cache[bmId].steamData = getSteamData(bmId);
    cache[bmId].bmBanData = getBmBanData(bmId, authToken);

    loadPlayerData(cache[bmId].steamFriends, cache[bmId].historicFriends.rustApi);
}
async function getSteamData(bmId) {
    try {
        const authToken = getAuthToken();
        if (!authToken) return console.error(`BME-EXTRA: Missing auth token.`);

        const resp = await fetch(`https://api.battlemetrics.com/players/${bmId}/relationships/steam-profile?version=^0.1.0&access_token=${authToken}`);
        if (resp?.status !== 200) throw new Error(`Failed to request steam data. | Status: ${resp?.status}`);

        const data = resp.json()
        return data;
    } catch (error) {
        console.error(`BM-EXTRA: ${error}`);
        return null;
    }
}
async function getBmProfileData(bmId, authToken) {
    try {
        const resp = await fetch(`https://api.battlemetrics.com/players/${bmId}?version=^0.1.0&include=server,identifier&access_token=${authToken}`);
        if (resp?.status !== 200) throw new Error(`Failed to request profile information. | Status: ${resp?.status}`);

        const data = resp.json()
        return data;
    } catch (error) {
        console.error(`BM-EXTRA: ${error}`);
        return null;
    }
}
async function getBmRelations() {

}
async function getBmBanData(bmId, authToken) {
    try {
        const resp = await fetch(`https://api.battlemetrics.com/bans?version=^0.1.0&filter[player]=${bmId}&filter[expired]=true&access_token=${authToken}`);
        if (resp?.status !== 200) throw new Error(`Failed to request player activity. | Status: ${resp?.status}`);

        const data = await resp.json();
        return data;
    } catch (error) {
        console.error(`BM-EXTRA: ${error}`);
        return null;
    }
}
async function getBmActivity(bmId, authToken) {
    try {
        const resp = await fetch(`https://api.battlemetrics.com/activity?version=^0.1.0&tagTypeMode=and&filter[tags][blacklist]=2ff49080-f925-47e4-ab9b-9cdb75575695&filter[types][whitelist]=rustLog:playerReport,rustLog:playerDeath:PVP&filter[players]=${bmId}&include=organization,user&page[size]=1000&access_token=${authToken}`);
        if (resp?.status !== 200) throw new Error(`Failed to request player activity. | Status: ${resp?.status}`);

        const data = await resp.json()
        return data;
    } catch (error) {
        console.error(`BM-EXTRA: ${error}`);
    }
}
async function getSteamFriends(bmProfile, type) {
    bmProfile = await bmProfile;
    const steamIdObject = bmProfile.included.find(identifier => identifier?.attributes?.type === "steamID");
    const steamId = steamIdObject?.attributes?.identifier;
    if (!steamId) {
        console.error(`BM-EXTRA: steamID wasn't found in identifiers, steam friends cannot be loaded!`);
        return null;
    }

    if (type === "steam") return getSteamFriendlistFromSteam(steamId);
    if (type === "rust-api") return getSteamFriendlistFromRustApi(steamId);
    return undefined;
}
async function getSteamFriendlistFromSteam(steamId) {
    try {
        const STEAM_API_KEY = localStorage.getItem("BME_STEAM_API_KEY");
        if (!STEAM_API_KEY) return "NO API KEY";

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
async function getSteamFriendlistFromRustApi(steamId) {
    try {
        const RUST_API_KEY = localStorage.getItem("BME_RUST_API_KEY");
        if (!RUST_API_KEY) return "NO API KEY";

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
async function loadPlayerData(friends, historicFriends) {
    friends = await friends;
    historicFriends = await historicFriends;

    const uniqueSteamIds = [];

    friends.forEach(friend => { if (!uniqueSteamIds.includes(friend.steamId)) uniqueSteamIds.push(friend.steamId) });
    historicFriends.forEach(friend => { if (!uniqueSteamIds.includes(friend.steamId)) uniqueSteamIds.push(friend.steamId) });

    for (let i = 0; i < uniqueSteamIds.length; i += 100){
        requestAndProcessPlayerData(uniqueSteamIds.slice(i, i + 100));
        requestAndProcessPlayerBanData(uniqueSteamIds.slice(i, i + 100));
    }
}
async function requestAndProcessPlayerData(players) {
    const playersData = await getPlayerSummariesFromSteam(players);
    if (typeof (playersData) === "string") return console.error(`BME-EXTRA: Failed to load in player data for ${players.join(", ")}`);

    connectedPlayersData.push(...playersData)
}
async function getPlayerSummariesFromSteam(steamIds) {
    try {
        const STEAM_API_KEY = localStorage.getItem("BME_STEAM_API_KEY");
        if (!STEAM_API_KEY) return "NO API KEY";

        const requestId = Math.floor(Math.random() * 100000);

        let value = null;
        chrome.runtime.onMessage.addListener(function (response) {
            if (response.type !== `BME_PLAYER_SUMMARIES_${requestId}_RESOLVED`) return;
            if (response.status === "ERROR") throw new Error(`Failed to request player summaries: \n  ${response.message}`);

            value = response.value;
        })

        chrome.runtime.sendMessage({ type: `BME_PLAYER_SUMMARIES_${requestId}`, subject: steamIds.join(","), apiKey: STEAM_API_KEY });
        while (!value) await new Promise(r => { setTimeout(r, 10); })
        return value;
    } catch (error) {
        console.log(error);
        return "ERROR";
    }
}
async function requestAndProcessPlayerBanData(players) {
    const playersData = await getBanSummariesFromSteam(players);
    if (typeof (playersData) === "string") return console.error(`BME-EXTRA: Failed to load in player data for ${players.join(", ")}`);

    connectedPlayersBanData.push(...playersData)
}
async function getBanSummariesFromSteam(steamIds) {
    try {
        const STEAM_API_KEY = localStorage.getItem("BME_STEAM_API_KEY");
        if (!STEAM_API_KEY) return "NO API KEY";

        const requestId = Math.floor(Math.random() * 100000);

        let value = null;
        chrome.runtime.onMessage.addListener(function (response) {
            if (response.type !== `BME_BAN_SUMMARIES_${requestId}_RESOLVED`) return;
            if (response.status === "ERROR") throw new Error(`Failed to request player summaries: \n  ${response.message}`);

            value = response.value;
        })

        chrome.runtime.sendMessage({ type: `BME_BAN_SUMMARIES_${requestId}`, subject: steamIds.join(","), apiKey: STEAM_API_KEY });
        while (!value) await new Promise(r => { setTimeout(r, 10); })
        return value;
    } catch (error) {
        console.log(error);
        return "ERROR";
    }
}
function getAuthToken() {
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