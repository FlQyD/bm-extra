import { getKey } from "./settings/apiKeys/page.js";

export const rustApiKeyPermissionBits = {
    historicFriends: 54,
    historicAvatars: 56,
    publicBans: 57,
};

export const cssAnchors = {
    identifierTable: "css-1clz4cn",
    identifierContentContainer: "css-v4ohi1",
    identifierContent: "css-1n6n1f5",
    identifierArrowIcon: "css-1c83ua",
    identifierTableTitleContainer: "css-y5msm0",
    identifierTableType: "css-1d6fayl",
    identifierTableTypeButton: "css-dz605m",
    identifierTableTime: "css-1d6fayl",
}


const _getElement = {};
/**
 * Returns a Promise that contains either the element or null if it cannot be found on the page.
 * @param {String} identifier 
 * @param {Boolean} isClass 
 * @returns {Promise<HTMLElement | null>}
 */
export function getElementWhenAppears(identifier, isClass) {
    identifier = isClass ? `.${identifier}` : `#${identifier}`;
    if (!_getElement[identifier] || Date.now() > (_getElement[identifier].timestamp + 50)) {
        _getElement[identifier] = {
            timestamp: Date.now(),
            element: findElementWhenAppears(identifier)
        }
    }

    return _getElement[identifier].element;
}
const MAX_ATTEMPTS = 100;
const BASE_DELAY_MS = 25;
const INCREMENTING_DELAY_MS = 5;
async function findElementWhenAppears(selector) {
    let element = document.querySelector(selector);
    let count = 0;

    while (count < MAX_ATTEMPTS) {
        element = document.querySelector(selector);
        if (element) return element;

        const delay = BASE_DELAY_MS + (count * INCREMENTING_DELAY_MS)
        await new Promise(r => setTimeout(r, delay));
        count++;
    }
    return null;
}

export async function getIdentifiers() {
    try {
        const element = await getElementWhenAppears(cssAnchors.identifierTable, true);
        return Array.from(element?.lastChild?.children);
    } catch (error) {
        return [];
    }
}

const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;
const ONE_MONTH = 30 * ONE_DAY;
const ONE_YEAR = 12 * ONE_MONTH;
export function getTimeSpan(timestamp, isDuration = false, daysOnly = false) {
    let since = null;

    if (isDuration) {
        since = timestamp;
    } else {
        const now = Date.now();
        since = now - timestamp;
    }

    let str = "";

    if (daysOnly) {
        let days = Number((since / ONE_DAY).toFixed(1));
        if (days > 100) days = Math.floor(days);

        str = plural(days, "day")
    }


    if (!str && since > ONE_YEAR) str = plural((since / ONE_YEAR).toFixed(1), "year");
    if (!str && since > ONE_MONTH) str = plural((since / ONE_MONTH).toFixed(1), "month");
    if (!str && since > ONE_DAY) str = plural(Math.floor(since / ONE_DAY), "day");
    if (!str && since > ONE_HOUR) str = plural(Math.floor(since / ONE_HOUR), "hour");
    if (!str && since > ONE_MINUTE) str = plural(Math.floor(since / ONE_MINUTE), "minute");
    if (!str && since > ONE_SECOND) str = plural(Math.floor(since / ONE_SECOND), "second");
    if (!str) str = `${since} ms`;

    return `<span class="bme-time" data-raw="${timestamp}" data-duration="${isDuration}">${str}</span>`;
}
export function getBmInfoTimeString(timestamp) {
    if (timestamp > (3 * ONE_DAY)) return `${Math.floor(timestamp / ONE_DAY)} days`;
    if (timestamp > ONE_HOUR) return plural(Math.floor(timestamp / ONE_HOUR), "hour");
    if (timestamp > ONE_MINUTE) return plural(Math.floor(timestamp / ONE_MINUTE), "minute");
    if (timestamp > ONE_SECOND) return plural(Math.floor(timestamp / ONE_SECOND), "second");
    return `${timestamp} ms`;
}
function plural(value, unit) {
    if (Math.floor(value) <= 1) return `${value} ${unit}`;
    return `${value} ${unit}s`;
}

