import { shouldAbort, getElementWhenAppears, getLastServer, getStreamerModeName, getSteamIdObject, setNativeValue, getIdentifierType, getTimeSpan, getIdentifiers, cssAnchors, getHiddenTableRow } from "../misc.js";
import { displaySettings } from "../settings/settings.js";

export async function displaySettingsButton(bmId) {
    const rconElement = await getElementWhenAppears("RCONPlayerPage");

    const button = document.createElement("img");
    button.id = "bme-settings-button"
    button.src = browser.runtime.getURL('assets/img/settings.png');

    button.addEventListener("click", displaySettings)

    const testElement = document.getElementById("bme-settings-button");
    if (testElement) return;
        
    rconElement.before(button);
    invokeRerender(button, bmId, "overview", displaySettingsButton, [bmId]);
}

export async function displayAvatar(bmId, bmProfile, loc) {
    const avatar = document.getElementById("bme-avatar");
    if (avatar) avatar.remove();
    bmProfile = await bmProfile;

    let avatarUrl = "";

    const steamIdObject = getSteamIdObject(bmProfile.included);
    const profile = steamIdObject?.attributes?.metadata?.profile;
    if (profile) avatarUrl = profile.avatarmedium;

    if (!avatarUrl) return;

    const mainElement = await getElementWhenAppears("main", true);

    //if overview page, wait till RCON element appears, last stage of page load
    if (location.href.split("/").length === 6) await getElementWhenAppears("RCONPlayerPage");

    const title = mainElement?.querySelector("div")?.firstChild;
    if (!title) return;

    const avatarElement = document.createElement("img");
    avatarElement.src = avatarUrl;
    avatarElement.id = "bme-avatar";

    if (shouldAbort(bmId, "bme-avatar")) return;
    title.insertAdjacentElement("afterbegin", avatarElement)
    invokeRerender(title, bmId, loc, displayAvatar, [bmId, bmProfile, loc])
}

export async function swapBattleEyeGuid(bmId, bmProfile, target) {
    bmProfile = await bmProfile;

    const steamIdObject = getSteamIdObject(bmProfile.included);
    const steamId = steamIdObject?.attributes?.identifier;
    if (!steamId) return console.error("BM-EXTRA: Steam ID is missing")

    const smName = getStreamerModeName(steamId);
    if (!smName) return console.error("BM-EXTRA: Failed to get Streamer Mode name")

    const identifiers = await getIdentifiers();
    let battleEyeGuidElement = null;
    for (const identifier of identifiers) {

        const { type, id } = getIdentifierType(identifier)
        if (type === "SM Name") //Already present, just make sure it stays there
            return invokeRerender(identifier, bmId, target, swapBattleEyeGuid, [bmId, bmProfile, target])

        if (type !== "BattlEye GUID") continue;
        battleEyeGuidElement = identifier;
        break;
    }
    if (!battleEyeGuidElement) return console.error("BME-EXTRA: Failed to locate BattleEye GUID");

    const infoElement = battleEyeGuidElement.children[1];
    infoElement.firstChild.innerText = "SM Name";
    infoElement.lastChild.remove(); //Remove org lister
    infoElement.lastChild.remove(); //Remove session button
    infoElement.lastChild.remove(); //Remove copy button
    infoElement.lastChild.remove(); //Remove empty p tag

    battleEyeGuidElement.title = smName;
    battleEyeGuidElement.children[0].firstChild.title = smName;
    const smNameElement = battleEyeGuidElement.children[0]?.firstChild?.firstChild;
    smNameElement.innerText = smName;
    smNameElement.title = smName;

    const hiddenElement = getHiddenTableRow();
    battleEyeGuidElement.parentNode.append(hiddenElement);
    invokeRerender(hiddenElement, bmId, target, swapBattleEyeGuid, [bmId, bmProfile, target]);
}

export async function selectLastServer(bmId, bmProfile) {
    bmProfile = await bmProfile;

    const lastServer = await getLastServer(bmProfile, true);
    const form = await getElementWhenAppears("ban-form", true)
    const formHeader = Array.from(form.children[0].children);

    let servers = null;
    for (const element of formHeader) {
        if (element.children.length !== 1) continue;
        const child = element.children[0];
        if (!child || child.nodeName !== "SELECT") continue;

        servers = child;
        break;
    }
    if (!servers) return console.error("BM-EXTRA: Failed to find servers!");

    const target = String(lastServer?.id);
    setNativeValue(servers, target, true);
}

