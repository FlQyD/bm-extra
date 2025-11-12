console.log("EXTENSION: bm-extra loaded!")
const cache = {};

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

    if (!urlArray[6]) onOverviewPage(bmId, cache.bmProfile, cache.steamData, cache.bmActivity, cache.bmBanData);
    if (urlArray[6] && urlArray[6] === "identifiers") onIdentifierPage(cache.bmId, cache.bmProfile, cache.steamData, cache.bmActivity)
}

async function onOverviewPage(bmId, bmProfile, steamData, bmActivity, bmBanData) {
    const settings = JSON.parse(localStorage.getItem("BME_MAIN_SETTINGS"))
    if (!settings) return console.log(`BM-EXTRA: Main settings is missing!`);

    const {
        displaySettingsButton, displayServerActivity, displayInfoPanel, displayAvatar,
        removeSteamInformation, insertSidebars, closeAdminLog, advancedBans,
    } = await import(chrome.runtime.getURL('./modules/display.js'));

    displaySettingsButton();
    insertSidebars();
    if (settings.showServer) displayServerActivity(bmId, bmProfile);
    if (settings.showInfoPanel) displayInfoPanel(bmId, bmProfile, steamData, bmActivity);
    if (settings.showAvatarOverview) displayAvatar(bmId, bmProfile, steamData);
    if (settings.removeSteamInfo) removeSteamInformation(bmId);
    if (settings.advancedBans) advancedBans(bmId, bmBanData);
    if (settings.closeAdminLog) closeAdminLog(bmId);


}
async function onIdentifierPage(bmId, bmProfile, steamData, bmActivity) {

}


function setupCacheFor(bmId) {
    const authToken = localStorage.getItem("BME_BATTLEMETRICS_API_KEY");
    if (!authToken) return;

    cache.bmProfile = getBmProfileData(bmId, authToken);
    cache.steamFriends = getSteamFriends(cache.bmProfile, "steam"); 
    cache.historicFriends = {}
    cache.historicFriends.rustApi = getSteamFriends(cache.bmProfile, "rust-api"); 
    //cache.historicFriends.steamidCom
    //cache.historicFriends.steamidUk

    cache.bmActivity = getBmActivity(bmId, authToken);
    cache.steamData = getSteamData(bmId, authToken);
    cache.bmBanData = getBmBanData(bmId, authToken);
}
async function getSteamData(bmId, authToken) {
    try {
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

    if (type === "steam") {
        const STEAM_API_KEY = localStorage.getItem("BME_STEAM_API_KEY");
        return getSteamFriendlistFromSteam(steamId, STEAM_API_KEY);
    }
    
    if (type === "rust-api") {
        const RUST_API_KEY = localStorage.getItem("BME_RUST_API_KEY");
        return getSteamFriendlistFromRustApi(steamId, RUST_API_KEY);
    }
    return undefined;
}
async function getSteamFriendlistFromSteam(steamId, STEAM_API_KEY) {
    try {
        if (!STEAM_API_KEY) return "NO API KEY";

        let value = null;
        chrome.runtime.onMessage.addListener(function (response) {
            if (response.type !== "BME_STEAM_FRIENDLIST_RESOLVED") return;
            if (response.status === "ERROR") throw new Error(`Failed to request steam friends: \n  ${response.message}`);

            value = response.value;
        })

        chrome.runtime.sendMessage({ type: "BME_STEAM_FRIENDLIST", steamId: steamId, apiKey: STEAM_API_KEY });
        while(!value) await new Promise(r => {setTimeout(r, 25);})
        return value;
    } catch (error) {
        console.log(error);
        return "ERROR";
    }
}
async function getSteamFriendlistFromRustApi(steamId, RUST_API_KEY) {
    try {
        if (!RUST_API_KEY) return "NO API KEY";

        let value = null;
        chrome.runtime.onMessage.addListener(function (response) {
            if (response.type !== "BME_RUST_API_FRIENDLIST_RESOLVED") return;
            console.log(response);
            
            if (response.status === "ERROR") throw new Error(`Failed to request rust api friends: \n  ${response.message}`);

            value = response.value;
        })

        chrome.runtime.sendMessage({ type: "BME_RUST_API_FRIENDLIST", steamId: steamId, apiKey: RUST_API_KEY });
        while (!value) await new Promise(r => { setTimeout(r, 25); })
        return value;
    } catch (error) {
        console.log(error);
        return "ERROR";
    }
}