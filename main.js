console.log("EXTENSION: bm-identifiers loaded!")
const cache = {};

//Extension should fire/refresh on page change
window.addEventListener("load", () => main(window.location.href))
navigation.addEventListener("navigate", async (event) => {
    checkAndSetupSettingsIfMissing();
    main(event.destination.url);
});
//Extension should fire/refresh on page change

async function main(url) {
    const urlArray = url.split("/");

    if (urlArray[4] && urlArray[4] !== "players") return; //Not player page
    if (!urlArray[5]) return; //Search page

    const bmId = urlArray[5];
    if (isNaN(Number(bmId))) return;

    const authToken = getAuthToken();
    if (!authToken) return;

    const bmProfile = getBmProfileData(bmId, authToken);
    const bmRelations = getBmRelations(bmId, authToken);

    if (!urlArray[6]) onOverviewPage(bmId, bmProfile, bmRelations);
    if (urlArray[6] && urlArray[6] === "identifiers") console.log("identifierPage"); //for later use
}

async function onOverviewPage(bmId, bmProfile, bmRelations) {
    const settings = getMainSettings();
    if (!settings) return;
    
    const { displayServerActivity } = await import(chrome.runtime.getURL('./modules/display.js'));

    if(settings.showServer) displayServerActivity(bmProfile);
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

function getMainSettings(params) {
    try {
        return JSON.parse(localStorage.getItem("BME_MAIN_SETTINGS"))
    } catch (error) {
        console.error(`BM-EXTRA: ${error}`)
        return getDefaultSettings();
    }
}
function checkAndSetupSettingsIfMissing() {
    try {
        const mainSettings = JSON.parse(localStorage.getItem("BME_MAIN_SETTINGS"));
        if (typeof(mainSettings) !== "object") throw new Error("Settings error");
        if (typeof (mainSettings.showServer) !== "boolean") throw new Error("Settings error");
    } catch (error) {
        const defaultSettings = getDefaultSettings();
        localStorage.setItem("BME_MAIN_SETTINGS", JSON.stringify(defaultSettings));
    }
}
function getDefaultSettings() {
    const defaultSettings = {};
    defaultSettings.showServer = true;

    return defaultSettings;
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