let currentRedactedElements = [] //key, originalValue
let showIdentifiersTimeout = null;
export async function redactIdentifiers(redactSteamId, redactIps, redactTime) {
    const tables = Array.from(document.getElementsByClassName(cssAnchors.identifierTable));
    tables.forEach(table => redactIdentifierTable(table, redactSteamId, redactIps));

    if (showIdentifiersTimeout) clearTimeout(showIdentifiersTimeout);
    showIdentifiersTimeout = setTimeout(() => {
        revertItems(currentRedactedElements, true);
        currentRedactedElements = [];
    }, redactTime);
}
function redactIdentifierTable(table, redactSteamId, redactIps) {
    const identifiers = Array.from(table?.lastChild?.children || []);
    for (const identifier of identifiers) {
        const identifierDetails = getIdentifierType(identifier);
        const type = identifierDetails?.type;
        if (type === null) continue;

        const span = identifier?.firstChild?.firstChild?.querySelector("span");
        if (!span) continue;

        if (type === "IP" && redactIps) {
            redactIdentifier(identifier, span, type);

            const range = identifier.querySelector(".bme-ip-range");
            if (range) redactIdentifier(identifier, range, "Range");

            const host = identifier.querySelector(".bme-ip-host");
            if (host) redactIdentifier(identifier, host, "Host");
            continue; //Check next
        }

        if ((type === "Steam ID" || type === "BattlEye GUID") && redactSteamId) {
            redactIdentifier(identifier, span, type);
            continue; //Check next
        }
    }
}
function redactIdentifier(identifier, span, type) {
    const spanValue = span.title;
    const originalValue = span.innerHTML;

    span.innerHTML = span.innerHTML.replaceAll(spanValue, "REDACTED");

    //Store it for later if it changed
    if (span.innerHTML === originalValue) return
    currentRedactedElements.push({ key: span, originalValue })

    if (type !== "IP") return;
    const button = identifier.querySelector(".bme-button");
    if (button) button.classList.add("bme-button-redacted")
}

let currentShowDaysElements = []; //key, originalValue
let showDaysTimeout = null;
export function convertTimestampsToDay(duration) {
    const spans = Array.from(document.querySelectorAll(".bme-time"));
    for (const span of spans) {
        const originalValue = span.textContent;

        const timestamp = span.dataset.raw;
        const isDuration = span.dataset.duration == "true" ? true : false

        const newSpan = new DOMParser().parseFromString(getTimeSpan(timestamp, isDuration, true), "text/html").body.firstElementChild;
        const newText = newSpan.textContent;

        if (newText === originalValue) continue; //No need to change

        currentShowDaysElements.push({ key: span, originalValue })
        span.textContent = newText;
    }

    if (showDaysTimeout) clearTimeout(showDaysTimeout);
    showDaysTimeout = setTimeout(() => {
        revertItems(currentShowDaysElements);
        currentShowDaysElements = [];
    }, duration);
}

function revertItems(arr, buttons) {
    for (const item of arr) item.key.textContent = item.originalValue;

    if (buttons) {
        const buttons = Array.from(document.querySelectorAll(".bme-button-redacted"));
        for (const button of buttons) button.classList.remove("bme-button-redacted")
    }
}




const elements = new Set();
export async function invokeRerender(target, bmId, loc, func, params, limit = 10000) {
    const call = () => { func(...params) };
    const item = { element: target, loc, bmId, call, start: Date.now(), limit }

    if (!item.element.isConnected) return item.call();
    elements.add(item)
}
checkMutations();
function checkMutations() {
    const observer = new MutationObserver(() => {
        if (elements.size === 0) return;

        const bmId = window.location.href.split("/")[5];
        for (const item of elements) checkElement(item, bmId);
    });

    observer.observe(document, { childList: true, subtree: true });
}
function checkElement(item, bmId) {
    if (!onLocation(item.loc)) return elements.delete(item); //swtiched page
    if (Date.now() - item.start > item.limit) return elements.delete(item) //old
    if (item.bmId !== bmId) return elements.delete(item); //switched page

    if (item.element.isConnected) return; //Still on page

    elements.delete(item); //Disappeared
    item.call();
}
function onLocation(loc) {
    if (loc === "overview") {
        const arr = window.location.href.split("/");
        if (arr.length !== 6) return false;
        if (arr[4] !== "players") return false;
    } else if (!window.location.href.includes(loc)) return false;

    return true;
}