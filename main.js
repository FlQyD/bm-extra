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
    const { updatePlayerProfileElements } = await import(chrome.runtime.getURL('./modules/sidebar.js'));
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
    const settings = JSON.parse(localStorage.getItem("BME_OVERVIEW_SETTINGS"))
    if (!settings) return console.error(`BM-EXTRA: Main settings are missing!`);
    const sidebarSettings = JSON.parse(localStorage.getItem("BME_SIDEBAR_SETTINGS"));
    if (!sidebarSettings) return console.error(`BME-EXTRA: Sidebar settings are missing!`)

    const {
        displaySettingsButton, displayServerActivity, displayInfoPanel,
        displayAvatar, removeSteamInformation, closeAdminLog, advancedBans
    } = await import(chrome.runtime.getURL('./modules/display.js'));

    const playerCache = cache[bmId];
    
    displaySettingsButton();
    if (settings.showServer) displayServerActivity(bmId, playerCache.bmProfile);
    if (settings.showInfoPanel) displayInfoPanel(bmId, playerCache.bmProfile, playerCache.steamData, playerCache.bmActivity);
    if (settings.showAvatar) displayAvatar(bmId, playerCache.bmProfile, playerCache.steamData);
    if (settings.removeSteamInfo) removeSteamInformation(bmId);
    if (settings.advancedBans) advancedBans(bmId, playerCache.bmBanData);
    if (settings.closeAdminLog) closeAdminLog(bmId);
    if (settings.maxNames > 0) null;
    if (settings.maxIps > 0) null;

    const {
        insertSidebars, insertFriendsSidebarElement,
        insertHistoricFriendsSidebarElement, insertTeaminfoSidebarElement,
        insertPublicBansSidebarElement
    } = await import(chrome.runtime.getURL('./modules/sidebar.js'));

    await insertSidebars();
    if (sidebarSettings.friends.enabled) insertFriendsSidebarElement(bmId, playerCache.steamFriends, cache.connectedPlayersData, cache.connectedPlayersBanData);
    if (sidebarSettings.historicFriends.enabled) insertHistoricFriendsSidebarElement(bmId, playerCache.historicFriends, playerCache.steamFriends, cache.connectedPlayersData, cache.connectedPlayersBanData);
    if (sidebarSettings.currentTeam.enabled) insertTeaminfoSidebarElement(bmId, playerCache.team, cache.connectedPlayersData, cache.connectedPlayersBanData);
    if (sidebarSettings.publicBans.enabled) insertPublicBansSidebarElement(bmId, playerCache.publicBans);
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
    cache[bmId].team = getCurrentTeam(cache[bmId].bmProfile);
    cache[bmId].publicBans = getPublicBans(cache[bmId].bmProfile);
    //cache.historicFriends.steamidCom
    //cache.historicFriends.steamidUk

    cache[bmId].bmActivity = getBmActivity(bmId, authToken);
    cache[bmId].steamData = getSteamData(bmId);
    cache[bmId].bmBanData = getBmBanData(bmId, authToken);

    loadPlayerData(cache[bmId].steamFriends, cache[bmId].historicFriends.rustApi, cache[bmId].team);
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
    const steamId = getSteamIdFromBmProfile(bmProfile)
    if (!steamId) {
        console.error(`BM-EXTRA: steamID wasn't found in identifiers, steam friends cannot be loaded!`);
        return null;
    }

    const { getSteamFriendlistFromSteam, getSteamFriendlistFromRustApi } = await import(chrome.runtime.getURL('./modules/misc.js'));

    if (type === "steam") return getSteamFriendlistFromSteam(steamId);
    if (type === "rust-api") return getSteamFriendlistFromRustApi(steamId);
    return undefined;
}
async function getSteamFriendlistFromSteam(steamId) {
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
async function getSteamFriendlistFromRustApi(steamId) {
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

async function loadPlayerData(friends, historicFriends, team) {
    friends = await friends;
    historicFriends = await historicFriends;
    team = await team;

    const uniqueSteamIds = [];

    if (typeof (friends) !== "string")
        friends.forEach(friend => { if (!uniqueSteamIds.includes(friend.steamId)) uniqueSteamIds.push(friend.steamId) });
    if (typeof (historicFriends) !== "string")
        historicFriends.forEach(friend => { if (!uniqueSteamIds.includes(friend.steamId)) uniqueSteamIds.push(friend.steamId) });

    team.members.forEach(member => { if (!uniqueSteamIds.includes(member)) uniqueSteamIds.push(member) });

    for (let i = 0; i < uniqueSteamIds.length; i += 100) {
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
        if (!STEAM_API_KEY) return "NO_API_KEY";

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
        if (!STEAM_API_KEY) return "NO_API_KEY";

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

async function getCurrentTeam(bmProfile) {
    try {
        const authToken = await getAuthToken();
        if (!authToken) throw new Error("Auth token wasn't found.");

        bmProfile = await bmProfile;

        const lastServer = await getLastServer(bmProfile, authToken);
        const steamId = getSteamIdFromBmProfile(bmProfile)

        let rawTeaminfo = "";
        if (lastServer?.orgId === "29251") rawTeaminfo = await getBzTeamInfo(steamId, lastServer.id, authToken); //BattleZone
        if (lastServer?.orgId === "18611") rawTeaminfo = await getBrTeamInfo(steamId, lastServer.id, authToken); //Bestrust
        //Something failed
        if (!rawTeaminfo || rawTeaminfo === "error") return { teamId: "error", members: [], server: "", raw: "" }

        //Not in a team / Not found on the server
        if (rawTeaminfo === "Player is not in a team" || rawTeaminfo === "Player not found") {
            return { teamId: -1, members: [], server: lastServer.name, raw: rawTeaminfo }
        }

        //Breakup rawTeaminfo
        const teamMembers = [];
        let teamId = -1;
        rawTeaminfo.split("\n").forEach(line => {
            if (line.startsWith("ID: ")) teamId = line.split(" ")[1];
            if (!line.includes("76561")) return;

            teamMembers.push(line.substring(0, 17));
        })

        const teamInfo = {};
        teamInfo.teamId = teamId;
        teamInfo.members = teamMembers;
        teamInfo.server = lastServer.name;
        teamInfo.raw = rawTeaminfo;
        return teamInfo
    } catch (error) {
        console.error(`BME-EXTRA: ${error.message}: \n${error.stack}`);
        return {
            teamId: "error",
            raw: "error",
            server: "error",
            members: []
        }
    }
}
async function getLastServer(bmProfile, authToken) {
    const myServers = await getMyServers(authToken);
    if (!myServers) return null;

    const servers = bmProfile.included
        .filter(item => item.type === "server")
        .map(server => {
            return {
                name: server.attributes?.name,
                id: server.id,
                orgId: server?.relationships?.organization?.data?.id,
                lastPlayed: new Date(server.meta.lastSeen).getTime()
            }
        })
        .filter(item => myServers.includes(item.id))
        .sort((a, b) => b.lastPlayed - a.lastPlayed);

    const lastServer = servers[0];

    if (!lastServer) return null;
    if (Date.now() - 2 * 24 * 60 * 60 * 1000 > lastServer.lastPlayed) return null;

    return lastServer
}
async function getMyServers(authToken) {
    let myServers = JSON.parse(localStorage.getItem("BME_MY_SERVER_CACHE"));
    if (myServers && myServers.timestamp > Date.now() - 24 * 60 * 60 * 1000) return myServers.servers;

    const resp = await fetch(`https://api.battlemetrics.com/servers?version=^0.1.0&filter[rcon]=true&page[size]=100&access_token=${authToken}`)
    if (resp?.status !== 200) {
        console.error(`Failed to request your servers | Status: ${resp?.status}`);
        return null;
    }

    const data = await resp.json();
    myServers = {
        timestamp: Date.now(),
        servers: data.data.map(server => server.id)
    }

    localStorage.setItem("BME_MY_SERVER_CACHE", JSON.stringify(myServers))
    return myServers.servers;
}
async function getBzTeamInfo(steamId, serverId, authToken) {
    const resp = await fetch(`https://api.battlemetrics.com/servers/${serverId}/command`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${authToken}`,
            "Content-Type": "application/json",
            "Accept-Version": "^0.1.0"
        },
        body: JSON.stringify({
            data: {
                type: "rconCommand",
                attributes: {
                    command: "raw",
                    options: {
                        raw: `teaminfo ${steamId}`
                    }
                }
            }
        })
    })

    if (resp.status !== 200) {
        console.error(`Failed to request teaminfo | Status: ${resp.status}`);
        return "error";
    }

    const data = await resp.json();
    const result = data.data?.attributes?.result
    if (!result) {
        console.error(`Failed to request teaminfo | Status: ${resp.status} | Result: ${result}`);
        return "error";
    }

    return result;
}
async function getBrTeamInfo(steamId, serverId, authToken) {
    const resp = await fetch(`https://api.battlemetrics.com/servers/${serverId}/command`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${authToken}`,
            "Content-Type": "application/json",
            "Accept-Version": "^0.1.0"
        },
        body: JSON.stringify({
            data: {
                type: "rconCommand",
                attributes: {
                    command: "edb0be86-6f5e-4e4b-a655-5fcecd4af11f",
                    options: {
                        command: "teaminfo",
                        steamid: steamId,
                        format: " "
                    }
                }
            }
        })
    })

    if (resp.status !== 200) {
        console.error(`Failed to request teaminfo | Status: ${resp.status}`);
        return "error";
    }

    const data = await resp.json();

    const result = data.data?.attributes?.result[0]?.children[1]?.children[0]?.children[0]?.reference.result
    if (!result) {
        console.error(`Failed to request teaminfo | Status: ${resp.status} | Result: ${result}`);
        return "error";
    }

    return result;
}

async function getPublicBans(bmProfile) {
    bmProfile = await bmProfile;
    const steamId = getSteamIdFromBmProfile(bmProfile)

    return requestPublicBansFor(steamId);
}
async function requestPublicBansFor(steamId) {
    try {
        const RUST_API_KEY = localStorage.getItem("BME_RUST_API_KEY");
        if (!RUST_API_KEY) return "NO_API_KEY";

        let value = null;
        chrome.runtime.onMessage.addListener(function (response) {
            if (response.type !== `BME_PUBLIC_BANS_RESOLVED`) return;
            if (response.status === "ERROR") throw new Error(`Failed to request public bans for ${steamId}: \n  ${response.message}`);

            value = response.value;
        })

        chrome.runtime.sendMessage({ type: `BME_PUBLIC_BANS`, subject: steamId, apiKey: RUST_API_KEY });
        while (!value) await new Promise(r => { setTimeout(r, 10); })
        return value;
    } catch (error) {
        console.log(error);
        return "ERROR";
    }

}


function getSteamIdFromBmProfile(bmProfile) {
    const steamIdObject = bmProfile.included.find(identifier => identifier?.attributes?.type === "steamID");
    return steamIdObject?.attributes?.identifier;
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

