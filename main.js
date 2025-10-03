console.log("EXTENSION: bm-identifiers loaded!")
const cache = {};

//Extension should fire/refresh on page change
window.addEventListener("load", () => main(window.location.href))
navigation.addEventListener("navigate", async (event) => {
    main(event.destination.url);
});
//Extension should fire/refresh on page change

async function main(url) {
    checkAndSetupSettingsIfMissing();
    const urlArray = url.split("/");

    if (urlArray[4] && urlArray[4] !== "players") return; //Not player page
    if (!urlArray[5]) return; //Search page

    const bmId = urlArray[5];
    if (isNaN(Number(bmId))) return;

    const authToken = getAuthToken();
    if (!authToken) return;

    const bmProfile = getBmProfileData(bmId, authToken);
    const bmRelations = getBmRelations(bmId, authToken);
    const bmActivity = getBmActivity(bmId, authToken);
    const steamData = getSteamData(bmId, authToken);

    if (!urlArray[6]) onOverviewPage(bmId, bmProfile, steamData, bmActivity);
    if (urlArray[6] && urlArray[6] === "identifiers") console.log("identifierPage"); //for later use
}

async function onOverviewPage(bmId, bmProfile, steamData, bmActivity) {
    const settings = getMainSettings();
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
    if (settings.showAvatar) displayAvatar(bmId, bmProfile, steamData);
    if (settings.removeSteamInfo) removeSteamInformation(bmId);
    if (settings.closeAdminLog) closeAdminLog(bmId);


    const { displaySettings } = await import(chrome.runtime.getURL('./modules/settings.js'));
    displaySettings();

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

function getMainSettings() {
    try {
        return JSON.parse(localStorage.getItem("BME_MAIN_SETTINGS"))
    } catch (error) {
        console.error(`BM-EXTRA: ${error}`)
        return getDefaultMainSettings();
    }
}
function checkAndSetupSettingsIfMissing() {
    checkMainSettings();
    checkBmInfoSettings();
}

function checkMainSettings() {
    try {
        const mainSettings = JSON.parse(localStorage.getItem("BME_MAIN_SETTINGS"));
        if (typeof (mainSettings) !== "object") throw new Error("Settings error");
        if (typeof (mainSettings.showServer) !== "boolean") throw new Error("Settings error");
        if (typeof (mainSettings.showInfoPanel) !== "boolean") throw new Error("Settings error");
        if (typeof (mainSettings.showAvatar) !== "boolean") throw new Error("Settings error");
        if (typeof (mainSettings.removeSteamInfo) !== "boolean") throw new Error("Settings error");
        if (typeof (mainSettings.closeAdminLog) !== "boolean") throw new Error("Settings error");
    } catch (error) {
        const defaultSettings = getDefaultMainSettings();
        localStorage.setItem("BME_MAIN_SETTINGS", JSON.stringify(defaultSettings));
    }
}
function getDefaultMainSettings() {
    const settings = {};
    settings.showServer = true;
    settings.showInfoPanel = true;
    settings.showAvatar = true;
    settings.removeSteamInfo = true;
    settings.closeAdminLog = true;
    return settings;
}
function checkBmInfoSettings() {
    try {
        const bmInfoSettings = JSON.parse(localStorage.getItem("BME_BM_INFO_SETTINGS"));
        if (typeof (bmInfoSettings) !== "object") throw new Error("Settings error");
        if (bmInfoSettings.steamAccountAgeColors) throw new Error("Settings error");
        if (bmInfoSettings.steamGameCountColors) throw new Error("Settings error");
        if (bmInfoSettings.steamCombinedHoursColors) throw new Error("Settings error");
        if (bmInfoSettings.steamRustHoursColors) throw new Error("Settings error");
        if (bmInfoSettings.bmAccountAgeColors) throw new Error("Settings error");
        if (bmInfoSettings.bmAccountAgeColors) throw new Error("Settings error");
        if (bmInfoSettings.serverCountColors) throw new Error("Settings error");
        if (bmInfoSettings.allReportsBarrier) throw new Error("Settings error");
        if (bmInfoSettings.allReportsColor) throw new Error("Settings error");
        if (bmInfoSettings.cheatReportsBarrier) throw new Error("Settings error");
        if (bmInfoSettings.cheatReportsColors) throw new Error("Settings error");
        if (bmInfoSettings.bmRustHoursColors) throw new Error("Settings error");
        if (bmInfoSettings.aimTrainColors) throw new Error("Settings error");
        if (bmInfoSettings.killBarrier) throw new Error("Settings error");
        if (bmInfoSettings.killColors) throw new Error("Settings error");
        if (bmInfoSettings.deathBarrier) throw new Error("Settings error");
        if (bmInfoSettings.deathColors) throw new Error("Settings error");
        if (bmInfoSettings.kdBarrier) throw new Error("Settings error");
        if (bmInfoSettings.kdColors) throw new Error("Settings error");
    } catch (error) {
        const defaultSettings = getDefaultBmInfoSettings();
        localStorage.setItem("BME_BM_INFO_SETTINGS", JSON.stringify(defaultSettings));
    }
}
function getDefaultBmInfoSettings() {
    const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
    const settings = {};
    settings.steamAccountAgeColors = [30 * 24 * 60 * 60 * 1000, 90 * 24 * 60 * 60 * 1000, -1, false]
    settings.steamGameCountColors = [2, -1, -1, false]
    settings.steamCombinedHoursColors = [150, 750, 100000, false]
    settings.steamRustHoursColors = [150, 750, 100000, false]
    settings.gamesLastCheckedColors = [30 * 24 * 60 * 60 * 1000, 60 * 24 * 60 * 60 * 1000, 90 * 24 * 60 * 60 * 1000, true]
    settings.bmAccountAgeColors = [30 * 24 * 60 * 60 * 1000, 90 * 24 * 60 * 60 * 1000, -1, false]
    settings.serverCountColors = [8, -1, -1], false;
    settings.allReportsBarrier = TWO_DAYS;
    settings.allReportsColor = [-1, -1, -1, false];
    settings.cheatReportsBarrier = TWO_DAYS;
    settings.cheatReportsColors = [-1, -1, -1, false];
    settings.bmRustHoursColors = [150, 750, 100000, false];
    settings.aimTrainColors = [25, 50, 100000, false];
    settings.killBarrier = TWO_DAYS;
    settings.killColors = [-1, -1, -1, false];
    settings.deathBarrier = TWO_DAYS;
    settings.deathColors = [-1, -1, -1, false];
    settings.kdBarrier = TWO_DAYS;
    settings.kdColors = [3, -1, -1, false];

    return settings;
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