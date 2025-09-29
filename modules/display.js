export async function displaySettingsButton(bmId) {
    console.log("whoo hooo");
    
}

export async function displayServerActivity(bmId, bmProfile) {
    bmProfile = await bmProfile;

    const servers = bmProfile.included
        .filter(item => item.type === "server")
        .map(server => {
            return {
                name: server.attributes.name,
                online: server.meta.online,
                ip: `${server.attributes.ip}:${server.attributes.port}`,
                pop: {
                    max: server.attributes.maxPlayers,
                    current: server.attributes.players,
                },
                lastSeen: new Date(server.meta.lastSeen).getTime(),
            }
        })
        .sort((a, b) => b.lastSeen - a.lastSeen);

    const onlineServers = servers.filter(server => server.online);

    const rconElement = await getRconElement();
    const title = rconElement?.firstChild;
    if (!title) return console.error("BM-EXTRA: Failed to setup serverElement.")
    const serverElement = getCurrentServersElement(onlineServers.length ? onlineServers : [servers[0]]);
    serverElement.id = "bme-server-panel"
    if (!serverElement) return console.error("BM-EXTRA: serverElement failed to assemble.")

    if (checkIfAlright(bmId, "bme-server-panel")) return;
    title.insertAdjacentElement("afterend", serverElement);
}
function getCurrentServersElement(servers) {
    const element = document.createElement("div");
    for (const server of servers) {
        if (!server.online && !element.classList.contains("offline"))
            element.classList.add("offline");

        const firstLine = document.createElement("p");
        firstLine.innerText = `${server.online ? "Current server" : "Last server"}: ${server.name} (${server.pop.current}/${server.pop.max})`;
        element.appendChild(firstLine);

        const secondLine = document.createElement("p");
        secondLine.innerText = `${server.online ? "Joined" : "Last seen: "}: ${getTimeString(server.lastSeen)} ago`
        element.appendChild(secondLine)

        const thirdLine = document.createElement("div");
        element.appendChild(thirdLine);

        const ipText = document.createElement("p");
        ipText.innerText = `IP: ${server.ip}`;
        thirdLine.appendChild(ipText);

        const copyImg = document.createElement("img");
        if (server.online) copyImg.src = chrome.runtime.getURL('assets/copy.png');
        else copyImg.src = chrome.runtime.getURL('assets/copy-gray.png');
        copyImg.addEventListener("click", () => {
            try {
                navigator.clipboard.writeText(`connect ${server.ip}`)
            } catch (error) { console.error(`BM-EXTRA: ${error}`); }
        })
        thirdLine.appendChild(copyImg);
    }
    return element;
}

