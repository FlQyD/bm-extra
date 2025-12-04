import { getTimeString } from "./getInfoPanel.js";
import { checkIfAlright, getIdentifierTable, getMain, getRconElement, getStreamerModeName } from "./misc.js";


export async function displaySettingsButton(bmId) {
    const rconElement = await getRconElement();

    const title = rconElement?.firstChild;
    if (!title) return console.error("BM-EXTRA: Failed to locate title.")
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
                id: server.id,
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
        const prefix = server.online ? "Current server" : "Last server";
        firstLine.innerHTML = `${prefix}: <a href="https://www.battlemetrics.com/rcon/servers/${server.id}" target="_blank">${server.name}</a> (${server.pop.current}/${server.pop.max})`
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

    let avatarUrl = "";

    const steamIdObject = getSteamIdObject(bmProfile.included);
    const profile = steamIdObject?.attributes?.metadata?.profile;
    if (profile) avatarUrl = profile.avatarmedium;

    if (!avatarUrl) {
        bmSteamData = await bmSteamData;
        const avatar = bmSteamData?.attributes?.avatar;
        if (!avatar) return;
        avatarUrl = `https://avatars.fastly.steamstatic.com/${avatar}`.replace(".jpg", "_medium.jpg");
    }
    if (!avatarUrl) return;

    const mainElement = await getMain();
    const title = mainElement?.firstChild?.firstChild;
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

export async function swapBattleEyeGuid(bmId, bmProfile) {
    bmProfile = await bmProfile;

    const steamIdObject = getSteamIdObject(bmProfile.included);
    const steamId = steamIdObject?.attributes?.identifier;
    if (!steamId) return console.log("BM-EXTRA: Steam ID is missing")

    const smName = getStreamerModeName(steamId);
    if (!smName) return console.error("BM-EXTRA: Failed to get Streamer Mode name")

    const identifierTable = await getIdentifierTable();
    if (!identifierTable) return console.error("BM-EXTRA: identifierTable is missing!")

    for (const identifier of identifierTable) {
        if (!identifier.innerText.includes("BattlEye GUID")) continue;

        
        const type = identifier.children[1];
        type.firstChild.innerText = "SM Name";
        type.lastChild.remove(); //Remove org lister
        type.lastChild.remove(); //Remove session button
        type.lastChild.remove(); //Remove copy button
        type.lastChild.remove(); //Remove empty p tag
        
        identifier.title = smName;
        identifier.children[0].firstChild.title = smName;
        const smNameElement = identifier.children[0]?.firstChild?.firstChild;
        smNameElement.innerText = smName;
        smNameElement.title = smName
        
        return;
    }
}

export async function limitItem(bmId, limit, item) {
    const identifierTable = await getIdentifierTable();
    if (!identifierTable) return console.error("BM-EXTRA: identifierTable is missing!")

    let count = 0;
    for (const identifier of identifierTable) {
        const type = identifier?.children[1]?.firstChild?.innerText;
        if (type !== item) continue;

        count++;
        if (count <= limit) continue;
        if (checkIfAlright(bmId, null, "overview")) return;
        identifier.classList.add("bme-hidden");
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

export async function showExtraDataOnIps(bmId, bmProfile) {
    bmProfile = await bmProfile;
    const ips = bmProfile.included
        .filter(item => item.attributes.type === "ip")
        .map(item => {
            const conInfo = item.attributes?.metadata?.connectionInfo;
            const isp = Boolean(conInfo.isp) ? conInfo.isp : null;
            const asn = Boolean(conInfo.asn) ? conInfo.asn : null;
            return {
                id: item.id ?? null,
                ip: item.attributes?.identifier ?? null,
                isp, asn
            }
        });
    //15 is the minimum length, in case there would be no IP
    const longestIp = Math.max(...ips.filter(ip => ip.ip).map(ip => ip.ip.length), 15);
    const longestIsp = Math.max(...ips.filter(ip => ip.isp).map(ip => ip.isp.length));
    const longestAsn = Math.max(...ips.filter(ip => ip.asn).map(ip => ip.asn.length));

    const identifierTable = await getIdentifierTable();

    for (const identifier of identifierTable) {
        const { type, id } = getIdentifierType(identifier);
        if (type !== "IP") continue;
        if (!id) continue;

        const ipObject = ips.find(ip => ip.id == id);
        if (!ipObject) continue;
        if (ipObject.isp === null) continue;

        const ipElement = identifier?.firstChild?.firstChild?.lastChild;
        const ipValue = `${ipElement.innerText}`.padEnd(longestIp);
        const ispValue = `${ipObject.isp}`.padEnd(longestIsp);
        const asnValue = `${ipObject.asn}`.padEnd(longestAsn);

        const text = `${ipValue}    |    ISP: ${ispValue}    |    ASN: ${asnValue}`;
        ipElement.innerText = text;

    }


}

export async function highlightVpnIdentifiers(bmId, vpnSettings) {
    const identifierTable = await getIdentifierTable();

    for (const identifier of identifierTable) {
        const { type, id } = getIdentifierType(identifier);
        if (type !== "IP") continue;
        if (!identifier.firstChild?.innerText?.includes("This IP appears to belong to")) continue;
        makeItVpn(identifier, vpnSettings);
    }
    if (vpnSettings.threshold > -1) checkConnections(identifierTable, vpnSettings);
}
async function checkConnections(identifierTable, vpnSettings) {
    for (let i = 0; i < 50; i++) { //Wait till shared identifiers load
        if (!document.body.contains(identifierTable[0])) return;
        if (identifierTable[0].parentNode.innerText.includes("Identifier shared with")) break;
        await new Promise(r => { setTimeout(r, 150 * (i / 10)) })
    }

    for (const identifier of identifierTable) {
        const { type, id } = getIdentifierType(identifier);
        if (type !== "IP") continue;
        if (identifier.classList.contains("bme-vpn-identifier")) continue;

        const sharedText = identifier?.firstChild?.lastChild?.innerText?.trim();
        if (!sharedText.includes("Identifier shared with")) continue;

        let connectionCount = sharedText === "Identifier shared with more than 250 players." ?
            250 : Number(sharedText.split("with ")[1].split(" player")[0]);

        if (connectionCount > vpnSettings.threshold) makeItVpn(identifier, vpnSettings);
    }

}
function makeItVpn(identifier, vpnSettings) {
    identifier.classList.add("bme-vpn-identifier");
    identifier.style.background = vpnSettings.background;
    identifier.style.opacity = vpnSettings.opacity;
    if (vpnSettings.label) {
        const nodes = identifier.firstChild.childNodes;
        nodes.forEach(node => { if (node.nodeType === Node.TEXT_NODE) node.remove(); });
    }
}

export async function displayAvatars(bmId, avatars) {
    avatars = await avatars;
    console.log(avatars);
    
    const identifierTable = await getIdentifierTable();
    if (!identifierTable) return console.error("BM-EXTRA: Failed to find identifierTable!");
    const nameElement = Array.from(identifierTable).find(item => item?.innerText?.trim() === "Name");
    if (!nameElement) return console.error("BM-EXTRA: Failed to locate nameElement!");

    if (avatars.length === 0) return;
    const avatarTitle = getAvatarTitle();
    nameElement.before(avatarTitle);

    avatars.forEach(avatar => {
        const avatarElement = getAvatarElement(avatar);
        nameElement.before(avatarElement);
    })

}
function getAvatarTitle() {
    const element = document.createElement("tr");
    element.classList.add("css-147tpna");

    const inner = document.createElement("th")
    inner.colSpan = 3;
    inner.innerText = "Avatar";
    element.append(inner);

    return element;
}
function getAvatarElement(item) {
    const tr = document.createElement("tr");
    const lastSeen = item.lastSeen*1000;
    const iso = new Date(lastSeen).toISOString();    

    //Heavily modified Standard BattleMetrics Identifier
    tr.innerHTML = `
        <td data-title="Identifier">
            <div title="${item.avatar}" class="css-8uhtka">
                <a href="https://avatars.fastly.steamstatic.com/${item.avatar}_full.jpg" target="_blank">
                    <img src="https://avatars.fastly.steamstatic.com/${item.avatar}_medium.jpg" class="bme-avatar-identifier">
                </a>
                <span class="css-q39y9k" title="${item.avatar}">${item.avatar} | Seen on ${item.avatarHits < 101 ? item.avatarHits : "100+"} players</span>
            </div>
        </td>
        <td data-title="Type">
            <div class="css-18s4qom">Avatar</div>
        </td>
        <td data-title="Last Seen">
            <time>${`${iso.substring(8, 10)}/${iso.substring(5, 7)}/${iso.substring(0, 4)}`}</time><br />
            <time class="css-18s4qom">${iso.substring(12, 17)}</time>
            <time class="css-18s4qom">${getTimeString(lastSeen)} ago</time>
        </td>
    `;

    return tr;
}

function getSteamIdObject(array) {
    const steamId = array.find(item => {
        if (item.type !== "identifier") return false;
        if (item.attributes?.type !== "steamID") return false;
        return true;
    })
    return steamId;
}
function getIdentifierType(identifier) {
    const innerText = identifier?.children[1]?.innerText;
    const type = Boolean(innerText) ? innerText.trim() : null;
    if (type === null) return { type, id: null };

    const typeElements = identifier?.childNodes[1].children;
    const offset = type === "Name" ? 1 : 2;
    const searchLink = typeElements[typeElements.length - offset]?.href;
    const id = searchLink ? searchLink.split("=")[1] : null;
    return { type, id }
}