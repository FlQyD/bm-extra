import { getOverviewSettings } from "./overview/page.js";
import { checkOverviewSettings, getDefaultOverviewSettings } from "./overview/check.js";
import { getIdentifierSettings } from "./identifier/page.js";
import { checkIdentifierSettings, getDefaultIdentifierSettings } from "./identifier/check.js";
import { getBmInfoSettings } from "./bmInfo/page.js";
import { checkBmInfoSettings, getDefaultBmInfoSettings } from "./bmInfo/check.js";
import { getSidebarSettings } from "./sidebar/page.js";
import { checkSidebarSettings, getDefaultSidebarSettings } from "./sidebar/check.js";
import { getBanPageSettings } from "./bans/page.js";
import { checkBanPageSettings, getDefaultBanPageSettings } from "./bans/check.js";
import { getKeybindsSettings } from "./keybinds/page.js";
import { checkKeybindsSettings, getDefaultKeybindsSettings } from "./keybinds/check.js";
import { getEvasionCheckerSettings } from "./evasionChecker/page.js";
import { checkEvasionCheckerSettings, getDefaultEvasionCheckerSettings } from "./evasionChecker/check.js";
import { getApiKeysSettings, getKey } from "./apiKeys/page.js";
import { checkProxyCheckSettings } from "./apiKeys/check.js";
import { getGeneralSettings } from "./general/page.js";
import { checkGeneralSettings, getDefaultGeneralSettings } from "./general/check.js";
import { talkToBackgroundScript } from "../misc.js";

export async function displaySettings() {
    if (document.getElementById("bme-settings-background")) return;

    const settings = getSettingsPage();
    document.body.appendChild(settings);
}
function getSettingsPage() {
    const bg = document.createElement("div")
    bg.id = "bme-settings-background";
    bg.addEventListener("click", e => {
        if (e.target.id === "bme-settings-background") e.target.remove()
    })


    const page = document.createElement("div")
    page.id = "bme-settings-page";
    bg.appendChild(page)

    const menu = getSettingsMenu()
    page.appendChild(menu)

    const body = document.createElement("div");
    body.id = "bme-settings-body";
    page.appendChild(body);

    const content = getSettingsBody(0);
    body.appendChild(content);

    return bg;
}
function getSettingsMenu() {
    const div = document.createElement("div")
    div.id = "bme-settings-menu";

    const menuPoints = ["Overview", "Identifier", "BM Information", "Sidebar", "Bans", "Keybinds", "Evasion Checker",/*"Multi Org"*/"API Keys", "General"];
    for (let i = 0; i < menuPoints.length; i++) {
        const point = menuPoints[i];

        const menuPoint = document.createElement("div");
        menuPoint.innerText = point;
        menuPoint.classList.add("bme-settings-menu-point")
        if (i === 0) menuPoint.id = "active-setting-menu-point"

        menuPoint.addEventListener("click", e => {
            const target = e.target;

            if (target.id === "active-setting-menu-point") return;
            const current = document.getElementById("active-setting-menu-point");
            if (current) current.id = "";

            target.id = "active-setting-menu-point";
            const newBodyContent = getSettingsBody(i);

            const body = document.getElementById("bme-settings-body");
            if (!body) return;

            body.innerHTML = "";
            body.appendChild(newBodyContent);
        })

        div.appendChild(menuPoint);
    }
    return div;
}
function getSettingsBody(index) {
    if (index === 0) return getOverviewSettings();
    if (index === 1) return getIdentifierSettings();
    if (index === 2) return getBmInfoSettings();
    if (index === 3) return getSidebarSettings();
    if (index === 4) return getBanPageSettings();
    if (index === 5) return getKeybindsSettings();
    if (index === 6) return getEvasionCheckerSettings();
    if (index === 7) return getApiKeysSettings();
    if (index === 8) return getGeneralSettings();
}


