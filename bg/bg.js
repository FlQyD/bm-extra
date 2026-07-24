import { sendSteamFriends } from "./modules/steam/sendSteamFriends.js";
import { sendPlayerSummaries } from "./modules/steam/sendPlayerSummaries.js";
import { sendPlayerBanSummaries } from "./modules/steam/sendPlayerBanSummaries.js";
import { sendHistoricFriends } from "./modules/pi/sendHistoricFriends.js";
import { sendHistoricAvatars } from "./modules/pi/sendHistoricAvatars.js";
import { sendPiPermissions } from "./modules/pi/sendPermissions.js";
import { sendPublicBans } from "./modules/pi/sendPublicBans.js";
import { sendSteamLinks } from "./modules/pi/sendSteamLinks.js";
import { sendDiscordData } from "./modules/pi/sendDiscordData.js";
import { sendDiscordMessages } from "./modules/pi/sendDiscordMessages.js";
import { sendPremiumStatus } from "./modules/facepunch/sendPremiumStatus.js";
import { sendProxyCheckData } from "./modules/proxycheck/sendProxyCheckData.js";
import { sendBmAccount } from "./modules/bm/sendBmAccount.js";
import { sendBmBans } from "./modules/bm/sendBmBans.js";

console.log("Service worker loaded!")

export const errorString = {
    noKey: "MISSING_API_KEY",
    invalidKey: "INVALID_API_KEY",
    noPerm: "MISSING_PERMISSION",
    failedToFetch: "FAILED_TO_FETCH",
}

/**
 * apiKey - API KEY where it is needed
 * subject - steam ID, IP
 */
browser.runtime.onMessage.addListener(async (req, sender) => {
    if (!req.type.startsWith("BME_")) return;
    if (req.type === "BME_JSON_DOWNLOAD") return downloadJsonFile(req.filename, req.data)

    toLog(req.type, req?.apiKey, req.subject)
    /**
     * returnObject:
     * type: original type +"_RESOLVED"
     * value: the outcome of the request or the error string
     */
    const returnObject = { type: `${req.type}_RESOLVED` }
    try {
        if (req.type.startsWith("BME_CURRENT_FRIENDS")) return await sendSteamFriends(req.subject, sender.tab.id, returnObject);
        if (req.type.startsWith("BME_HISTORIC_FRIENDS")) return await sendHistoricFriends(req.subject, sender.tab.id, returnObject);
        if (req.type.startsWith("BME_PREMIUM_STATUS")) return await sendPremiumStatus(req.subject, sender.tab.id, returnObject);
        if (req.type.startsWith("BME_PLAYER_SUMMARIES")) return await sendPlayerSummaries(req.subject, sender.tab.id, returnObject);
        if (req.type.startsWith("BME_BAN_SUMMARIES")) return await sendPlayerBanSummaries(req.subject, sender.tab.id, returnObject);
        if (req.type.startsWith("BME_HISTORIC_AVATARS")) return await sendHistoricAvatars(req.subject, sender.tab.id, returnObject);
        if (req.type.startsWith("BME_PLAYER_INSIGHT_PERMS")) return await sendPiPermissions(sender.tab.id, returnObject);
        if (req.type.startsWith("BME_PROXYCHECK")) return await sendProxyCheckData(req.subject, sender.tab.id, returnObject)
        if (req.type.startsWith("BME_PUBLIC_BANS")) return await sendPublicBans(req.subject, sender.tab.id, returnObject);
        if (req.type.startsWith("BME_STEAM_LINKS")) return await sendSteamLinks(req.subject, sender.tab.id, returnObject);
        if (req.type.startsWith("BME_DISCORD_DATA")) return await sendDiscordData(req.subject, sender.tab.id, returnObject);
        if (req.type.startsWith("BME_DISCORD_MESSAGES")) return await sendDiscordMessages(req.subject, sender.tab.id, returnObject);
        if (req.type.startsWith("BME_BM_ACCOUNT")) return await sendBmAccount(req.subject, sender.tab.id, returnObject, req.token);
        if (req.type.startsWith("BME_BM_BANS")) return await sendBmBans(req.subject, sender.tab.id, returnObject, req.token);
    } catch (error) {
        console.error(`Failed to fetch the response for ${req.type}: ${error}`);
        return browser.tabs.sendMessage(sender.tab.id, {...returnObject, value: errorString.failedToFetch});
    }
})

export function sendResponse(tabId, returnObject, value) {
    returnObject.value = value;
    return browser.tabs.sendMessage(tabId, returnObject);
}

function toLog(type, key, subject) {
    type = type.substring(0, 30).padEnd(30);
    subject = subject.includes("-") ?
        `${subject.split("-").join(" | ")}` :
        subject.includes(",") ?
            subject.split(",").length :
            subject;

    console.log(`${type} | ${subject}`);
}

export async function getKey(storageName) {
    let key = await browser.storage.local.get(storageName);
    key = key[storageName];
    return key || null;
}

function downloadJsonFile(name, content) {
    const json = JSON.stringify(content, null, 4);
    const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;

    browser.downloads.download({
        url: dataUrl,
        filename: name,
        saveAs: true,
    });
}