export async function getCurrentFriends(steamId) {
    return await talkToBackgroundScript("BME_CURRENT_FRIENDS", steamId);
}
export async function getHistoricFriends(steamId) {
    return await talkToBackgroundScript("BME_HISTORIC_FRIENDS", steamId);
}

export function getStreamerModeName(steamId) {
    try {
        const names = JSON.parse(localStorage.getItem("BME_SM_NAMES"))?.names;
        if (!names?.length) return null;

        //FP code
        let v = BigInt(steamId) % 2147483647n;
        v = v % BigInt(names.length);

        return names[Number(v)];
    } catch (error) {
        console.error(error);
        return null;
    }
}

export function shouldAbort(bmId, elementId, pageId) {
    const urlPaths = new URL(location.href).pathname.split("/").filter(Boolean);

    const urlId = urlPaths[2] || null;
    if (urlId !== bmId) return true; //Page changed

    if (elementId) {
        const elementCheck = document.getElementById(elementId);
        if (elementCheck) return true; //Already exist
    }

    if (pageId === "overview") {
        if (!urlPaths.includes("players")) return true;
        if (urlPaths.length !== 3) return true;
    }

    return false; //Good to go!
}

export async function getLastServer(bmProfile, onlyMyServer) {
    const myServers = await getMyServers(true);
    if (!myServers) return null;

    let servers = bmProfile.included
        .filter(item => item.type === "server")
        .map(server => {
            return {
                name: server.attributes?.name,
                id: server.id,
                orgId: server?.relationships?.organization?.data?.id,
                lastPlayed: new Date(server.meta.lastSeen).getTime(),
                online: server.meta.online,
            }
        })
        .sort((a, b) => b.lastPlayed - a.lastPlayed);


    if (onlyMyServer) {
        servers = servers.filter(item => myServers.includes(item.id));
        const lastServer = servers[0];
        if (!lastServer) return null;
        return lastServer;
    }

    const lastServer = servers[0];
    if (!lastServer) return null;
    return lastServer
}
export async function getMyServers(onlyIds) {
    const token = await getAuthToken();

    let myServers = JSON.parse(localStorage.getItem("BME_MY_SERVER_CACHE"));
    if (myServers && myServers.timestamp > Date.now() - 24 * 60 * 60 * 1000) {
        if (onlyIds) return myServers.servers.map(server => server.id);
        else return myServers.servers;
    }


    const data = await requestMyServers('https://api.battlemetrics.com/servers?filter[rcon]=true&page[size]=100', token)
    if (!data) {
        console.error(`Failed to request your servers | Returned type: ${typeof (data)}`);
        return null;
    }

    myServers = {
        timestamp: Date.now(),
        servers: data
    }

    localStorage.setItem("BME_MY_SERVER_CACHE", JSON.stringify(myServers))
    if (onlyIds) return myServers.servers.map(server => server.id);
    else return myServers.servers;
}
async function requestMyServers(url, token, count = 0) {
    if (count > 2) return null;
    try {
        const resp = await fetch(`${url}&access_token=${token}`);
        const data = await resp.json();

        const servers = data.data.map(server => {
            return {
                id: server.id,
                name: server?.attributes?.name,
                orgId: server?.relationships?.organization?.data?.id
            }
        })

        if (data.links.next) {
            await new Promise(r => { setTimeout(r, 1000) });
            const nextPage = await requestMyServers(data.links.next, token);
            if (!nextPage) return servers;

            servers.push(...nextPage);
        }

        return servers;
    } catch (error) {
        console.error(`Failed to request your servers. | ${error.message}`);
        await new Promise(r => { setTimeout(r, 1000) });
        return await requestMyServers(url, token, count + 1);
    }
}

export async function getAuthToken() {
    const key = await getKey("BME_BATTLEMETRICS_API_KEY");
    if (!key) console.error(`BME-EXTRA: Missing battlemetrics API key.`)

    return key;
}

