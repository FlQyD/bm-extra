let getTimeString; //Extension import :puke:
(async () => { ({ getTimeString } = await import(chrome.runtime.getURL('./modules/getInfoPanel.js'))); })();


export async function displaySettingsButton(bmId) {
    const rconElement = await getRconElement();
    setTimeout(() => { _rconElement = null }, 50); //RESET RCON

    const title = rconElement?.firstChild;
    if (!title) return console.error("BM-EXTRA: Failed to located title. Failed to display settings button.")
    title.classList.add("bme-flex");

    const button = document.createElement("img");
    button.id = "bme-settings-button"
    button.src = chrome.runtime.getURL('assets/img/settings.png');
    title.appendChild(button);
    const { displaySettings } = await import(chrome.runtime.getURL('./modules/settings.js'));

    button.addEventListener("click", displaySettings)


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
        if (server.online) copyImg.src = chrome.runtime.getURL('assets/img/copy.png');
        else copyImg.src = chrome.runtime.getURL('assets/img/copy-gray.png');
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

    const { getInfoPanel } = await import(chrome.runtime.getURL('./modules/getInfoPanel.js'));
    const infoPanel = getInfoPanel(bmSteamData, bmData);
    infoPanel.id = "bme-info-panel";

    if (checkIfAlright(bmId, "bme-info-panel")) return;
    identifierDiv.insertAdjacentElement("afterend", infoPanel)


}
function getSteamData(steamIdObject, steamData) {
    if (!steamIdObject) return null;
    const returnData = {}
    returnData.steamId = steamIdObject.attributes?.identifier;

    const metadata = steamIdObject.attributes?.metadata;

    returnData.gameBanCount = metadata?.bans ? metadata.bans.NumberOfGameBans : null;
    returnData.vacBanCount = metadata?.bans ? metadata.bans.NumberOfVACBans : null;
    returnData.daysSinceLastBan = metadata?.bans ? metadata.bans.DaysSinceLastBan : null;
    returnData.vacBanStatus = metadata?.bans ? metadata.bans.VACBanned : null;
    returnData.communityBanned = metadata?.bans ? metadata.bans.CommunityBanned : null;

    if (metadata?.gameInfo && metadata.gameInfo.game_count > 0) {
        const hoursPlayed = metadata.gameInfo.games.map(game => game.playtime_forever);

        returnData.gameCount = metadata.gameInfo.game_count;
        returnData.steamHours = 0;
        hoursPlayed.forEach(playtime => { returnData.steamHours += playtime });
        returnData.steamHours = Math.floor(returnData.steamHours / 60);

        const rustHours = metadata.gameInfo.games.filter(game => game.appid === 252490)[0];
        returnData.rustHours = rustHours ? Math.floor(rustHours.playtime_forever / 60) : null;
        returnData.gamesLastChecked = metadata.gameInfo.lastCheck ? new Date(metadata.gameInfo.lastCheck).getTime() : null;
    } else {
        returnData.gameCount = null;
        returnData.steamHours = null;
        returnData.rustHours = null;
        returnData.gamesLastChecked = null;
    }

    returnData.visibility = metadata?.profile ? metadata.profile.communityvisibilitystate : null;
    returnData.limitedAccount = typeof (metadata?.profile?.isLimitedAccount) === "boolean" ? metadata.profile.isLimitedAccount : null;
    returnData.isSetup = metadata?.profile ? metadata.profile.profilestate ? true : false : null;
    returnData.accountAge = steamData ? steamData.data.memberSince ?
        new Date(steamData.data.attributes.memberSince).getTime() :
        new Date(steamData.data.attributes.memberSinceAprox).getTime() : null;

    return returnData;
}
function getBmData(bmId, bmData, bmActivity) {
    const returnData = {};
    returnData.accountAge = new Date(bmData.data.attributes.createdAt).getTime();
    returnData.private = bmData.data.attributes.private;

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
    const link = document.getElementsByClassName("links");
    let count = 0;
    while (!link[0] && count < 100) {
        count++;
        await new Promise(r => { setTimeout(r, 10 + (count * 3)); })
    }
    if (!link[0]) return console.error(`BM-EXTRA: Failed to locate link. Couldn't remove steamInfo.`);

    let parent = link[0].parentNode;
    while (parent) {
        const title = parent.firstChild?.firstChild?.innerText?.trim();
        if (title === "Steam Information") return parent.remove();

        parent = parent.parentNode;
        await new Promise(r => { setTimeout(r, 100); })
    }
    console.error(`BM-EXTRA: Failed to locate steam info.`);
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

export async function advancedBans(bmId, banDataP) {
    const banData = await banDataP


    const rconElement = await getRconElement();
    const sections = rconElement?.lastChild.firstChild.childNodes;

    let banSection = null;
    for (const section of sections) {
        if (section.firstChild.innerText.trim() !== "Current & Past bans") continue;
        banSection = section;
        break;
    }

    if (!banSection) return console.error("BM-EXTRA: Failed to locate ban section.");
    const banList = banSection.lastChild?.firstChild?.childNodes;
    if (!banList) return console.error("BM-EXTRA: Failed to locate ban list.");

    const urlId = location.href.split("/")[5];
    if (urlId !== bmId) return true; //Page changed | Abort
    for (const banElement of banList) {
        const banId = banElement.firstChild.href.split("/")[6];
        const banSpan = banElement.firstChild.firstChild;

        const banItem = getBanItem(banData, banId);
        if (!banItem || !banSpan) continue;

        convertBanSpan(banItem, banSpan);
    }
}
function convertBanSpan(ban, span) {
    const banReason = ban.attributes.reason.split(" | ")[0];
    const timestamp = new Date(ban.attributes.timestamp).getTime();

    const expiration = ban.attributes.expires === null ? 0 : new Date(ban.attributes.expires).getTime();
    const active = expiration === 0 ? true : Date.now() < expiration;
    const length = expiration === 0 ? 0 : expiration - timestamp;

    const ONE_DAY = 24 * 60 * 60 * 1000;
    const lengthText = length === 0 ? `Permanent` : `${Math.round(length / ONE_DAY * 10) / 10} days`;
    const lengthString = active ? `<b>${lengthText}</b>` : `${lengthText}`;

    const stringArray = [
        `${getTimeString(timestamp)} ago`,
        `<b>${banReason}</b>`,
        `${active === true ? "<b>Active</b>" : "Expired"}`,
        lengthString
    ]
    span.innerHTML = `${stringArray.join("&nbsp;&nbsp;|&nbsp;&nbsp;")}`;
}
function getBanItem(banData, banId) {
    for (const ban of banData.data)
        if (ban.id === banId) return ban;
    return null;
}

export async function insertSidebars() {
    const elementsToRemove = document.querySelectorAll(".bme-sidebar");
    elementsToRemove.forEach(item => item.remove())

    const rconElement = await getRconElement();
    const parent = rconElement?.parentNode?.parentNode;
    if (!parent) return console.error("BM-EXTRA: Failed to locate parent of rconElement for sidebar placements.");
    
    const left = getSidebarElement("left");
    parent.appendChild(left)
    
    const right = getSidebarElement("right");
    parent.appendChild(right)
}
function getSidebarElement(side) {
    const element = document.createElement("div");
    element.classList.add("bme-sidebar", `bme-sidebar-${side}`);

    for (let i = 0; i < 4; i++) {
        const slot = document.createElement("div");
        slot.id = `bme-sidebar-${side}-slot-${i+1}`;
        element.appendChild(slot);
    }
    return element;
}

export async function insertFriendsSidebarElement(bmId, steamFriends, connectedPlayersData, connectedPlayersBanData) {
    steamFriends = await steamFriends;
    steamFriends.sort((a, b) => b.since- a.since)

    steamFriends = steamFriends.map(item  => {
        const steamData = getSteamData(item.steamId);
        const banData = getSteamBanData(item.steamId);
        return {
            steamId: item.steamId,
            since: item.since,
            name: steamData ? steamData.name : item.steamId,
            avatar: steamData ? steamData.avatar : "unknown",
            inGame: steamData ? steamData.inGame : null,
            setup: steamData ? steamData.setup : null,
            online: steamData ? steamData.online : null,
            banData
        }
    })
        
    const sidebarSettings = JSON.parse(localStorage.getItem("BME_SIDEBAR_SETTINGS"));
    if (!sidebarSettings) return console.error(`BME-EXTRA: Sidebar settings are missing!`)
    
    const parentElement = document.getElementById(`bme-sidebar-${sidebarSettings.friends.spot}`);
    if (!parentElement) return console.error(`BM-EXTRA: Sidebar element couldn't be located: ${`bme-sidebar-${sidebarSettings.friends.spot}`}`)
    console.log(parentElement);
    
    const steamFriendsContainer = getSteamFriendsContainer(steamFriends);
    parentElement.append(steamFriendsContainer);
    
    function getSteamData(steamId) {
        for (const item of connectedPlayersData) if (item.steamId === steamId) return item;
        return null;
    }
    function getSteamBanData(steamId) {        
        for (const item of connectedPlayersBanData) if (item.steamId === steamId) return item;
        return null;
    }
}
export async function updatePlayerProfileElements(cache) {
    console.log(cache);
    
}
function getSteamFriendsContainer(steamFriends) {
    const element = document.createElement("div");
    
    const header = getSteamFriendHeader(steamFriends);
    const body = getSteamFriendsBody(steamFriends)
    element.append(header, body);
    return element;
}
function getSteamFriendHeader(steamFriends) {
    const wrapper = document.createElement("div")
    wrapper.classList.add("bme-friendlist-header");

    const title = document.createElement("h1");
    title.innerText = `SteamFriends(${steamFriends.length}):`
    wrapper.appendChild(title);

    return wrapper;
}
function getSteamFriendsBody(steamFriends) {
    const container = document.createElement("div");
    container.classList.add("bme-friendlist-body")

    for (const friend of steamFriends) {
        const player = getPlayerElement(friend);
        container.appendChild(player);
    }

    return container;
}

function getPlayerElement(player) {
    console.log(player);
    
    const container = document.createElement("div");
    container.title = player.steamId;
    if (player?.origin === "origin") container.style.background = color.seenOnOrigin; //historic friend
    if (player?.origin === "friend") container.style.background = color.seenOnFriend; //historic friend
    container.classList.add("player-container");

    const avatar = document.createElement("img");
    avatar.src = player.avatar === "unknown" ? `https://avatars.cloudflare.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg` : `https://avatars.cloudflare.steamstatic.com/${player.avatar}_full.jpg`
    container.appendChild(avatar);

    const details = document.createElement("div");
    details.classList.add("player-details")
    container.appendChild(details);

    const name = document.createElement("a");
    name.href = `https://steamcommunity.com/profiles/${player.steamId}`;
    name.target = "_blank";
    name.innerText = player.name;
    details.appendChild(name);

    if (player.lastSeen) {
        const lastSeen = player.lastSeen * 1000;

        const lastSeenElement = document.createElement("p");
        lastSeenElement.innerText = `Last Seen: ${getPlayerTimeString(lastSeen)}`;
        details.appendChild(lastSeenElement);
    }

    if (player.since === 0 && player.firstSeen) {
        const firstSeen = player.firstSeen * 1000;

        const firstSeenElement = document.createElement("p");
        firstSeenElement.innerText = `First Seen: ${getPlayerTimeString(firstSeen)}`;
        details.appendChild(firstSeenElement);
    }

    if (player.since) {
        const since = player.since * 1000;

        const sinceElement = document.createElement("p");
        sinceElement.innerText = `Since: ${getPlayerTimeString(since)}`;
        details.appendChild(sinceElement)
    }

    if (player.setup === false) {
        const warningSign = getWarningSign();
        container.appendChild(warningSign);
    }

    const banData = getBanData(player.banData);
    container.appendChild(banData);

    const bmButton = getBmButton(player.steamId);
    container.appendChild(bmButton);

    return container;
    function getPlayerTimeString(timestamp) {
        return `${new Date(timestamp).toISOString().substring(0, 10)} (${Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000))} days)`;
    }
}
function getWarningSign() {
    const wrapper = document.createElement("div")
    wrapper.classList.add("player-warning-wrapper");

    const img = document.createElement("img");
    img.src = chrome.runtime.getURL('/assets/img/warning.png');
    wrapper.appendChild(img)

    return wrapper;
}
function getBanData(banData) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("ban-data-wrapper");

    const inner = document.createElement("div");
    inner.classList.add("ban-data-inner");

    const container = document.createElement("div");
    container.classList.add("ban-data");

    let iconSrc;
    let colorClass;

    if (banData === null) {
        colorClass = "bme-ban-gray";
        iconSrc = '/assets/img/no-signal.png';
    } else if (banData.gameBanCount === 0 && banData.vacBanCount === 0) {
        colorClass = "bme-ban-green";
        iconSrc = '/assets/img/clear.png';
    } else {
        colorClass = "bme-ban-red";
        iconSrc = '/assets/img/danger.png';
    }

    container.classList.add(colorClass);

    const img = document.createElement("img");
    img.src = chrome.runtime.getURL(iconSrc);
    container.appendChild(img);

    inner.appendChild(container);

    if (colorClass === "bme-ban-red") {
        const banDetails = document.createElement("div");
        banDetails.classList.add("ban-details");

        const firstLine = document.createElement("p")
        const words = [];
        if (banData.vacBanCount) words.push(`${banData.vacBanCount} VAC`)
        if (banData.gameBanCount) words.push(`${banData.gameBanCount} Game`)
        firstLine.innerText = `${words.join(", ")} ban on record`;
        banDetails.appendChild(firstLine);

        const secondLine = document.createElement("p");
        secondLine.innerText = `${banData.daysSinceLastBan} days since last.`
        banDetails.appendChild(secondLine)

        inner.appendChild(banDetails);
    }

    
    wrapper.appendChild(inner);
    return wrapper;
}
function getBmButton(steamId) {
    const element = document.createElement("a");
    element.href = `https://www.battlemetrics.com/rcon/players?filter[search]=${steamId}&redirect=1`;
    element.target = "_blank";
    element.classList.add("player-bm-button");

    const img = document.createElement("img");
    img.src = chrome.runtime.getURL('/assets/img/bm-logo-small.png');
    element.appendChild(img);

    return element;
}


let _rconElement = null;
async function getRconElement() {    
    if (!_rconElement || Date.now() > (_rconElement.timestamp + 5000)) {
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
function getSteamIdObject(array) {
    const steamId = array.find(item => {
        if (item.type !== "identifier") return false;
        if (item.attributes?.type !== "steamID") return false;
        return true;
    })
    return steamId;
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