/**
 * This is the main function to create setting elements. This can be used to make an element which can change and save certain changes in the settings.
 * 
 * @param {String} type - Available types: toggle, number, color, switch, select, hotkey
 * @param {String} title - Title of the settings
 * @param {String} desc - Description of the setting
 * @param {String[]|null} req 
 * @param {String} bucket - localStorage key where the settings are stored
 * @param {String} key - setting key, inside of the bucket. can include "-", in case the value would be nested: key1 > bucket.key1 | example-key2 > bucket.example.key2
 * @param {*} value - current value of the setting
 * @param {Object} meta - Optional. This is where you can land extra thins that controls how the setting element should operate, such as: options, min, max and segment.
 * 
 * @returns {HTMLElement} - Setting element that can be used in the page straight away.
 */
export function getSettingsElement(type, title, desc, req, bucket, key, value, meta) {
    const element = document.createElement("div");
    element.classList.add("bme-settings-row");

    const firstRow = document.createElement("div");

    const titleElement = document.createElement("h3");
    titleElement.classList.add("bme-settings-title");
    titleElement.textContent = title;

    const inputElement = getInput(type, bucket, key, value, meta);

    if (type === "toggle") firstRow.append(inputElement, titleElement)
    else firstRow.append(titleElement, inputElement)

    const descElement = document.createElement("p");
    descElement.classList.add("bme-settings-description");
    descElement.textContent = desc;

    element.append(firstRow, descElement)

    if (req) element.append(getRequirementsElement(req))
    if (meta?.segment) {
        if (Boolean(value)) meta.segment.classList.remove("bme-inactive-segment")
        else meta.segment.classList.add("bme-inactive-segment")
    }

    return element;
}
function getInput(type, bucket, key, value, meta) {
    if (type === "toggle" || type === "number" || type === "color")
        return getNormalInputElement(type, bucket, key, value, meta);

    if (type === "switch")
        return getSwitchInputElement(type, bucket, key, value, meta);

    if (type === "select")
        return getSelectInputElement(type, bucket, key, value, meta);

    if (type === "hotkey")
        return getHotkeyInputElement(type, bucket, key, value, meta);
}
function getNormalInputElement(type, bucket, key, value, meta) {
    const input = document.createElement("input");
    input.classList.add(`bme-settings-${type}-input`);

    if (type === "toggle") {
        input.checked = value;
        input.type = "checkbox";

    } else if (type === "color") {
        input.value = value;
        input.type = "color";

    } else if (type === "number") {
        input.value = value;
    }

    input.addEventListener("change", e => {
        try {
            const input = e.target;
            const newValue = type === "toggle" ? input.checked : type === "number" ? Number(input.value) : input.value;

            if (type === "number") {
                const min = isNaN(Number(meta?.min)) ? -1 : meta?.min;
                if (!isNaN(Number(min)) && newValue < min) throw new Error(`The new element was ${newValue}, while the minimum limit is: ${min}`);

                const max = meta?.max;
                if (max && newValue > max) throw new Error(`The new element was ${newValue}, while the maximum limit is: ${max}`);
            }

            setSettingTo(bucket, key, newValue);
            if (type === "number") showFeedback(e.target, "green")

            if (meta?.segment) {
                if (Boolean(newValue)) meta.segment.classList.remove("bme-inactive-segment");
                else meta.segment.classList.add("bme-inactive-segment");
            }
        } catch (error) {
            console.error(`BM-EXTRA: ${error}`);
            if (type === "number") showFeedback(e.target, "red")
        }
    })

    return input;
}
function showFeedback(element, color) {
    element.classList.add(`bme-sm-${color}`)
    setTimeout(() => { element.classList.remove(`bme-sm-${color}`) }, 400);
}
function getSwitchInputElement(type, bucket, key, value, meta) {
    const element = document.createElement("button");
    element.classList.add(`bme-settings-${type}-input`);

    const displayValue = getDisplayValue(value, meta.options)
    element.innerText = displayValue;

    element.addEventListener("click", e => {
        const btn = e.target;

        let index = meta.options.findIndex(item => item.display === btn.innerText) + 1;
        if (index >= meta.options.length) index = 0;

        const next = meta.options[index]
        btn.innerText = next.display
        setSettingTo(bucket, key, next.value);

    })

    return element;
}
function getDisplayValue(value, options) {
    const item = options.find(line => line.value === value);
    return item.display || "N/A";
}
function getSelectInputElement(type, bucket, key, value, meta) {
    const select = document.createElement("select");
    select.classList.add("bme-settings-selector")

    meta.options.forEach(({ value: optionValue, display }) => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = display;
        if (optionValue === value) option.selected = true;
        select.appendChild(option);
    });

    select.addEventListener("change", e => {
        const value = isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value);
        setSettingTo(bucket, key, value);
    });

    return select;
}
function setSettingTo(settingsBucket, settingsName, settingsValue) {
    const settings = JSON.parse(localStorage.getItem(settingsBucket));

    if (settingsName.includes("-")) {
        const settingsNames = settingsName.split("-")
        settings[settingsNames[0]][settingsNames[1]] = settingsValue;
    } else settings[settingsName] = settingsValue;

    localStorage.setItem(settingsBucket, JSON.stringify(settings));
}
function getRequirementsElement(requirements) {
    const element = document.createElement("p");
    element.classList.add("bme-settings-req")
    element.innerText = `REQUIRED: `;

    for (const requirement of requirements) {
        const span = document.createElement("span");
        span.innerText = requirement;

        colorBasedOnValidity(span, requirement)
        element.append(span);
    }
    
    return element
}
/*if (validity) span.classList.add("bme-settings-text-green");
else span.classList.add("bme-settings-text-red");*/
async function colorBasedOnValidity(span, requirement) {
    try {
        
        if (requirement === "STEAM API KEY") {
            const key = await getKey("BME_STEAM_API_KEY");
            if (!key) throw new Error("Not valid");
            if (key.length !== 32) throw new Error("Not valid");

        } else if (requirement === "SM Names") {
            const smData = localStorage.getItem("BME_SM_NAMES");
            if (!smData) throw new Error("Not valid");

        } else if (requirement === "PROXYCHECK") {
            const key = await getKey("BME_PROXY_CHECK_API_KEY");
            if (!key) throw new Error("Not valid");

        } else if (requirement.startsWith("Player Insight - ")) {
            const key = await getKey("BME_PLAYER_INSIGHT_API_KEY");
            if(key.length !== 64) throw new Error("Not valid");

            const type = requirement.split(" - ")[1];
            if (!validatePlayerInsightPermission(type)) throw new Error("Not valid");
        }
     
        span.classList.add("bme-settings-text-green");
    } catch (error) {
        span.classList.add("bme-settings-text-red");
    }
}
function getHotkeyInputElement(type, bucket, key, value, meta) {
    const input = document.createElement("input");
    input.readOnly = true;
    input.value = prettifyKey(value || "");
    input.classList.add(`bme-settings-${type}-input`)

    let newHotkeyTimeout = null;
    let newHotkeySequence = "";
    input.addEventListener("keydown", e => {
        e.preventDefault();
        if (e.repeat) return;

        const pressed = e.key === "+" ? "plus" : e.key.toLowerCase();
        if (meta?.max && newHotkeySequence.split("+").length >= meta.max)
            newHotkeySequence = "";

        if (!newHotkeySequence) newHotkeySequence = pressed;
        else newHotkeySequence += `+${pressed}`;

        if (newHotkeyTimeout) clearTimeout(newHotkeyTimeout)
        newHotkeyTimeout = setTimeout(() => { newHotkeySequence = ""; }, 350);

        input.value = prettifyKey(newHotkeySequence);

        if (meta?.min && newHotkeySequence.split("+").length >= meta.min) setSettingTo(bucket, key, newHotkeySequence);
        else if (!meta?.min) setSettingTo(bucket, key, newHotkeySequence);
    })

    return input;
}
function prettifyKey(str) {
    return str
        .split("+")
        .map(key => getPrettyKey(key))
        .join(" + ");
}
function getPrettyKey(key) {
    if (key === " ") return "SPACE";
    if (key === "control") return "CTRL";
    if (key === "capslock") return "CAPS LOCK";
    if (key === "altgraph") return "ALT GR";
    if (key === "pageup") return "PGUP";
    if (key === "pagedown") return "PGDN";
    if (key === "delete") return "DEL";
    if (key === "insert") return "INS";
    if (key === "arrowup") return "UP";
    if (key === "arrowdown") return "DOWN";
    if (key === "arrowleft") return "LEFT";
    if (key === "arrowright") return "RIGHT";
    if (key === "plus") return "+";
    if (key === "numlock") return "NUMLK";
    if (key === "escape") return "ESC";

    return key.toUpperCase();
}





