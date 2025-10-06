console.log("EXTENSION: bm-identifiers loaded!")
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

    const authToken = getAuthToken();
    if (!authToken) return;

    const bmProfile = getBmProfileData(bmId, authToken);
    //const bmRelations = getBmRelations(bmId, authToken);
    const bmActivity = getBmActivity(bmId, authToken);
    const steamData = getSteamData(bmId, authToken);

    if (!urlArray[6]) onOverviewPage(bmId, bmProfile, steamData, bmActivity);
    if (urlArray[6] && urlArray[6] === "identifiers") onIdentifierPage(bmId, bmProfile, steamData, bmActivity)

        
}

async function onOverviewPage(bmId, bmProfile, steamData, bmActivity) {
    const settings = JSON.parse(localStorage.getItem("BME_MAIN_SETTINGS"))
    if (!settings) return console.log(`BM-EXTRA: Main settings is missing!`);

    const {
        displaySettingsButton,
        displayServerActivity,
        displayInfoPanel,
        displayAvatar,
        removeSteamInformation,
        closeAdminLog
    } = await import(chrome.runtime.getURL('./modules/display.js'));

    displaySettingsButton()

    if (settings.showServer) displayServerActivity(bmId, bmProfile);
    if (settings.showInfoPanel) displayInfoPanel(bmId, bmProfile, steamData, bmActivity);
    if (settings.showAvatarOverview) displayAvatar(bmId, bmProfile, steamData);
    if (settings.removeSteamInfo) removeSteamInformation(bmId);
    if (settings.closeAdminLog) closeAdminLog(bmId);

}
async function onIdentifierPage(bmId, bmProfile, steamData, bmActivity) {
    
}



async function getSteamData(bmId, authToken) {
    if (cache[bmId] && cache[bmId]["steamData"]) return cache[bmId]["steamData"]; //If cached, return it from cache.
    try {
        const resp = await fetch(`https://api.battlemetrics.com/players/${bmId}/relationships/steam-profile?version=^0.1.0&access_token=${authToken}`);
        if (resp?.status !== 200) throw new Error(`Failed to request steam data. | Status: ${resp?.status}`);
        const data = resp.json()

        if (!cache[bmId]) cache[bmId] = {};
        cache[bmId]["steamData"] = data; //Store to cache, before returning;

        return data;
    } catch (error) {
        console.error(`BM-EXTRA: ${error}`);
        return null;
    }
}
async function getBmProfileData(bmId, authToken) {
    if (cache[bmId] && cache[bmId]["bmProfile"]) return cache[bmId]["bmProfile"]; //If cached, return it from cache.
    try {
        const resp = await fetch(`https://api.battlemetrics.com/players/${bmId}?version=^0.1.0&include=server,identifier&access_token=${authToken}`);
        if (resp?.status !== 200) throw new Error(`Failed to request profile information. | Status: ${resp?.status}`);
        const data = resp.json()

        if (!cache[bmId]) cache[bmId] = {};
        cache[bmId]["bmProfile"] = data; //Store to cache, before returning;

        return data;
    } catch (error) {
        console.error(`BM-EXTRA: ${error}`);
    }
}
async function getBmRelations() {

}
async function getBmActivity(bmId, authToken) {
    if (cache[bmId] && cache[bmId]["bmActivity"]) return cache[bmId]["bmActivity"]; //If cached, return it from cache.
    try {
        const resp = await fetch(`https://api.battlemetrics.com/activity?version=^0.1.0&tagTypeMode=and&filter[tags][blacklist]=2ff49080-f925-47e4-ab9b-9cdb75575695&filter[types][whitelist]=rustLog:playerReport,rustLog:playerDeath:PVP&filter[players]=${bmId}&include=organization,user&page[size]=100&access_token=${authToken}`);
        if (resp?.status !== 200) throw new Error(`Failed to request player activity. | Status: ${resp?.status}`);
        const data = resp.json()

        if (!cache[bmId]) cache[bmId] = {};
        cache[bmId]["bmActivity"] = data; //Store to cache, before returning;

        return data;
    } catch (error) {
        console.error(`BM-EXTRA: ${error}`);
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