import { getMain, getSteamFriendlistFromRustApi, getSteamFriendlistFromSteam, getTimeString } from "./misc.js";

let insertSidebarsProcess = false;
export async function insertSidebars() {
    const mainElement = await getMain();
    if (!mainElement) return console.error("BM-EXTRA: Failed to locate parent of rconContainer for sidebar placements.");

    const elementsToRemove = document.querySelectorAll(".bme-sidebar");
    elementsToRemove.forEach(item => item.remove())

    const left = getSidebarElement("left");
    const right = getSidebarElement("right");
    mainElement.after(left, right)
}
function getSidebarElement(side) {
    const element = document.createElement("div");
    element.classList.add("bme-sidebar", `bme-sidebar-${side}`);

    for (let i = 0; i < 4; i++) {
        const slot = document.createElement("div");
        slot.id = `bme-sidebar-${side}-slot-${i + 1}`;
        element.appendChild(slot);
    }
    return element;
}

export async function insertFriendsSidebarElement(steamFriends, connectedPlayersData, connectedPlayersBanData, server, settings) {
    steamFriends = await steamFriends;
    server = await server;

    if (typeof (steamFriends) !== "string") {
        const onlineIds = server.map(item => item.steamId);
        steamFriends = steamFriends.map(item => {
            const online = onlineIds.includes(item.steamId);
            return { ...item, online }
        })

        steamFriends.sort((a, b) => {
            if (a.online !== b.online) return a.online ? -1 : 1;
            return b.since - a.since;
        });

        steamFriends = steamFriends.map(item => {
            const steamData = getPlayerSteamData(item.steamId, connectedPlayersData);
            const banData = getPlayerSteamData(item.steamId, connectedPlayersBanData);
            return { ...item, steamData, banData }
        })
    }

    const spot = settings.friends.spot
    const sidebarSlot = document.getElementById(`bme-sidebar-${spot}`);
    if (!sidebarSlot) return console.error(`BM-EXTRA: Sidebar element couldn't be located: ${`bme-sidebar-${spot}`}`)

    const steamFriendsContainer = getSteamFriendsContainer(steamFriends, settings);
    if (!sidebarSlot.hasChildNodes()) sidebarSlot.append(steamFriendsContainer);
}
export async function insertHistoricFriendsSidebarElement(historicFriends, steamFriends, connectedPlayersData, connectedPlayersBanData, server, settings) {
    steamFriends = await steamFriends;
    server = await server;

    if (typeof (steamFriends) === "string") steamFriends = [];
    steamFriends = steamFriends.map(item => item.steamId);

    const onlineIds = server.map(item => item.steamId);

    const rustApiFriends = (await historicFriends.rustApi)
        .filter(friend => !steamFriends.includes(friend.steamId))
        .map(item => {
            const steamData = getPlayerSteamData(item.steamId, connectedPlayersData);
            const banData = getPlayerSteamData(item.steamId, connectedPlayersBanData);
            const online = onlineIds.includes(item.steamId);

            return { ...item, steamData, banData, online }
        });
    rustApiFriends.sort((a, b) => {
        if (a.online !== b.online) return a.online ? -1 : 1;

        const value1 = b.since === 0 ? b.firstSeen : b.since;
        const value2 = a.since === 0 ? a.firstSeen : a.since;
        return value1 - value2;
    });

    const spot = settings.historicFriends.spot;
    const sidebarSlot = document.getElementById(`bme-sidebar-${spot}`);
    if (!sidebarSlot) return console.error(`BM-EXTRA: Sidebar element couldn't be located: ${`bme-sidebar-${spot}`}`)

    const steamFriendsContainer = getHistoricSteamFriendsContainer(rustApiFriends, settings);
    if (!sidebarSlot.hasChildNodes()) sidebarSlot.append(steamFriendsContainer);

}
function getPlayerSteamData(steamId, playerData) {
    for (const item of playerData) if (item.steamId === steamId) return item;
    return null;
}
function getHistoricSteamFriendsContainer(historicFriends, settings) {
    const element = document.createElement("div");
    element.classList.add("bme-sidebar-historic-friends")

    const header = getFriendlistHeader(`Historic Friends(${historicFriends.length}):`);
    const body = getFriendlistBody(historicFriends, settings, true)
    element.append(header, body);
    return element;

}
function getSteamFriendsContainer(steamFriends, settings) {
    const element = document.createElement("div");
    element.classList.add("bme-sidebar-friends")

    const titleText = typeof (steamFriends) === "string" ? "Steam Friends:" : `Steam Friends(${steamFriends.length}):`;
    const header = getFriendlistHeader(titleText);
    const body = getFriendlistBody(steamFriends, settings)

    element.append(header, body);
    return element;
}
function getFriendlistHeader(titleText) {
    const wrapper = document.createElement("div")
    wrapper.classList.add("bme-friendlist-header");

    const title = document.createElement("h1");
    title.innerText = titleText;
    wrapper.appendChild(title);

    return wrapper;
}
function getFriendlistBody(friends, settings, isHistoric) {
    const container = document.createElement("div");
    container.classList.add("bme-friendlist-body")

    const p = document.createElement("p");
    if (friends.length === 0 || typeof (friends) === "string") {
        p.innerText = "There are no historic friends recorded!";
        if (friends === "ERROR") p.innerText = "Something went wrong!";
        if (friends === "NO_API_KEY") p.innerText = "Missing API Key";
        if (friends === "Private") p.innerText = "Friend list is private";

        if (isHistoric && friends.length === 0) p.innerText = "No friends were recorded";
        if (!isHistoric && friends.length === 0) p.innerText = "Empty friends list";
        container.appendChild(p);
        return container;
    }

    for (const friend of friends) {
        const player = getPlayerElement(friend, settings);
        container.appendChild(player);
    }

    return container;
}