export function setNativeValue(select, value, highlight) {
    const originalValue = select.value;

    select.value = value;
    if (select.value !== value) {
        select.value = originalValue;
        if (highlight) highlightElement(select, "red");
        return;
    }
    if (highlight) highlightElement(select, "green");

    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
}
export function highlightElement(element, color) {
    element.classList.add(`bme-${color}-change`);
    setTimeout(() => { element.classList.remove(`bme-${color}-change`); }, 400);
}

export function getSteamIdObject(array) {
    const steamId = array.find(item => {
        if (item.type !== "identifier") return false;
        if (item.attributes?.type !== "steamID") return false;
        return true;
    })
    return steamId;
}

export function getIdentifierType(identifier) {
    const innerText = identifier?.children[1]?.innerText;
    const type = Boolean(innerText) ? innerText.trim() : null;
    if (type === null) return { type, id: null };

    const typeElements = identifier?.childNodes[1].children;
    const offset = type === "Name" ? 1 : 2;
    const searchLink = typeElements[typeElements.length - offset]?.href;
    const id = searchLink ? searchLink.split("=")[1] : null;
    return { type, id }
}

export function talkToBackgroundScript(type, subject, rejectTime = 10000, token) {
    const requestId = Math.floor(Math.random() * 1000000);
    type = `${type}_${requestId}`;

    return new Promise((resolve, reject) => {
        function handler(response) {
            if (response?.type !== `${type}_RESOLVED`) return;

            clearTimeout(timer);
            browser.runtime.onMessage.removeListener(handler);

            resolve(response.value);
        }

        const timer = setTimeout(() => {
            browser.runtime.onMessage.removeListener(handler);
            resolve("TIMEOUT");
        }, rejectTime);

        browser.runtime.onMessage.addListener(handler);
        browser.runtime.sendMessage({ type, subject, token });
    });
}

export function removeSidebars() {
    const elementsToRemove = document.querySelectorAll(".bme-sidebar");
    elementsToRemove.forEach(item => item.remove())
}

export function makeDropDownMenu(header, body, ms, prefix = "", isClosed) {
    if (isClosed) {
        body.style.setProperty(`--${prefix}height`, "0px")
        body.style.setProperty(`--${prefix}overflow`, "hidden")
    }

    body.style.setProperty(`--${prefix}transition`, `${ms}ms`)

    let timeout = null;
    header.addEventListener("click", e => {
        if (timeout) clearTimeout(timeout);
        const height = body.scrollHeight;
        if (header.classList.contains("bme-open")) { //Close
            header.classList.remove("bme-open");

            body.style.setProperty(`--${prefix}height`, `${height}px`)
            setTimeout(() => {
                body.style.setProperty(`--${prefix}height`, "0px")
                body.style.setProperty(`--${prefix}overflow`, "hidden")
            }, 5);
        } else { //Open
            header.classList.add("bme-open");

            body.style.setProperty(`--${prefix}height`, `${height}px`)
            timeout = setTimeout(() => {
                body.style.setProperty(`--${prefix}height`, `fit-content`)
                body.style.setProperty(`--${prefix}overflow`, "visible")
            }, ms);
        }
    })
}