export async function displayInfoPanel(bmId, bmProfile, steamData, bmActivity) {
    bmProfile = await bmProfile;
    steamData = await steamData;
    bmActivity = await bmActivity;

    const steamIdObject = getSteamIdObject(bmProfile.included);
    const bmSteamData = getSteamData(steamIdObject, steamData);
    const bmData = getBmData(bmId, bmProfile, bmActivity);

    const rconElement = await getRconElement();
    const allTheDivs = rconElement.lastChild.firstChild;
    let identifierDiv;
    for (const div of allTheDivs.childNodes) {
        if (div.firstChild.innerText.trim() === "Identifiers") {
            identifierDiv = div;
            break;
        }
    }

    if (!identifierDiv) return;

    const infoPanelElement = getInfoPanelElement(bmSteamData, bmData);
    infoPanelElement.id = "bme-info-panel";

    if (checkIfAlright(bmId, "bme-info-panel")) return;
    identifierDiv.insertAdjacentElement("afterend", infoPanelElement)


}
function getSteamData(steamIdObject, steamData) {
    if (!steamIdObject) return null;
    const returnData = {}
    returnData.steamId = steamIdObject.attributes?.identifier;

    const metadata = steamIdObject.attributes?.metadata;

    returnData.gameBanCount = metadata.bans ? metadata.bans.NumberOfGameBans : null;
    returnData.vacBanCount = metadata.bans ? metadata.bans.NumberOfVACBans : null;
    returnData.daysSinceLastBan = metadata.bans ? metadata.bans.DaysSinceLastBan : null;
    returnData.vacBanStatus = metadata.bans ? metadata.bans.VACBanned : null;
    returnData.communityBanned = metadata.bans ? metadata.bans.CommunityBanned : null;

    if (metadata.gameInfo?.games) {
        const hoursPlayed = metadata.gameInfo.games.map(game => game.playtime_forever);

        returnData.gameCount = metadata.gameInfo.game_count;
        returnData.steamHours = 0;
        hoursPlayed.forEach(playtime => { returnData.steamHours += playtime });
        returnData.steamHours = Math.floor(returnData.steamHours / 60);

        const rustHours = metadata.gameInfo.games.filter(game => game.appid === 252490)[0];
        returnData.rustHours = rustHours ? Math.floor(rustHours.playtime_forever / 60) : null;
    } else {
        returnData.gameCount = null;
        returnData.steamHours = null;
        returnData.rustHours = null;
    }

    returnData.visibility = metadata.profile ? metadata.profile.communityvisibilitystate : null;
    returnData.limitedAccount = metadata.profile ? metadata.profile.isLimitedAccount : null;
    returnData.isSetup = metadata.profile ? metadata.profile.profilestate ? true : false : null;
    returnData.accountAge = steamData ? steamData.data.memberSince ?
        new Date(steamData.data.attributes.memberSince).getTime() :
        new Date(steamData.data.attributes.memberSinceAprox).getTime() : null;

    return returnData;
}
function getBmData(bmId, bmData, bmActivity) {
    const returnData = {};
    returnData.accountAge = new Date(bmData.data.attributes.createdAt).getTime();

    const servers = bmData.included.filter(item => item.type === "server");

    returnData.numberOfServer = servers.length;

    returnData.combinedPlaytime = 0;
    returnData.aimTrainPlaytime = 0;

    servers.forEach(server => {
        const timePlayed = server.meta.timePlayed;
        returnData.combinedPlaytime += timePlayed;
        if (isAimTrainingServer(server))
            returnData.aimTrainPlaytime += timePlayed;
    })
    returnData.combinedPlaytime = Math.floor(returnData.combinedPlaytime / 60 / 60);
    returnData.aimTrainPlaytime = Math.floor(returnData.aimTrainPlaytime / 60 / 60);

    returnData.allReports = [];
    returnData.cheatReports = [];
    returnData.kills = [];
    returnData.deaths = [];

    bmActivity.data.forEach(msg => {
        if (msg.type !== "activityMessage" || !msg.attributes) return;
        const data = msg.attributes.data;
        const timestamp = new Date(msg.attributes.timestamp).getTime();

        if (msg.attributes.messageType === "rustLog:playerReport" && bmId == data.forPlayerId) { //REPORT
            returnData.allReports.push(timestamp);
            if (data.reportType === "cheat") returnData.cheatReports.push(timestamp);
        }
        if (msg.attributes.messageType === "rustLog:playerDeath:PVP" && bmId == data.killer_id) { //KILL
            returnData.kills.push(timestamp);
        }
        if (msg.attributes.messageType === "rustLog:playerDeath:PVP" && bmId != data.killer_id) { //KILL
            returnData.deaths.push(timestamp);
        }
    })
    return returnData;
}
function isAimTrainingServer(server) {
    const serverName = server.attributes.name;
    if (serverName.includes("UKN")) return true;
    if (serverName.includes("Aim Training")) return true;

    return false;
}
function getInfoPanelElement(bmSteamData, bmData) {
    const element = document.createElement("div");

    const header = document.createElement("div");
    header.classList.add("bme-section-header")
    header.addEventListener("click", e => {
        const body = document.getElementsByClassName("bme-section-body")[0];
        const arrow = document.getElementById("bme-info-panel-arrow");

        arrow.classList.toggle("closed")
        if (arrow.classList.contains("closed")) {
            body.style.height = "0px";
        } else {
            body.style.height = "240px";
        }


    })
    element.appendChild(header);

    const img = document.createElement("img");
    img.src = chrome.runtime.getURL('assets/arrow.png');
    img.id = "bme-info-panel-arrow";
    header.appendChild(img);

    const title = document.createElement("h2")
    title.innerText = "BM Information";
    header.appendChild(title);

    const body = document.createElement("div");
    body.classList.add("bme-section-body");
    element.appendChild(body);

    body.appendChild(getSteamInfoPanel(bmSteamData));
    body.appendChild(getBmInfoPanel(bmData));



    return element;
}
function getSteamInfoPanel(steam) {
    const element = document.createElement("div");

    const title = document.createElement("a");
    title.target = "_blank";
    if (steam.steamId) title.href = `https://steamcommunity.com/profiles/${steam.steamId}`
    title.classList.add("bme-info-title");
    title.innerText = "Steam Profile:";
    element.appendChild(title);

    const list = document.createElement("dl");
    list.classList.add("css-h1lc4m");
    element.appendChild(list);

    const accountAgeTitle = createHtmlElement("dt", "Account Age:");
    list.appendChild(accountAgeTitle);
    const accountAgeValue = createHtmlElement("dd", steam.accountAge ? getTimeString(steam.accountAge) : "Unknown", isWithinThreeMonth(steam.accountAge));
    list.appendChild(accountAgeValue);

    const visibilityTitle = createHtmlElement("dt", "Visibility:");
    list.appendChild(visibilityTitle);
    const visibilityValue = createHtmlElement("dd", steam.visibility === null ? "Unknown" : steam.visibility === 1 ? "Private" : "Public");
    list.appendChild(visibilityValue);

    const setupTitle = createHtmlElement("dt", "Setup:");
    list.appendChild(setupTitle);
    const setupValue = createHtmlElement("dd", steam.isSetup === null ? "Unknown" : steam.isSetup, steam.isSetup === false ? ["bme-red-text"] : []);
    list.appendChild(setupValue);

    const limitedTitle = createHtmlElement("dt", "Limited:");
    list.appendChild(limitedTitle);
    const limitedValue = createHtmlElement("dd", steam.limitedAccount === null ? "Unknown" : steam.limitedAccount, steam.limitedAccount === true ? ["bme-red-text"] : []);
    list.appendChild(limitedValue)

    const rustHoursTitle = createHtmlElement("dt", "Rust Hours:");
    list.appendChild(rustHoursTitle);
    const rustHoursValue = createHtmlElement("dd", steam.rustHours === null ? "Unknown" : steam.rustHours === 0 ? "Private" : `${steam.rustHours} hours`);
    list.appendChild(rustHoursValue)

    const steamHoursTitle = createHtmlElement("dt", "Steam Hours:");
    list.appendChild(steamHoursTitle);
    const steamHoursValue = createHtmlElement("dd", steam.steamHours === null ? "Unknown" : steam.steamHours === 0 ? "Private" : `${steam.steamHours} hours`);
    list.appendChild(steamHoursValue)

    const steamGameCountTitle = createHtmlElement("dt", "Game Count:");
    list.appendChild(steamGameCountTitle);
    const steamGameCountValue = createHtmlElement("dd", steam.gameCount === null ? "Unknown" : steam.gameCount === 0 ? "Private" : steam.gameCount);
    list.appendChild(steamGameCountValue)

    const gameBanCountTitle = createHtmlElement("dt", "Game Bans:");
    list.appendChild(gameBanCountTitle);
    const gameBanCountValue = createHtmlElement("dd", steam.gameBanCount === null ? "Unknown" : steam.gameBanCount, steam.gameBanCount > 0 && steam.daysSinceLastBan < 180 ? ["bme-red-text"] : []);
    list.appendChild(gameBanCountValue)

    const vacBanCountTitle = createHtmlElement("dt", "Vac Bans:");
    list.appendChild(vacBanCountTitle);
    const vacBanCountValue = createHtmlElement("dd", steam.vacBanCount === null ? "Unknown" : steam.vacBanCount, steam.vacBanCount > 0 && steam.daysSinceLastBan < 180 ? ["bme-red-text"] : []);
    list.appendChild(vacBanCountValue)

    const lastBanTitle = createHtmlElement("dt", "Days since:");
    list.appendChild(lastBanTitle);
    const lastBanValue = createHtmlElement("dd", steam.daysSinceLastBan === null ? "Unknown" : steam.daysSinceLastBan, steam.vacBanCount && steam.gameBanCount && steam.daysSinceLastBan < 180 ? ["bme-red-text"] : []);
    list.appendChild(lastBanValue)

    return element;
}
function getBmInfoPanel(bm) {
    const element = document.createElement("div");

    const title = document.createElement("p");
    title.classList.add("bme-info-title");
    title.innerText = "BattleMetrics:";
    element.appendChild(title);

    const list = document.createElement("div");
    list.classList.add("css-h1lc4m");
    element.appendChild(list)

    const accountAgeTitle = createHtmlElement("dt", "Account Age:");
    list.appendChild(accountAgeTitle);
    const accountAgeValue = createHtmlElement("dd", bm.accountAge ? getTimeString(bm.accountAge) : "Unknown", isWithinThreeMonth(bm.accountAge) ? ["bme-red-text"] : []);
    list.appendChild(accountAgeValue);

    const serverCountTtile = createHtmlElement("dt", "Server Count:");
    list.appendChild(serverCountTtile);
    const serverCountValue = createHtmlElement("dd", `${bm.numberOfServer}`, bm.numberOfServer < 10 ? ["bme-red-text"] : []);
    list.appendChild(serverCountValue);

    const allReportsTitle = createHtmlElement("dt", "Reports:");
    list.appendChild(allReportsTitle);
    const recentReportCount = bm.allReports.filter(r => r > (3 * ONE_DAY)).length;
    const allReportsValue = createHtmlElement("dd", `${bm.allReports.length} (${recentReportCount} in 72h)`, recentReportCount > 2 ? ["bme-red-text"] : []);
    list.appendChild(allReportsValue);

    const cheatReportsTitle = createHtmlElement("dt", "Cheat Reports:");
    list.appendChild(cheatReportsTitle);
    const recentCheatReportCount = bm.cheatReports.filter(r => r > (3 * ONE_DAY)).length;
    const cheatReportsValue = createHtmlElement("dd", `${bm.cheatReports.length} (${recentCheatReportCount} in 72h)`, recentCheatReportCount > 2 ? ["bme-red-text"] : []);
    list.appendChild(cheatReportsValue);

    const rustHoursTitle = createHtmlElement("dt", "Rust Hours:");
    list.appendChild(rustHoursTitle);
    const rustHoursValue = createHtmlElement("dd", `${bm.combinedPlaytime} hours`, bm.combinedPlaytime > 500 ? ["bme-green-text"] : bm.combinedPlaytime > 100 ? ["bme-yellow-text"] : ["bme-red-text"]);
    list.appendChild(rustHoursValue);

    const aimTrainHoursTitle = createHtmlElement("dt", "Aim Train:");
    list.appendChild(aimTrainHoursTitle);
    const aimTrainHoursValue = createHtmlElement("dd", `${bm.aimTrainPlaytime} hours`, bm.aimTrainPlaytime > 500 ? ["bme-green-text"] : bm.aimTrainPlaytime > 100 ? ["bme-yellow-text"] : ["bme-red-text"]);
    list.appendChild(aimTrainHoursValue);
    
    const killCountTitle = createHtmlElement("dt", "Kill:");
    list.appendChild(killCountTitle);
    const killCountValue = createHtmlElement("dd", `${bm.kills.length} (${bm.kills.filter(kill => kill > Date.now()-(2*ONE_DAY)).length} in 48h)`);
    list.appendChild(killCountValue);

    const deathCountTitle = createHtmlElement("dt", "Deaths:");
    list.appendChild(deathCountTitle);
    const deathCountValue = createHtmlElement("dd", `${bm.deaths.length} (${bm.deaths.filter(death => death > Date.now()-(2*ONE_DAY)).length} in 48h)`);
    list.appendChild(deathCountValue);    

    const kdTitle = createHtmlElement("dt", "K/D:");
    list.appendChild(kdTitle);
    const kdValue = createHtmlElement("dd", `${(bm.kills.length/Math.max(bm.deaths.length,1)).toFixed(2)}`);
    list.appendChild(kdValue);

    return element;
}

