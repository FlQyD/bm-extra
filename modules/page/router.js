import { setupCacheFor, cache } from "../page/cache/cache.js";
import { advancedBans, closeAdminLog, displayInfoPanel, displayServerActivity, limitItem, removeSteamInformation, displayAlertLink } from "./overview/overview.js";
import { highlightVpnIdentifiers, showExtraDataOnIps, displayAvatars, displayEvasionCheckerPanel, displaySteamLinks } from "./identifier/identifier.js";
import { convertTimestampsToDay, displayAvatar, displaySettingsButton, redactIdentifiers, selectLastServer, swapBattleEyeGuid } from "./display.js";
import { insertBanPresets, insertFriendComparator, insertFriendsSidebarElement, insertHistoricFriendsSidebarElement, insertRelatedPlayers, insertPublicBansSidebarElement, insertSidebars, insertTeaminfoSidebarElement } from "../sidebar.js";
import { getElementWhenAppears, removeSidebars } from "../misc.js";
import { checkAndSetupSettingsIfMissing } from "../settings/settings.js";

let setup = false;
export async function router(url) {
    if (!setup) {
        setup = true;
        checkAndSetupSettingsIfMissing();

        const privacySettings = JSON.parse(localStorage.getItem("BME_KEYBINDS_SETTINGS"));
        detectHotkey(privacySettings);
    }

    const path = url.pathname.split("/").filter(Boolean);
    //rcon/players...
    if (path[0] === "rcon" && path[1] === "players" && path.length > 2) {
        const bmId = path[2];
        if (isNaN(Number(bmId))) return;

        await setupCacheFor(bmId, "RCON_PROFILE");

        if (path[3] === undefined) return onOverviewPage(bmId);
        if (path[3] === "identifiers") return onIdentifierPage(bmId);
    }

    //rcon/bans/add...
    if (path[0] === "rcon" && path[1] === "bans" && path[2] === "add") {
        const bmId = url.searchParams.get("player");
        if (!bmId || isNaN(Number(bmId))) return;

        await setupCacheFor(bmId, "BAN_PAGE");

        return onAddBanPage(bmId);
    }

    //Remove sidebar in any other case
    removeSidebars();
}

async function onOverviewPage(bmId) {
    const settings = JSON.parse(localStorage.getItem("BME_OVERVIEW_SETTINGS"))

    const playerCache = cache[bmId];

    const sidebarSettings = JSON.parse(localStorage.getItem("BME_SIDEBAR_SETTINGS"));
    sidebar(bmId, playerCache, sidebarSettings, "overview")

    displaySettingsButton();
    if (settings.showAlert) displayAlertLink(bmId);
    if (settings.showServer) displayServerActivity(bmId, playerCache.bmProfile);
    if (settings.showInfoPanel) displayInfoPanel(bmId, playerCache.bmProfile, playerCache.bmActivity, playerCache.rustPremium);
    if (settings.showAvatar) displayAvatar(bmId, playerCache.bmProfile, "overview");
    if (settings.removeSteamInfo) removeSteamInformation(bmId);
    if (settings.advancedBans) advancedBans(bmId, playerCache.bmBanData);
    if (settings.closeAdminLog) closeAdminLog(bmId);
    if (settings.swapBattleEyeGuid) swapBattleEyeGuid(bmId, playerCache.bmProfile, "overview");
    if (settings.maxNames > 0) limitItem(bmId, settings.maxNames, "Name");
    if (settings.maxIps > 0) limitItem(bmId, settings.maxIps, "IP");
}
async function onIdentifierPage(bmId) {
    const settings = JSON.parse(localStorage.getItem("BME_IDENTIFIER_SETTINGS"))

    const playerCache = cache[bmId];

    const sidebarSettings = JSON.parse(localStorage.getItem("BME_SIDEBAR_SETTINGS"));
    sidebar(bmId, playerCache, sidebarSettings, "identifier")

    if (settings.showAvatar) displayAvatar(bmId, playerCache.bmProfile, "identifiers");
    if (settings.showIspAndAsnData) showExtraDataOnIps(bmId, playerCache.bmProfile, settings.requestProxyCheck)
    if (settings.highlightVpn) highlightVpnIdentifiers(bmId, { label: settings.removeVpnLabel, threshold: settings.vpnAbove, background: settings.vpnBgColor, opacity: settings.vpnOpacity })
    if (settings.displayAvatars) displayAvatars(bmId, playerCache.identifiers.avatars, settings.zoomableAvatars)
    if (settings.swapBattleEyeGuid) swapBattleEyeGuid(bmId, playerCache.bmProfile, "identifiers");
    if (settings.showLinks) displaySteamLinks(bmId, playerCache.steamLinks, settings.loadDiscordData, settings.showEmptyIdInput)

    const evasionCheckerSettings = JSON.parse(localStorage.getItem("BME_EVASION_CHECKER_SETTINGS"));
    if (evasionCheckerSettings.enabled) displayEvasionCheckerPanel(bmId, evasionCheckerSettings);
}


async function onAddBanPage(bmId) {
    const settings = JSON.parse(localStorage.getItem("BME_BAN_PAGE_SETTINGS"))

    const playerCache = cache[bmId];

    sidebar(bmId, playerCache, settings, "ban");

    if (settings.selectLastServer) selectLastServer(bmId, playerCache.bmProfile);
}
async function sidebar(bmId, playerCache, settings, page) {
    const sidebar = await insertSidebars(page);

    if (settings.friendComparator?.enabled) insertFriendComparator(sidebar);
    if (settings.friends?.enabled) insertFriendsSidebarElement(sidebar, playerCache.steamFriends, cache.connectedPlayersData, cache.connectedPlayersBanData, playerCache.serverPop, settings);
    if (settings.historicFriends?.enabled) insertHistoricFriendsSidebarElement(sidebar, playerCache.historicFriends, playerCache.steamFriends, cache.connectedPlayersData, cache.connectedPlayersBanData, playerCache.serverPop, settings);
    if (settings.currentTeam?.enabled) insertTeaminfoSidebarElement(sidebar, playerCache.team, cache.connectedPlayersData, cache.connectedPlayersBanData, settings);
    if (settings.publicBans?.enabled) insertPublicBansSidebarElement(sidebar, playerCache.publicBans);
    if (settings.relatedPlayers?.enabled) insertRelatedPlayers(sidebar, playerCache.relatedPlayers, settings.relatedPlayers);

    if (settings.presets?.enabled) insertBanPresets(settings, playerCache.bmProfile);
}

let currentHotkeyTimeout = null;
let currentSequence = "";
function detectHotkey(settings) {
    const binds = [];
    for (const key in settings) {
        if (!settings[key].enabled) continue;

        binds.push({ type: key, hotkey: settings[key].hotkey });
    }

    if (binds.length === 0) return; //No keybinds active

    document.addEventListener("keydown", e => {
        if (e.repeat) return;
        if (!e.key) return;

        const key = e.key === "+" ? "plus" : e.key.toLowerCase();
        if (!currentSequence) currentSequence = key;
        else currentSequence += `+${key}`;

        if (currentHotkeyTimeout) clearTimeout(currentHotkeyTimeout);

        currentHotkeyTimeout = setTimeout(() => {
            currentSequence = "";
        }, 350);

        for (const bind of binds) {
            if (bind.hotkey !== currentSequence) continue;

            keyBindActivated(bind.type, settings[bind.type]);
        }
    })
}

function keyBindActivated(type, settings) {
    if (type === "privacy") redactIdentifiers(settings.redactSteamId, settings.redactIps, settings.redactTime);
    if (type === "showDays") convertTimestampsToDay(settings.duration)
}