const timeZoneRegions = {
    //Europe
    "Atlantic/Azores": "PT", "Atlantic/Canary": "ES", "Atlantic/Cape_Verde": "CV",
    "Atlantic/Madeira": "PT", "Atlantic/Reykjavik": "IS", "Arctic/Longyearbyen": "NO",
    "Europe/Amsterdam": "NL", "Europe/Andorra": "AD", "Europe/Busingen": "DE",
    "Europe/Chisinau": "MD", "Europe/Monaco": "MC", "Europe/Podgorica": "ME",
    "Europe/Athens": "GR", "Europe/Belgrade": "RS", "Europe/Berlin": "DE",
    "Europe/Bratislava": "SK", "Europe/Brussels": "BE", "Europe/Bucharest": "RO",
    "Europe/Budapest": "HU", "Europe/Copenhagen": "DK", "Europe/Dublin": "IE",
    "Europe/Helsinki": "FI", "Europe/Istanbul": "TR", "Europe/Kiev": "UA",
    "Europe/Kyiv": "UA", "Europe/Lisbon": "PT", "Europe/Ljubljana": "SI",
    "Europe/London": "GB", "Europe/Luxembourg": "LU", "Europe/Madrid": "ES",
    "Europe/Malta": "MT", "Europe/Minsk": "BY", "Europe/Moscow": "RU",
    "Europe/Oslo": "NO", "Europe/Paris": "FR", "Europe/Prague": "CZ",
    "Europe/Riga": "LV", "Europe/Rome": "IT", "Europe/Sarajevo": "BA",
    "Europe/Skopje": "MK", "Europe/Sofia": "BG", "Europe/Stockholm": "SE",
    "Europe/Tallinn": "EE", "Europe/Tirane": "AL", "Europe/Vienna": "AT",
    "Europe/Vilnius": "LT", "Europe/Warsaw": "PL", "Europe/Zagreb": "HR",
    "Europe/Zurich": "CH",

    //Americas
    "America/Adak": "US", "America/Anchorage": "US", "America/Araguaina": "BR",
    "America/Argentina/Buenos_Aires": "AR", "America/Argentina/La_Rioja": "AR",
    "America/Argentina/Rio_Gallegos": "AR", "America/Argentina/Salta": "AR",
    "America/Argentina/San_Juan": "AR", "America/Argentina/San_Luis": "AR",
    "America/Argentina/Tucuman": "AR", "America/Argentina/Ushuaia": "AR",
    "America/Asuncion": "PY", "America/Bahia": "BR", "America/Bahia_Banderas": "MX",
    "America/Belem": "BR", "America/Belize": "BZ", "America/Blanc-Sablon": "CA",
    "America/Boa_Vista": "BR", "America/Bogota": "CO", "America/Boise": "US",
    "America/Cambridge_Bay": "CA", "America/Campo_Grande": "BR", "America/Cancun": "MX",
    "America/Caracas": "VE", "America/Catamarca": "AR", "America/Cayenne": "GF",
    "America/Chicago": "US", "America/Chihuahua": "MX", "America/Ciudad_Juarez": "MX",
    "America/Coral_Harbour": "CA", "America/Cordoba": "AR", "America/Costa_Rica": "CR",
    "America/Creston": "CA", "America/Cuiaba": "BR", "America/Danmarkshavn": "GL",
    "America/Dawson": "CA", "America/Dawson_Creek": "CA", "America/Denver": "US",
    "America/Detroit": "US", "America/Edmonton": "CA", "America/Eirunepe": "BR",
    "America/El_Salvador": "SV", "America/Fort_Nelson": "CA", "America/Fortaleza": "BR",
    "America/Glace_Bay": "CA", "America/Goose_Bay": "CA", "America/Guatemala": "GT",
    "America/Guayaquil": "EC", "America/Guyana": "GY", "America/Halifax": "CA",
    "America/Havana": "CU", "America/Hermosillo": "MX", "America/Indiana/Knox": "US",
    "America/Indiana/Marengo": "US", "America/Indiana/Petersburg": "US",
    "America/Indiana/Tell_City": "US", "America/Indiana/Vevay": "US",
    "America/Indiana/Vincennes": "US", "America/Indiana/Winamac": "US",
    "America/Indianapolis": "US", "America/Inuvik": "CA", "America/Iqaluit": "CA",
    "America/Jujuy": "AR", "America/Juneau": "US", "America/Kentucky/Monticello": "US",
    "America/La_Paz": "BO", "America/Lima": "PE", "America/Los_Angeles": "US",
    "America/Louisville": "US", "America/Maceio": "BR", "America/Managua": "NI",
    "America/Manaus": "BR", "America/Matamoros": "MX", "America/Mazatlan": "MX",
    "America/Mendoza": "AR", "America/Menominee": "US", "America/Merida": "MX",
    "America/Metlakatla": "US", "America/Mexico_City": "MX", "America/Moncton": "CA",
    "America/Monterrey": "MX", "America/Montevideo": "UY", "America/New_York": "US",
    "America/Nome": "US", "America/Noronha": "BR", "America/North_Dakota/Beulah": "US",
    "America/North_Dakota/Center": "US", "America/North_Dakota/New_Salem": "US",
    "America/Nuuk": "GL", "America/Ojinaga": "MX", "America/Panama": "PA",
    "America/Paramaribo": "SR", "America/Phoenix": "US", "America/Port-au-Prince": "HT",
    "America/Porto_Velho": "BR", "America/Puerto_Rico": "PR", "America/Punta_Arenas": "CL",
    "America/Rankin_Inlet": "CA", "America/Recife": "BR", "America/Regina": "CA",
    "America/Resolute": "CA", "America/Rio_Branco": "BR", "America/Santarem": "BR",
    "America/Santiago": "CL", "America/Santo_Domingo": "DO", "America/Sao_Paulo": "BR",
    "America/Scoresbysund": "GL", "America/Sitka": "US", "America/St_Johns": "CA",
    "America/Swift_Current": "CA", "America/Tegucigalpa": "HN", "America/Thule": "GL",
    "America/Tijuana": "MX", "America/Toronto": "CA", "America/Vancouver": "CA",
    "America/Whitehorse": "CA", "America/Winnipeg": "CA", "America/Yakutat": "US",

    //Asia
    "Asia/Aden": "YE", "Asia/Almaty": "KZ", "Asia/Amman": "JO",
    "Asia/Aqtau": "KZ", "Asia/Aqtobe": "KZ", "Asia/Ashgabat": "TM",
    "Asia/Atyrau": "KZ", "Asia/Baghdad": "IQ", "Asia/Bahrain": "BH",
    "Asia/Baku": "AZ", "Asia/Bangkok": "TH", "Asia/Beirut": "LB",
    "Asia/Bishkek": "KG", "Asia/Brunei": "BN", "Asia/Calcutta": "IN",
    "Asia/Choibalsan": "MN", "Asia/Colombo": "LK", "Asia/Damascus": "SY",
    "Asia/Dhaka": "BD", "Asia/Dili": "TL", "Asia/Dubai": "AE",
    "Asia/Dushanbe": "TJ", "Asia/Famagusta": "CY", "Asia/Gaza": "PS",
    "Asia/Hebron": "PS", "Asia/Ho_Chi_Minh": "VN", "Asia/Hong_Kong": "HK",
    "Asia/Hovd": "MN", "Asia/Jakarta": "ID", "Asia/Jayapura": "ID",
    "Asia/Jerusalem": "IL", "Asia/Kabul": "AF", "Asia/Karachi": "PK",
    "Asia/Kathmandu": "NP", "Asia/Kolkata": "IN", "Asia/Kuala_Lumpur": "MY",
    "Asia/Kuching": "MY", "Asia/Kuwait": "KW", "Asia/Macau": "MO",
    "Asia/Makassar": "ID", "Asia/Manila": "PH", "Asia/Muscat": "OM",
    "Asia/Nicosia": "CY", "Asia/Oral": "KZ", "Asia/Phnom_Penh": "KH",
    "Asia/Pontianak": "ID", "Asia/Pyongyang": "KP", "Asia/Qatar": "QA",
    "Asia/Qostanay": "KZ", "Asia/Qyzylorda": "KZ", "Asia/Riyadh": "SA",
    "Asia/Samarkand": "UZ", "Asia/Seoul": "KR", "Asia/Shanghai": "CN",
    "Asia/Singapore": "SG", "Asia/Taipei": "TW", "Asia/Tashkent": "UZ",
    "Asia/Tbilisi": "GE", "Asia/Tehran": "IR", "Asia/Thimphu": "BT",
    "Asia/Tokyo": "JP", "Asia/Ulaanbaatar": "MN", "Asia/Urumqi": "CN",
    "Asia/Vientiane": "LA", "Asia/Yangon": "MM", "Asia/Yerevan": "AM",

    //Russia
    "Asia/Anadyr": "RU", "Asia/Barnaul": "RU", "Asia/Chita": "RU",
    "Asia/Irkutsk": "RU", "Asia/Kamchatka": "RU", "Asia/Khandyga": "RU",
    "Asia/Krasnoyarsk": "RU", "Asia/Magadan": "RU", "Asia/Novokuznetsk": "RU",
    "Asia/Novosibirsk": "RU", "Asia/Omsk": "RU", "Asia/Sakhalin": "RU",
    "Asia/Srednekolymsk": "RU", "Asia/Tomsk": "RU", "Asia/Ust-Nera": "RU",
    "Asia/Vladivostok": "RU", "Asia/Yakutsk": "RU", "Asia/Yekaterinburg": "RU",
    "Europe/Astrakhan": "RU", "Europe/Kaliningrad": "RU", "Europe/Kirov": "RU",
    "Europe/Samara": "RU", "Europe/Saratov": "RU", "Europe/Ulyanovsk": "RU",
    "Europe/Volgograd": "RU",

    //Africa
    "Africa/Abidjan": "CI", "Africa/Accra": "GH", "Africa/Addis_Ababa": "ET",
    "Africa/Algiers": "DZ", "Africa/Asmera": "ER", "Africa/Bamako": "ML",
    "Africa/Bangui": "CF", "Africa/Banjul": "GM", "Africa/Bissau": "GW",
    "Africa/Blantyre": "MW", "Africa/Brazzaville": "CG", "Africa/Bujumbura": "BI",
    "Africa/Cairo": "EG", "Africa/Casablanca": "MA", "Africa/Ceuta": "ES",
    "Africa/Conakry": "GN", "Africa/Dakar": "SN", "Africa/Dar_es_Salaam": "TZ",
    "Africa/Djibouti": "DJ", "Africa/Douala": "CM", "Africa/Freetown": "SL",
    "Africa/Gaborone": "BW", "Africa/Harare": "ZW", "Africa/Johannesburg": "ZA",
    "Africa/Juba": "SS", "Africa/Kampala": "UG", "Africa/Khartoum": "SD",
    "Africa/Kigali": "RW", "Africa/Kinshasa": "CD", "Africa/Lagos": "NG",
    "Africa/Libreville": "GA", "Africa/Lome": "TG", "Africa/Luanda": "AO",
    "Africa/Lubumbashi": "CD", "Africa/Lusaka": "ZM", "Africa/Malabo": "GQ",
    "Africa/Maputo": "MZ", "Africa/Maseru": "LS", "Africa/Mbabane": "SZ",
    "Africa/Mogadishu": "SO", "Africa/Monrovia": "LR", "Africa/Nairobi": "KE",
    "Africa/Ndjamena": "TD", "Africa/Niamey": "NE", "Africa/Nouakchott": "MR",
    "Africa/Ouagadougou": "BF", "Africa/Porto-Novo": "BJ", "Africa/Sao_Tome": "ST",
    "Africa/Tripoli": "LY", "Africa/Tunis": "TN", "Africa/Windhoek": "NA",

    //Older tzdata spellings, still reported by some browsers
    "America/Buenos_Aires": "AR", "America/Godthab": "GL", "Asia/Katmandu": "NP",
    "Asia/Rangoon": "MM", "Asia/Saigon": "VN",

    //Oceania
    "Australia/Adelaide": "AU", "Australia/Brisbane": "AU", "Australia/Broken_Hill": "AU",
    "Australia/Darwin": "AU", "Australia/Eucla": "AU", "Australia/Hobart": "AU",
    "Australia/Lindeman": "AU", "Australia/Lord_Howe": "AU", "Australia/Melbourne": "AU",
    "Australia/Perth": "AU", "Australia/Sydney": "AU", "Pacific/Auckland": "NZ",
    "Pacific/Fiji": "FJ", "Pacific/Guam": "GU", "Pacific/Honolulu": "US",
    "Pacific/Noumea": "NC", "Pacific/Port_Moresby": "PG", "Pacific/Tongatapu": "TO",
}