export async function insertFriendComparator() {
    const sidebarSettings = JSON.parse(localStorage.getItem("BME_SIDEBAR_SETTINGS"));
    if (!sidebarSettings) return console.error(`BME-EXTRA: Sidebar settings are missing!`)

    const spot = sidebarSettings.friendComparator.spot;
    const sidebarSlot = document.getElementById(`bme-sidebar-${spot}`);
    if (!sidebarSlot) return console.error(`BM-EXTRA: Sidebar element couldn't be located: ${`bme-sidebar-${spot}`}`)
    const color = sidebarSettings.friendComparator.color;

    const element = document.createElement("div");
    element.classList.add("bme-comparator-wrapper")

    const input = document.createElement("input");
    input.placeholder = "Steam ID"
    input.addEventListener("change", async e => {
        const resetElements = Array.from(document.getElementsByClassName("bme-comparator-hit"));
        for (const element of resetElements) element.classList.remove("bme-comparator-hit");

        const value = e.target.value;
        e.target.classList.remove(`bme-comparator-yellow`);
        let feedbackColor = "green";
        if (value.length !== 17) feedbackColor = "red";
        if (isNaN(Number(value))) feedbackColor = "red";
        if (!value.startsWith("7656")) feedbackColor = "red";
        if (feedbackColor === "green") {
            const steamFriends = await getSteamFriendlistFromSteam(value);
            const historicFriends = await getSteamFriendlistFromRustApi(value);

            const friends = [];
            if (typeof (steamFriends) !== "string") steamFriends.forEach(item => friends.push(item.steamId));
            if (typeof (historicFriends) !== "string") historicFriends.forEach(item => { if (!friends.includes(item.steamId)) friends.push(item.steamId) });

            const players = Array.from(document.getElementsByClassName("player-container"));
            for (const player of players) {
                if (friends.includes(player.title)) {
                    player.style.setProperty("--hit-color", color);
                    player.classList.add("bme-comparator-hit");
                }
            }
        }
        e.target.classList.remove(`bme-comparator-yellow`)
        e.target.classList.add(`bme-comparator-${feedbackColor}`)
        setTimeout(() => { e.target.classList.remove(`bme-comparator-${feedbackColor}`) }, 600);
    })
    element.append(input);

    sidebarSlot.append(element);
}