export async function displayAvatar(bmId, bmProfile, bmSteamData) {
    bmProfile = await bmProfile;
    bmSteamData = await bmSteamData;

    let avatarUrl = "";

    const steamIdObject = getSteamIdObject(bmProfile.included);
    const profile = steamIdObject?.attributes?.metadata?.profile;
    if (profile) avatarUrl = profile.avatarmedium;

    if (!avatarUrl && bmSteamData) {
        const avatar = bmSteamData.attributes.avatar;
        if (!avatar) return;

        avatarUrl === `https://avatars.fastly.steamstatic.com/${avatar}`.replace(".jpg", "_medium.jpg");
    }
    if (!avatarUrl) return;

    const rconElement = await getRconElement();
    const title = rconElement.firstChild;
    if (!title) return;

    const avatarElement = document.createElement("img");
    avatarElement.src = avatarUrl;
    avatarElement.id = "bme-avatar";

    if (checkIfAlright(bmId, "bme-avatar")) return;

    title.insertAdjacentElement("afterbegin", avatarElement)
}


export async function removeSteamInformation(bmId) {
    const elements = document.getElementsByClassName("steam-profile");

    let counter = 0;
    while (!elements[0]) {
        if (counter>100) return;
        await new Promise(r => { setTimeout(r, 5 + counter); })
        counter++;
    }
    const steamInfo = elements[0]?.parentElement?.parentElement?.parentElement;
    if (!steamInfo) return;
    if (checkIfAlright(bmId)) return;

    steamInfo.remove();
}

