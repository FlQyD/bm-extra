import { getAuthToken, getCurrentFriends, getHistoricFriends, getLastServer, talkToBackgroundScript } from "../../misc.js";
import { updatePlayerProfileElements } from "../../sidebar.js";
import { displayDiscordData } from "../identifier/identifier.js";
import { organizations } from "./teaminfo.js";

export const cache = {};
cache.connectedPlayersData = [];
cache.connectedPlayersBanData = [];
cache.discordUserData = [];

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
    updatePlayerProfileElements(cache)
}

const discordUserData = new Proxy(cache.discordUserData, {
    set(target, prop, value) {
        target[prop] = value;
        if (prop === "length") displayDiscordData();
        return true;
    }
});

export async function setupCacheFor(bmId, cacheType) {
    if (!cache[bmId]) cache[bmId] = {};

    const authToken = await getAuthToken();

    if (cacheType === "RCON_PROFILE") await setupPlayerCache(bmId, authToken);
    if (cacheType === "BAN_PAGE") await setupBanCache(bmId, authToken)
}
async function setupPlayerCache(bmId, authToken) {
    const settings = {}
    settings.overview = JSON.parse(localStorage.getItem("BME_OVERVIEW_SETTINGS"));
    settings.identifier = JSON.parse(localStorage.getItem("BME_IDENTIFIER_SETTINGS"));
    settings.sidebar = JSON.parse(localStorage.getItem("BME_SIDEBAR_SETTINGS"));

    if (validate("bmProfile", settings, bmId))
        cache[bmId].bmProfile = getBmProfileData(bmId, authToken);

    if (validate("rustPremium", settings, bmId))
        cache[bmId].rustPremium = getRustPremiumStatus(cache[bmId].bmProfile);

    if (validate("steamFriends", settings, bmId))
        cache[bmId].steamFriends = getSteamFriends(cache[bmId].bmProfile, "current");

    if (validate("relatedPlayers", settings, bmId))
        cache[bmId].relatedPlayers = getRelatedPlayers(cache[bmId].bmProfile, authToken);

    if (validate("historicFriends", settings, bmId))
        cache[bmId].historicFriends = getSteamFriends(cache[bmId].bmProfile, "historic");

    if (!cache[bmId].identifiers) cache[bmId].identifiers = {}
    if (validate("steamAvatars", settings, bmId))
        cache[bmId].identifiers.avatars = getSteamAvatars(cache[bmId].bmProfile);

    if (validate("currentTeam", settings, bmId))
        cache[bmId].team = getCurrentTeam(cache[bmId].bmProfile, authToken);

    if (validate("publicBans", settings, bmId))
        cache[bmId].publicBans = getPublicBans(cache[bmId].bmProfile);

    if (validate("bmActivity", settings, bmId))
        cache[bmId].bmActivity = getBmActivity(bmId, authToken);

    if (validate("bmBanData", settings, bmId))
        cache[bmId].bmBanData = getBmBanData(bmId, authToken);

    if (validate("serverPop", settings, bmId))
        cache[bmId].serverPop = getCurrentServersPopulation(cache[bmId].bmProfile, authToken)

    if (validate("steamLinks", settings, bmId))
        cache[bmId].steamLinks = getSteamLinks(cache[bmId].bmProfile)

    if (validate("discordData", settings, bmId)) getDiscordData(cache[bmId].steamLinks);

    loadPlayerData(cache[bmId].steamFriends, cache[bmId].historicFriends, cache[bmId].team);
}
function setupBanCache(bmId, authToken) {
    const settings = {}
    settings.banPage = JSON.parse(localStorage.getItem("BME_BAN_PAGE_SETTINGS"));

    if (validate("bmProfile", settings, bmId))
        cache[bmId].bmProfile = getBmProfileData(bmId, authToken);

}
function validate(section, { overview, identifier, sidebar, banPage }, bmId) {
    if (section === "bmProfile") {
        if (cache[bmId]?.bmProfile !== undefined) return false; //Already Cached

        const needed =
            banPage?.selectLastServer ||
            banPage?.presets.enabled ||
            overview?.showServer ||
            overview?.showInfoPanel ||
            overview?.showAvatar ||
            overview?.swapBattleEyeGuid ||
            identifier?.showAvatar ||
            identifier?.showIspAndAsnData ||
            identifier?.swapBattleEyeGuid ||
            identifier?.displayAvatars ||
            sidebar?.currentTeam.enabled ||
            sidebar?.friends.enabled ||
            sidebar?.historicFriends.enabled ||
            sidebar?.publicBans.enabled;
        if (needed) return true;
    } else if (section === "rustPremium") {
        if (cache[bmId]?.rustPremium !== undefined) return false;//Already Cached

        const needed = overview?.showInfoPanel
        if (needed) return true;
    } else if (section === "steamFriends") {
        if (cache[bmId]?.steamFriends !== undefined) return false;//Already Cached

        const needed =
            sidebar?.friends.enabled ||
            sidebar?.historicFriends.enabled;
        if (needed) return true;
    } else if (section === "historicFriends") {
        if (cache[bmId]?.historicFriends !== undefined) return false;//Already Cached

        const needed = sidebar?.historicFriends.enabled
        if (needed) return true;
    } else if (section === "steamAvatars") {
        if (cache[bmId]?.identifiers?.avatars !== undefined) return false;//Already Cached

        const needed = identifier?.displayAvatars
        if (needed) return true;
    } else if (section === "currentTeam") {
        if (cache[bmId]?.team !== undefined) return false;//Already Cached

        const needed = sidebar?.currentTeam.enabled
        if (needed) return true;
    } else if (section === "publicBans") {
        if (cache[bmId]?.publicBans !== undefined) return false;//Already Cached

        const needed = sidebar?.publicBans.enabled
        if (needed) return true;
    } else if (section === "bmActivity") {
        if (cache[bmId]?.bmActivity !== undefined) return false;//Already Cached

        const needed = overview?.showInfoPanel
        if (needed) return true;
    } else if (section === "bmBanData") {
        if (cache[bmId]?.bmBanData !== undefined) return false;//Already Cached

        const needed = overview?.advancedBans
        if (needed) return true;
    } else if (section === "serverPop") {
        if (cache[bmId]?.serverPop !== undefined) return false;//Already Cached

        const needed =
            (sidebar?.friends.showOnline && sidebar?.friends.enabled) ||
            (sidebar?.friends.showOnline && sidebar?.historicFriends.enabled);
        if (needed) return true;
    } else if (section === "steamLinks") {
        if (cache[bmId]?.steamLinks !== undefined) return false;//Already Cached

        const needed = identifier?.showLinks
        if (needed) return true;
    } else if (section === "discordData") {
        const needed = identifier?.loadDiscordData
        if (needed) return true;
    } else if (section === "relatedPlayers") {
        if (cache[bmId]?.relatedPlayers !== undefined) return false;//Already Cached

        const needed = sidebar?.relatedPlayers?.enabled;
        if (needed) return true;
    }

    return false;
}
async function getBmProfileData(bmId, authToken) {
    try {
        const data = await fetchBmAPI(`https://api.battlemetrics.com/players/${bmId}?version=^0.1.0&include=server,identifier&access_token=${authToken}`);
        if (typeof (data) === "string") throw new Error(`Failed to request BM profile. | Status: ${data}`);

        return data;
    } catch (error) {
        console.error(`BM-EXTRA: ${error}`);
        return null;
    }
}
async function getRustPremiumStatus(bmProfile) {
    bmProfile = await bmProfile;

    const steamId = getSteamIdFromBmProfile(bmProfile)
    if (!steamId) return;

    return await talkToBackgroundScript("BME_PREMIUM_STATUS", steamId);
}
async function getRelatedPlayers(bmProfile, authToken) {
    bmProfile = await bmProfile;

    const servers = bmProfile.included.filter(item => item.type === "server").map(item => new Date(item.meta.lastSeen).getTime());
    servers.sort((a, b) => b - a)

    const lastPlayed = servers[0];
    if (lastPlayed < Date.now() - 30 * 24 * 60 * 60 * 1000) return "Inactive for over 30 days"; //Hasn't played in a month

    const now = Date.now();
    const bmId = bmProfile.data.id;
    const endPeriod = new Date(now).toISOString();
    const startPeriod = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();


    const data = await fetchBmAPI(`https://api.battlemetrics.com/players/${bmId}/relationships/coplay?page[size]=100&filter[period]=${startPeriod}:${endPeriod}&access_token=${authToken}`)
    if (typeof (data) === "string") return data;

    const players = data.data.map(player => {
        return {
            name: player.attributes.name,
            bmId: player.id,
            duration: player.attributes.duration,
        }
    })
    players.sort((a, b) => { b.duration - a.duration });
    return players;
}
async function getBmBanData(bmId, authToken) {
    const data = fetchBmAPI(`https://api.battlemetrics.com/bans?version=^0.1.0&filter[player]=${bmId}&filter[expired]=true&access_token=${authToken}`);
    return data;
}
async function getBmActivity(bmId, authToken) {
    try {
        const data = await fetchBmAPI(`https://api.battlemetrics.com/activity?version=^0.1.0&tagTypeMode=and&filter[tags][blacklist]=2ff49080-f925-47e4-ab9b-9cdb75575695&filter[types][whitelist]=rustLog:playerReport,rustLog:playerDeath:PVP&filter[players]=${bmId}&include=organization,user&page[size]=1000&access_token=${authToken}`);
        if (typeof (data) === "string") throw new Error(`Failed to request activity for ${bmId} | Status: ${data}`);

        if (data?.links?.next) {
            const nextData = await requestNextPage(data.links.next, authToken, 1);
            if (!nextData) return data;

            nextData.data.forEach(item => data.data.push(item))
            nextData.included.forEach(item => data.included.push(item))
        }

        return data;
    } catch (error) {
        console.error(`BM-EXTRA: ${error}`);
    }
}
async function requestNextPage(url, token, page) {
    try {
        const data = await fetchBmAPI(`${url}&access_token=${token}`);
        if (typeof (data) === "string") return null;

        return data
    } catch (error) {
        console.error(`BM-EXTRA: ${error}`);
        return null;
    }
}
async function getSteamFriends(bmProfile, type) {
    bmProfile = await bmProfile;
    const steamId = getSteamIdFromBmProfile(bmProfile)
    if (!steamId) return null;

    if (type === "current") return getCurrentFriends(steamId);
    if (type === "historic") return getHistoricFriends(steamId);
    return undefined;
}
let _awaitingPlayerData = false;
async function loadPlayerData(friends, historicFriends, team,) {
    if (_awaitingPlayerData) return;
    try {
        _awaitingPlayerData = true;

        friends = await friends;
        historicFriends = await historicFriends;
        team = await team;

        const uniqueSteamIds = [];

        if (typeof (friends) === "object" && friends)
            friends.forEach(friend => { if (!uniqueSteamIds.includes(friend.steamId)) uniqueSteamIds.push(friend.steamId) });

        if (typeof (historicFriends) === "object" && historicFriends)
            historicFriends.forEach(friend => { if (!uniqueSteamIds.includes(friend.steamId)) uniqueSteamIds.push(friend.steamId) });

        if (typeof (team) === "object" && team?.members)
            team.members.forEach(member => { if (!uniqueSteamIds.includes(member.steamId)) uniqueSteamIds.push(member.steamId) });

        const currentPlayerData = connectedPlayersData.map(item => item.steamId);
        const waitingForPlayerData = uniqueSteamIds.filter(item => !currentPlayerData.includes(item));
        for (let i = 0; i < waitingForPlayerData.length; i += 100) {
            requestAndProcessPlayerData(waitingForPlayerData.slice(i, i + 100));
        }

        const currentPlayerBanData = connectedPlayersBanData.map(item => item.steamId);
        const waitingForPlayerBanData = uniqueSteamIds.filter(item => !currentPlayerBanData.includes(item));
        for (let i = 0; i < waitingForPlayerBanData.length; i += 100) {
            requestAndProcessPlayerBanData(waitingForPlayerBanData.slice(i, i + 100));
        }
    } catch (error) {
        throw error;
    } finally {
        _awaitingPlayerData = false;
    }
}
async function requestAndProcessPlayerData(players) {
    const playersData = await getPlayerSummariesFromSteam(players);
    if (typeof (playersData) === "string") return console.error(`BME-EXTRA: Failed to load in player data for ${players.join(", ")}`);

    connectedPlayersData.push(...playersData)
}
async function getPlayerSummariesFromSteam(steamIds) {
    return await talkToBackgroundScript("BME_PLAYER_SUMMARIES", steamIds.join(","));
}
async function requestAndProcessPlayerBanData(players) {
    const playersData = await getBanSummariesFromSteam(players);
    if (typeof (playersData) === "string") return console.error(`BME-EXTRA: Failed to load in player data for ${players.join(", ")}`);

    connectedPlayersBanData.push(...playersData)
}
async function getBanSummariesFromSteam(steamIds) {
    return await talkToBackgroundScript("BME_BAN_SUMMARIES", steamIds.join(","));
}
async function getCurrentServersPopulation(bmProfile, authToken) {
    bmProfile = await bmProfile;

    const lastServer = await getLastServer(bmProfile)
    if (!lastServer?.online) return [];

    const data = await fetchBmAPI(`https://api.battlemetrics.com/servers/${lastServer.id}?version=^0.1.0&include=identifier,player&access_token=${authToken}`);
    if (typeof (data) === "string") return [];

    let players = data.included
        .filter(item => item.type === "player")
        .map(item => {
            return {
                id: item.id,
                name: item.attributes.name,
            }
        });

    const steamIdMap = new Map();
    data.included.forEach(item => {
        if (item.attributes?.type !== "steamID") return;

        steamIdMap.set(item.relationships?.player?.data?.id, item.attributes.identifier)
    })

    return players.map(player => {
        const identifier = steamIdMap.get(player.id);
        return {
            id: player.id,
            name: player.name,
            steamId: identifier ? identifier : "unknown",
        }
    })
}