//Checks needs to be hooked
export function getResetButton(type) {
    const wrap = document.createElement("div");
    wrap.id = "bme-reset-button-wrapper";

    const button = document.createElement("button");
    button.innerText = "Reset Settings";
    wrap.appendChild(button)

    button.addEventListener("click", e => {
        const target = e.target;

        if (target.innerText === "Reset Settings") {
            target.innerText = "Confirm"

            setTimeout(() => {
                if (target.innerText !== "Confirm") return;
                target.innerText = "Reset Settings";
            }, 1500);

            return; //Needs to confirm
        }

        target.innerText = "Reloading...";
        target.classList.add("bme-button-green-background")

        if (type === "bm-overview") localStorage.setItem("BME_OVERVIEW_SETTINGS", JSON.stringify(getDefaultOverviewSettings()));
        if (type === "bm-identifier") localStorage.setItem("BME_IDENTIFIER_SETTINGS", JSON.stringify(getDefaultIdentifierSettings()));
        if (type === "bm-info") localStorage.setItem("BME_BM_INFO_SETTINGS", JSON.stringify(getDefaultBmInfoSettings()));
        if (type === "bm-sidebar") localStorage.setItem("BME_SIDEBAR_SETTINGS", JSON.stringify(getDefaultSidebarSettings()));
        if (type === "bm-bans") localStorage.setItem("BME_BAN_PAGE_SETTINGS", JSON.stringify(getDefaultBanPageSettings()));
        if (type === "bm-keybinds") localStorage.setItem("BME_BAN_PAGE_SETTINGS", JSON.stringify(getDefaultKeybindsSettings()));
        if (type === "bm-evasion") localStorage.setItem("BME_EVASION_CHECKER_SETTINGS", JSON.stringify(getDefaultEvasionCheckerSettings()));
        if (type === "bm-general") localStorage.setItem("BME_GENERAL_SETTINGS", JSON.stringify(getDefaultGeneralSettings()));

        location.reload();
    })

    return wrap;
}