export async function closeAdminLog(bmId) {
    const rconElement = await getRconElement();
    const divs = rconElement?.lastChild?.firstChild?.childNodes;

    for (const div of divs) {
        const title = div?.firstChild?.firstChild?.innerText?.trim();
        if (title !== "Admin Log") continue;

        div.firstChild.click();
    }
    
}

/**
 * MISC
 */

const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;
const ONE_MONTH = 30 * ONE_DAY;
const ONE_YEAR = 12 * ONE_MONTH;
function getTimeString(timestamp) {
    const now = Date.now();
    const since = now - timestamp;

    if (since > ONE_YEAR) return `${(since / ONE_YEAR).toFixed(1)} years`;
    if (since > ONE_MONTH) return `${(since / ONE_MONTH).toFixed(1)} months`;
    if (since > ONE_DAY) return `${Math.floor(since / ONE_DAY)} days`;
    if (since > ONE_HOUR) return `${Math.floor(since / ONE_HOUR)} hours`;
    if (since > ONE_MINUTE) return `${Math.floor(since / ONE_MINUTE)} minutes`;
    if (since > ONE_SECOND) return `${Math.floor(since / ONE_SECOND)} seconds`
    return NaN;
}
async function getRconElement() {
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
function isWithinThreeMonth(timestamp) {
    if (!timestamp) return false;

    const since = Date.now() - timestamp;
    if (since < (3 * ONE_MONTH)) return true;

    return false;
}

function getSteamIdObject(array) {
    const steamId = array.find(item => {
        if (item.type !== "identifier") return false;
        if (item.attributes?.type !== "steamID") return false;
        return true;
    })
    return steamId;
}
function createHtmlElement(node, innerText, classList = []) {
    const element = document.createElement(node);
    if (classList.length > 0) element.classList.add(...classList)
    element.innerText = innerText;
    return element;
}
function checkIfAlright(bmId, elementId) {
    const urlId = location.href.split("/")[5];
    if (urlId !== bmId) return true; //Page changed
    if (elementId) {
        const elementCheck = document.getElementById(elementId);
        if (elementCheck) return true; //Already exist
    }
    return false; //Good to go!
}