let _locale = null;
export function getLocale() {
    if (_locale) return _locale;

    const settings = JSON.parse(localStorage.getItem("BME_GENERAL_SETTINGS"));
    const locale = settings?.locale;

    _locale = !locale || locale === "auto" ? getAutoLocale() : locale;
    return _locale;
}
export function getAutoLocale() {
    const resolved = Intl.DateTimeFormat().resolvedOptions();

    const region = timeZoneRegions[resolved.timeZone];
    if (!region) return resolved.locale;

    return getRegionLocale(region);
}
export function getLocaleTags() {
    const tags = new Set();
    for (const region of Object.values(timeZoneRegions)) tags.add(getRegionLocale(region));

    return [...tags];
}
function getRegionLocale(region) {
    const locale = new Intl.Locale("und", { region }).maximize();
    return `${locale.language}-${locale.region}`;
}

export function getHiddenTableRow() {
    const element = document.createElement("tr");
    element.classList.add("bme-hidden")
    element.innerHTML = `<td></td><td></td><td></td>`;

    return element;
}



function normalizePath(path) {
    if (!path) return "/";

    let cleanPath = path.split("?")[0].split("#")[0];
    if (cleanPath.length > 1 && cleanPath.endsWith("/")) {
        cleanPath = cleanPath.slice(0, -1);
    }

    return cleanPath.toLowerCase();
}