export async function insertTeaminfoSidebarElement(team, connectedPlayersData, connectedPlayersBanData, settings) {
    team = await team;

    const teamMembers = team.members.map(member => {
        const steamData = getPlayerSteamData(member.steamId, connectedPlayersData);
        const banData = getPlayerSteamData(member.steamId, connectedPlayersBanData);

        return { ...member, steamData, banData }
    })

    const spot = settings.currentTeam.spot
    const sidebarSlot = document.getElementById(`bme-sidebar-${spot}`);
    if (!sidebarSlot) return console.error(`BM-EXTRA: Sidebar element couldn't be located: ${`bme-sidebar-${spot}`}`)

    const element = getTeamInfoElement(team.teamId, teamMembers, team.server, team.raw, settings);
    if (!sidebarSlot.hasChildNodes()) sidebarSlot.append(element);
}
function getTeamInfoElement(teamId, teamMembers, server, raw, settings) {
    const element = document.createElement("div");
    element.classList.add("bm-sidebar-teaminfo")
    const header = getTeamInfoHeader(teamId, teamMembers, server, raw);
    const body = getTeamInfoBody(teamId, teamMembers, raw, settings)
    element.append(header, body);

    return element;
}
function getTeamInfoHeader(teamId, teamMembers, serverName, raw) {
    const header = document.createElement("div")
    header.classList.add("bme-team-header");

    const wrapper = document.createElement("div");
    wrapper.classList.add("bme-team-header-wrapper");
    header.appendChild(wrapper)

    const title = document.createElement("h1");
    title.classList.add("bme-grow")
    wrapper.appendChild(title);
    title.innerText = `Current Team(${teamMembers.length}):`;


    if (teamId.length < 6) {
        const id = document.createElement("h2")
        id.innerText = isNaN(Number(teamId)) ? teamId : `ID: ${teamId}`;
        wrapper.appendChild(id);
    }

    const copyButton = document.createElement("img");
    copyButton.title = "Copy raw teaminfo!"
    copyButton.src = chrome.runtime.getURL('assets/img/copy.png');
    copyButton.addEventListener("click", () => {
        navigator.clipboard.writeText(raw);
    })
    wrapper.appendChild(copyButton);

    const server = document.createElement("p");
    server.innerText = serverName;
    header.appendChild(server)

    return header;
}
function getTeamInfoBody(teamId, teamMembers, raw, settings) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("bme-team-body")
    if (teamId === -1 || teamId === "error" || raw === "NO_SERVER") {
        const p = document.createElement("p");
        if (teamId === -1) p.innerText = raw;
        if (teamId === "error") p.innerText = "Failed to request teaminfo!";

        wrapper.appendChild(p);
        return wrapper;
    }

    for (const member of teamMembers) {
        const player = getPlayerElement(member, settings);
        wrapper.appendChild(player)
    }

    return wrapper;
}

export async function updatePlayerProfileElements(cache) {
    const connectedPlayersData = cache.connectedPlayersData;
    const connectedPlayersBanData = cache.connectedPlayersBanData;

    const sidebarSettings = JSON.parse(localStorage.getItem("BME_SIDEBAR_SETTINGS"));
    if (!sidebarSettings) return console.error(`BME-EXTRA: Sidebar settings are missing!`)

    const profiles = document.querySelectorAll(".player-missing-data, .player-missing-ban-data");
    for (const profile of profiles) {
        const playerData = JSON.parse(profile.dataset.save);

        playerData.steamData = getPlayerSteamData(playerData.steamId, connectedPlayersData);
        playerData.banData = getPlayerSteamData(playerData.steamId, connectedPlayersBanData);

        const playerElement = getPlayerElement(playerData, sidebarSettings);

        profile.replaceWith(playerElement)
    }
}