//Needs an overhaul later
export let _playerInsight = null;
const ONE_DAY = 24 * 60 * 60 * 1000;
loadPiPerms()
export async function loadPiPerms() {
    let obj = JSON.parse(localStorage.getItem("BME_PLAYER_INSIGHT_PERMS"))

    const key = await getKey("BME_PLAYER_INSIGHT_API_KEY");
    if (!key) return localStorage.setItem("BME_PLAYER_INSIGHT_PERMS", JSON.stringify({ timestamp: Date.now(), perms: [] }));

    if (!obj || obj.timestamp < Date.now() - ONE_DAY || obj.perms.length === 0) {
        let perms = await talkToBackgroundScript("BME_PLAYER_INSIGHT_PERMS", "N/A")
        if (typeof (perms) === "string") perms = [];

        obj = { timestamp: Date.now(), perms };
        localStorage.setItem("BME_PLAYER_INSIGHT_PERMS", JSON.stringify(obj));
    }
    _playerInsight = obj;
}
function validatePlayerInsightPermission(perm) {
    if (!_playerInsight) return false;

    const perms = _playerInsight.perms;
    if (perms.length === 0) return false;

    if (perm === "HF" && perms.includes("steamFriends")) return true;
    if (perm === "HA" && perms.includes("steamAvatars")) return true;
    if (perm === "PB" && perms.includes("steamBans")) return true;
    if (perm === "SL" && perms.includes("steamLinks")) return true;
    if (perm === "DD" && perms.includes("discordUser")) return true;
    return false;
}

export function checkAndSetupSettingsIfMissing() {
    checkOverviewSettings();
    checkIdentifierSettings();
    checkBmInfoSettings();
    checkSidebarSettings();
    checkBanPageSettings();
    checkKeybindsSettings();
    checkEvasionCheckerSettings();
    checkProxyCheckSettings();
    checkGeneralSettings();
}