// Temporary solution, based on BattleMetric's content scripts.
/////////////////////////////////////////////////////////////////////////////
let _bootstrap = null;
export function getBootstrap() {
    return _bootstrap;
}
/*
Disabled as key appears to be swapped, and it would not be a good solution to swap the key with every change on their side.

loadBootstrap();
async function loadBootstrap(count = 0) {
    if (count > 4) return console.error(`BM-EXTRA: Failed to load bootstrap!`)
    try {
        const bootstrapElement = document.getElementById("storeBootstrap");
        if (!bootstrapElement) throw new Error("Bootstrap element wasn't found.");
        
        const encryptedData = (bootstrapElement.textContent || bootstrapElement.innerHTML).trim();
        if (!encryptedData) throw new Error("Bootstap element wasn't found.");

        const instanceElement = document.getElementById("instanceId");
        if (!instanceElement) throw new Error("instanceElement wasn't found.");

        const instanceId = instanceElement?.innerText.trim() || "";
        const pathname = window.location.pathname;

        const bootstrap = await decryptBootstrap(encryptedData, instanceId, pathname);
        _bootstrap = bootstrap;
        console.log(`BM-EXTRA: bootstrap loaded!`);
    } catch (error) {
        console.error(`BM-EXTRA: Failed to load bootstrap: ${error.message}`);
        await new Promise(r => { setTimeout(() => { r() }, 250) });
        loadBootstrap(count + 1);
    }

    //support functions
    async function getCrypto() {
        if (window.crypto?.subtle) return window.crypto;
        if (globalThis.crypto?.subtle) return globalThis.crypto;

        const cryptoModule = await import("crypto");
        return cryptoModule.webcrypto || cryptoModule.default?.webcrypto || cryptoModule;
    }

    async function createDecryptKey(subtle, instanceId, pathname) {
        const route = normalizePath(pathname);
        const keyString = `${instanceId}_${route}_1ef3fd088443fc1f1909e6994e6c68ae7760b5f6`;

        const hash = await subtle.digest("SHA-256", new TextEncoder().encode(keyString));
        return subtle.importKey("raw", hash, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    }

    function decodeBase64(data) {
        const binary = atob(data);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++)
            bytes[i] = binary.charCodeAt(i);

        return bytes;
    }

    async function decryptBootstrap(encryptedData, instanceId, pathname) {
        const crypto = await getCrypto();
        const bytes = decodeBase64(encryptedData);
        if (bytes.length < 12) throw new Error("Payload is too short");

        const inVect = bytes.slice(0, 12);
        const payload = bytes.slice(12);
        const key = await createDecryptKey(crypto.subtle, instanceId, pathname);
        const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: inVect }, key, payload);

        const stream = new Response(new Uint8Array(decrypted)).body.pipeThrough(new DecompressionStream("gzip"));
        const decompressed = await new Response(stream).arrayBuffer();;
        return JSON.parse(new TextDecoder().decode(decompressed));
    }
}
*/
/////////////////////////////////////////////////////////////////////////////