async function getSteamAvatars(bmProfile) {
    bmProfile = await bmProfile;

    const steamIdObject = bmProfile.included.find(identifier => identifier?.attributes?.type === "steamID");
    const steamId = steamIdObject?.attributes?.identifier;
    const currentAvatarUrl = steamIdObject?.attributes?.metadata?.profile?.avatar;
    const avatarHash = currentAvatarUrl?.split("/")[3]?.substring(0, 40);
    const lastSeen = Math.floor(new Date(steamIdObject?.attributes?.metadata?.profile?.lastChecked ?? steamIdObject?.attributes?.lastSeen).getTime() / 1000);
    const avatarHits = "N/A";

    if (!avatarHash) return [];
    const avatars = await getHistoricAvatars(steamId);

    if (typeof (avatars) === "string" && avatarHash) {
        return [{ avatar: avatarHash, avatarHits, lastSeen }]
    }

    const index = avatars.findIndex(item => item.avatar === avatarHash);
    if (index !== -1) {
        avatars[index].lastSeen = lastSeen;
    } else {
        avatars.push({
            avatar: avatarHash,
            avatarHits, lastSeen
        })
    }
    avatars.sort((a, b) => b.lastSeen - a.lastSeen);
    return avatars;
}
async function getHistoricAvatars(steamId) {
    return await talkToBackgroundScript("BME_HISTORIC_AVATARS", steamId)
}