function getPlayerElement(player, settings) {    
    const avatarValue = player.steamData?.avatar ? player.steamData.avatar : "unknown";
    const nameValue = player.steamData?.name ? player.steamData.name : player.steamId;
    const setupValue = player.steamData?.setup !== undefined ? player.steamData.setup : null;

    const container = document.createElement("div");
    container.classList.add("player-container");
    if (player.online) {
        container.classList.add("player-online")
        container.style.setProperty("--online-color", settings.friends.onlineColor)
    }
    container.dataset.save = JSON.stringify(player);
    if (!player.steamData) container.classList.add("player-missing-data")
    if (!player.banData) container.classList.add("player-missing-ban-data")
    container.title = player.steamId;
    if (player?.origin === "origin") container.style.background = settings.historicFriends.seenOnOrigin;
    if (player?.origin === "friend") container.style.background = settings.historicFriends.seenOnFriend;

    const avatar = document.createElement("img");
    avatar.src = avatarValue === "unknown" ?
        `https://avatars.cloudflare.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg` :
        `https://avatars.cloudflare.steamstatic.com/${avatarValue}_full.jpg`;
    container.appendChild(avatar);

    const details = document.createElement("div");
    details.classList.add("player-details")
    container.appendChild(details);

    const name = document.createElement("a");
    name.href = `https://steamcommunity.com/profiles/${player.steamId}`;
    name.target = "_blank";
    name.innerText = nameValue;
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

    if (player.leader) {
        const leaderElement = document.createElement("p");
        leaderElement.innerText = `Team Leader`;
        details.appendChild(leaderElement)
    }

    const banData = getBanData(player.banData, setupValue);
    container.appendChild(banData);


    const bmButton = getBmButton(player.steamId);
    container.appendChild(bmButton);

    return container;
    function getPlayerTimeString(timestamp) {
        return `${new Date(timestamp).toISOString().substring(0, 10)} (${Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000))} days)`;
    }
}
function getBanData(banData, setupValue) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("ban-data-wrapper");

    const inner = document.createElement("div");
    inner.classList.add("ban-data-inner");
    wrapper.appendChild(inner);

    if (setupValue === false) {
        const warningSign = getWarningSign();
        wrapper.append(warningSign)
    }

    const container = document.createElement("div");
    container.classList.add("ban-data");

    let iconSrc;
    let colorClass;
    if (banData?.gameBanCount > 0 || banData?.vacBanCount > 0) {
        colorClass = "bme-ban-red";
        iconSrc = '/assets/img/danger.png';
    } else if (banData?.gameBanCount === 0 && banData?.vacBanCount === 0) {
        colorClass = "bme-ban-green";
        iconSrc = '/assets/img/clear.png';
    } else {
        colorClass = "bme-ban-gray";
        iconSrc = '/assets/img/no-signal.png';
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

    return wrapper;
}
function getWarningSign() {
    const wrapper = document.createElement("div")
    wrapper.classList.add("player-warning-wrapper");

    const img = document.createElement("img");
    img.src = chrome.runtime.getURL('/assets/img/warning.png');
    wrapper.appendChild(img)

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

export async function insertPublicBansSidebarElement(publicBans) {
    publicBans = await publicBans;

    const sidebarSettings = JSON.parse(localStorage.getItem("BME_SIDEBAR_SETTINGS"));
    if (!sidebarSettings) return console.error(`BME-EXTRA: Sidebar settings are missing!`)

    const spot = sidebarSettings.publicBans.spot
    const sidebarSlot = document.getElementById(`bme-sidebar-${spot}`);
    if (!sidebarSlot) return console.error(`BM-EXTRA: Sidebar element couldn't be located: ${`bme-sidebar-${spot}`}`)

    const publicBansElement = getPublicBansElement(publicBans);
    if (!sidebarSlot.hasChildNodes()) sidebarSlot.appendChild(publicBansElement);
}
function getPublicBansElement(publicBans) {
    const element = document.createElement("div");
    element.classList.add("bme-sidebar-public-bans")

    const header = getPublicBansHeader(publicBans);
    const body = getPublicBansBody(publicBans);
    element.append(header, body);

    return element
}
function getPublicBansHeader() {
    const header = document.createElement("div");
    header.classList.add("bme-sidebar-bans-header")

    const wrapper = document.createElement("div");
    wrapper.classList.add("bme-sidebar-bans-wrapper")
    header.appendChild(wrapper)

    const title = document.createElement("h1");
    title.innerText = "Public Bans:";
    wrapper.appendChild(title);

    return header;
}
function getPublicBansBody(publicBans) {
    const body = document.createElement("div");
    body.classList.add("bme-public-bans-body")

    if (typeof (publicBans) === "string" || publicBans.length === 0) {
        const text = document.createElement("p");
        if (publicBans === "ERROR") text.innerText = "Failed to request bans";
        if (publicBans === "AUTH_ERROR") text.innerText = "Missing authorization";
        if (publicBans === "NO_API_KEY") text.innerText = "Missing Rust API Key";
        if (publicBans.length === 0) text.innerText = "No bans were recorded";
        body.append(text);
        return body
    }

    for (const ban of publicBans) {
        const banElement = getBanElement(ban);
        body.appendChild(banElement);
    }

    return body;
}
function getBanElement(ban) {
    const element = document.createElement("div");
    element.classList.add("bme-sidebar-ban-element")

    const reason = document.createElement("p");
    reason.classList.add("bme-sidebar-ban-reason")
    reason.title = ban.reason;
    reason.innerHTML = `<span class="bme-bold">${ban.reason}</span>`;
    element.appendChild(reason);

    const innerDiv = document.createElement("div")
    innerDiv.classList.add("bme-ban-inner-div")
    element.appendChild(innerDiv)

    const org = document.createElement("p");
    org.innerHTML = `<span class="bme-bold">Org:</span> ${ban?.org?.name}`;
    innerDiv.appendChild(org);

    /*const details = document.createElement("div");
    details.classList.add("bme-sidebar-ban-details");
    element.appendChild(details);*/


    const timestamp = document.createElement("p");
    const duration = ban.duration === "Perm" ? "Permanent" : ban.duration === "Unknown" ? "Unknown" : getTimeString(ban.duration * 1000, true);
    timestamp.innerHTML = `<span class="bme-bold">Details:</span> ${getTimeString(ban.timestamp * 1000)} ago | ${duration}`;
    innerDiv.appendChild(timestamp);

    return element
}