async function getCurrentTeam(bmProfile, authToken) {
    try {
        bmProfile = await bmProfile;

        const lastServer = await getLastServer(bmProfile, true);
        if (lastServer === null || lastServer.lastPlayed < (Date.now() - 2 * 24 * 60 * 60 * 1000))
            return { teamId: -1, members: [], server: "", raw: "No server available!" };

        const steamId = getSteamIdFromBmProfile(bmProfile)
        if (!steamId) return { teamId: -1, members: [], server: lastServer.name, raw: "Missing steamId" };

        let rawTeaminfo = "";
        for (const organization of organizations) {
            if (lastServer?.orgId !== organization.id) continue;

            rawTeaminfo = await organization.getTeamInfo(steamId, lastServer.id, authToken);
            break;
        }

        //No support
        if (rawTeaminfo === "") return { teamId: -1, members: [], server: lastServer.name, raw: "Unsupported organization!" };

        //Something failed
        if (!rawTeaminfo || rawTeaminfo === "error") return { teamId: "error", members: [], server: "", raw: "" }

        //Not in a team / Not found on the server
        if (rawTeaminfo === "Player is not in a team" || rawTeaminfo === "Player not found") {
            return { teamId: -1, members: [], server: lastServer.name, raw: rawTeaminfo }
        }

        //Breakup rawTeaminfo
        const teamMembers = [];
        let teamId = -1;
        let onlineIndex = -1;
        let leaderIndex = -1;
        rawTeaminfo.split("\n").forEach(line => {
            if (line.startsWith("ID: ")) teamId = line.split(" ")[1];
            if (line.startsWith("steamID")) {
                onlineIndex = line.indexOf("online");
                leaderIndex = line.indexOf("leader");
            }
            if (!line.includes("76561")) return;
            const memberSteamId = line.substring(0, 17);

            teamMembers.push({ steamId: memberSteamId, online: line[onlineIndex] === "x", leader: line[leaderIndex] === "x" });
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

async function getPublicBans(bmProfile) {
    bmProfile = await bmProfile;
    const steamId = getSteamIdFromBmProfile(bmProfile)
    if (!steamId) return null;

    return requestPublicBansFor(steamId);
}
async function requestPublicBansFor(steamId) {
    return await talkToBackgroundScript("BME_PUBLIC_BANS", steamId);
}

async function getSteamLinks(bmProfile) {
    const steamId = getSteamIdFromBmProfile(await bmProfile)
    if (!steamId) throw new Error("MISSING_STEAM_ID");

    const links = await talkToBackgroundScript("BME_STEAM_LINKS", steamId)
    if (typeof (links) === "string") throw new Error(`Failed to cache steam links: ${links}`);

    return links;
}
let discordDataLoading = false;
export async function getDiscordData(steamLinks) {
    if (discordDataLoading) return;
    let loadedAccounts = 0;

    try {
        discordDataLoading = true;
        steamLinks = await steamLinks;
        const discordIds = steamLinks
            .map(item => item.discordId)
            .filter(item =>
                //Ignore if already cached
                !discordUserData.map(item => item.user.id).includes(item)
            );

        if (discordIds.length === 0) return; //There is no new item

        let promises = discordIds.map(discordId => talkToBackgroundScript("BME_DISCORD_DATA", discordId));
        await Promise.all(promises)

        for (const promise of promises) {
            const account = await promise
            if (typeof (account) === "string") continue;

            discordUserData.push(account);
        }
    } catch (error) {
        return [];
    } finally {
        discordDataLoading = false;

        //Check again for accounts loaded after start
        if (loadedAccounts > 0) getDiscordData(steamLinks);
    }
}


function getSteamIdFromBmProfile(bmProfile) {
    const steamIdObject = bmProfile.included.find(identifier => identifier?.attributes?.type === "steamID");
    return steamIdObject?.attributes?.identifier ?? null;
}
async function fetchBmAPI(url, count = 0) {
    if (count > 2) return "FAILED_TO_FETCH"
    try {
        const resp = await fetch(url);

        if (resp?.status === 429) await new Promise(r => { setTimeout(r, 5000) });
        if (resp?.status === 403) return `Forbidden`;
        if (resp?.status === 400) return `Bad request`;
        if (resp?.status !== 200) throw new Error(`Failed to fetch | Status: ${resp?.status}`);

        const data = await resp.json();
        return data;
    } catch (error) {
        console.log(`BME-EXTRA: ${error}`);
        return fetchBmAPI(url, count + 1);
    }

}




/* PROXYCHECK.IO API INTERACTIONS */
export async function getProxyCheckIpInfo(ips, filter = true) {
    const settings = JSON.parse(localStorage.getItem("BME_PROXY_CHECK_SETTINGS"))
    const barrier = settings.checkAfter === -1 ? 0 : Date.now() - settings.checkAfter;

    const allIps = ips.filter(item => item.ip).map(ip => ip.ip);
    if (allIps.length === 0) return new Map();
    const returnIps = getCachedIpsData(allIps);

    if (filter) {
        ips = ips
            .filter(ip => ip.lastSeen > barrier)
            .sort((a, b) => b.lastSeen - a.lastSeen);

        if (settings.ignoreKnownVpns)
            ips = ips.filter(ip => !ip.isVpn)

        if (settings.maxIps > -1)
            ips = ips.splice(0, settings.maxIps);
    }

    const requestedPcData = await getIpData(ips.map(ip => ip.ip), settings.keepCache);
    for (const [ip, value] of requestedPcData) returnIps.set(ip, value)

    return returnIps;
}
function getCachedIpsData(ips) {
    const returnObject = new Map();
    const pcCache = getPcCache();

    for (const ip of ips) {
        const ipCache = pcCache.get(ip);
        if (ipCache) returnObject.set(ip, ipCache);
    }

    return returnObject;
}
async function getIpData(ips, keepCache) {
    const ipData = new Map();
    const ipsToRequest = [];

    const pcCache = getPcCache();

    for (const ip of ips) {
        const ipCache = pcCache.get(ip);

        if (ipCache) ipData.set(ip, ipCache);
        else ipsToRequest.push(ip);
    }

    const requestedIpData = await getIpDataFromProxyCheck(ipsToRequest.join(","));
    if (keepCache && typeof (requestedIpData) === "object" && requestedIpData) {
        mergeRequestedDataWithCache(requestedIpData);

        for (const [ip, data] of requestedIpData)
            ipData.set(ip, data);
    }

    return ipData;
}
function mergeRequestedDataWithCache(requestedIpData) {
    const cache = getPcCache();

    if (Math.random() < 0.05)
        cleanPcCache(cache);

    for (const [ip, data] of requestedIpData)
        cache.set(ip, data);

    setPcCache(cache);
}
function cleanPcCache(cache) {
    const barrier = Date.now() - 24 * 60 * 60 * 1000;

    for (const [ip, data] of cache)
        if (data.timestamp < barrier) cache.delete(ip);

    setPcCache(cache)
}
function setPcCache(cache) {
    localStorage.setItem("BME_PROXYCHECK_CACHE", JSON.stringify([...cache.entries()]));
}
function getPcCache() {
    const cacheString = localStorage.getItem("BME_PROXYCHECK_CACHE");
    return cacheString ? new Map(JSON.parse(cacheString)) : new Map();
}
export function getPcCacheSize() {
    return getPcCache().size;
}
async function getIpDataFromProxyCheck(ips) {
    try {
        if (ips.length === 0) return null;

        let value = await talkToBackgroundScript("BME_PROXYCHECK", ips)
        if (typeof (value) === "string") return value;

        const returnValue = new Map();
        for (const key in value) {
            if (key === "status") continue;
            if (key === "query_time") continue;

            const ip = value[key];
            returnValue.set(key, getImportantIpInfo(ip))
        }

        return returnValue;
    } catch (error) {
        console.error(error);
        return "ERROR";
    }
}
function getImportantIpInfo(ip) {
    const newIp = {};
    newIp.timestamp = Date.now();
    newIp.det = {};
    newIp.det.score = ip.detections.confidence;
    newIp.det.risk = ip.detections.risk;
    newIp.det.firstSeen = ip.detections.first_seen;
    newIp.det.lastSeen = ip.detections.last_seen;
    newIp.det.anon = ip.detections.anonymous;
    newIp.det.compromised = ip.detections.compromised;
    newIp.det.host = ip.detections.hosting;
    newIp.det.proxy = ip.detections.proxy;
    newIp.det.scraper = ip.detections.scraper;
    newIp.det.tor = ip.detections.tor;
    newIp.det.vpn = ip.detections.vpn;
    newIp.net = {};
    newIp.net.org = ip.network.organisation;
    newIp.net.isp = ip.network.provider;
    newIp.net.asn = ip.network.asn;
    newIp.net.range = ip.network.range;
    newIp.net.host = ip.network.hostname;
    newIp.net.type = ip.network.type;
    newIp.loc = {};
    newIp.loc.continent = ip.location.continent_code;
    newIp.loc.countryCode = ip.location.country_code;
    newIp.loc.countryName = ip.location.country_name;
    newIp.loc.regionCode = ip.location.region_code;
    newIp.loc.regionName = ip.location.region_name;
    newIp.loc.cityName = ip.location.city_name;

    return newIp;
}