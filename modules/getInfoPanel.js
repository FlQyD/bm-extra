export function getInfoPanel(bmSteamData, bmData) {
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
    img.src = chrome.runtime.getURL('assets/img/arrow.png');
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
    const settings = JSON.parse(localStorage.getItem("BME_BM_INFO_SETTINGS"))
    const element = document.createElement("div");

    const title = document.createElement("a");
    title.target = "_blank";
    if (steam?.steamId) title.href = `https://steamcommunity.com/profiles/${steam.steamId}`
    title.classList.add("bme-info-title");
    title.innerText = "Steam Profile:";
    element.appendChild(title);

    const list = document.createElement("dl");
    list.classList.add("css-h1lc4m");
    element.appendChild(list);

    const items = [];
    items.push(...getSteamAccountAgeElements(steam, settings.steamAccountAgeColors))
    items.push(...getVisibilityElements(steam))
    items.push(...getSetupStateElements(steam));
    items.push(...getLimitedAccountElements(steam));
    items.push(...getGameBanCountElements(steam));
    items.push(...getVacBanCountElements(steam));
    items.push(...getDaysSinceElements(steam));

    const isHistoric = steam?.gamesLastChecked ? Date.now() - steam.gamesLastChecked > 7 * ONE_DAY : null;
    items.push(...getSteamGameCountElements(steam, settings.steamGameCountColors, isHistoric));
    items.push(...getSteamRustHoursElements(steam, settings.steamRustHoursColors, isHistoric));
    items.push(...getSteamCombinedHoursElements(steam, settings.steamCombinedHoursColors, isHistoric));
    if (isHistoric) items.push(...getHistoricTimestampElements(steam, settings.gamesLastCheckedColors))
    for (const item of items) list.appendChild(item);


    return element;
}
function getSteamAccountAgeElements(steam, settings) {
    const title = createHtmlElement("dt", "Account Age:");

    const valueString = steam?.accountAge ? getTimeString(steam.accountAge) : "Unknown";

    let currentClass = steam?.accountAge ? getAscendingClassString(settings, [Date.now() - steam.accountAge], settings[3]) : null
    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);
    return [title, value];
}
function getVisibilityElements(steam) {
    const title = createHtmlElement("dt", "Visibility:");

    const valueString = !steam || steam.visibility === null ? "Unknown" : steam.visibility === 1 ? "Private" : "Public";
    const value = createHtmlElement("dd", valueString, []);
    return [title, value];

}
function getSetupStateElements(steam) {
    const title = createHtmlElement("dt", "Setup:");

    const valueString = !steam || steam.isSetup === null ? "Unknown" : steam.isSetup;
    const currentClass = steam && steam.isSetup === false ? "bme-red-text" : "";
    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);
    return [title, value];

}
function getLimitedAccountElements(steam) {
    const title = createHtmlElement("dt", "Limited:");

    const valueString = !steam || steam.limitedAccount === null ? "Unknown" : steam.limitedAccount;
    const currentClass = steam && steam.limitedAccount ? "bme-red-text" : "";
    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);
    return [title, value];
}
function getGameBanCountElements(steam) {
    const title = createHtmlElement("dt", "Game Bans:");

    const valueString = !steam || steam.vacBanCount === null ? "Unknown" : `${steam.vacBanCount}`;

    const currentClass = steam && (steam.vacBanCount > 0 && steam.daysSinceLastBan < 180) ? "bme-red-text" : "";
    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);
    return [title, value];

}
function getVacBanCountElements(steam) {
    const title = createHtmlElement("dt", "VAC Bans:");

    const valueString = !steam || steam.vacBanCount === null ? "Unknown" : `${steam.vacBanCount}`;

    const currentClass = steam && (steam.vacBanCount > 0 && steam.daysSinceLastBan < 180) ? "bme-red-text" : "";
    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);
    return [title, value];

}
function getDaysSinceElements(steam) {
    const title = createHtmlElement("dt", "Last ban:");

    const valueString = !steam || steam.daysSinceLastBan === null ? "Unknown" : `${steam.daysSinceLastBan} days`;

    const banCount = !steam || steam.vacBanCount === null || steam.gameBanCount === null ? 0 : steam.vacBanCount + steam.gameBanCount;
    const currentClass = banCount === 0 ? "" : steam.daysSinceLastBan > 180 ? "" : "bme-red-text";

    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);
    return [title, value];

}
function getSteamGameCountElements(steam, settings, isHistoric) {
    const title = createHtmlElement("dt", "Game Count:");

    const valueString = !steam || steam.gameCount === null ? "Unknown" : steam.gameCount;
    const currentClass = !steam || steam.gameCount === null ? "" : getAscendingClassString(settings, [steam.gameCount], settings[3]);

    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);

    if (isHistoric) {
        title.classList.add("bme-red-background");
        value.classList.add("bme-red-background");
    }
    return [title, value];
}
function getSteamCombinedHoursElements(steam, settings, isHistoric) {
    const title = createHtmlElement("dt", "Steam Hours:");

    const valueString = !steam || steam.steamHours === null ? "Unknown" : steam.gameCount && steam.steamHours === 0 ? "Private" : `${steam.steamHours} hours`;

    const currentClass = !steam || steam.steamHours === null || (steam.gameCount && steam.steamHours === 0) ?
        "" :
        getAscendingClassString(settings, [steam.steamHours], settings[3]);
    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);

    if (isHistoric) {
        title.classList.add("bme-red-background");
        value.classList.add("bme-red-background");
    }
    return [title, value];
}
function getSteamRustHoursElements(steam, settings, isHistoric) {    
    const title = createHtmlElement("dt", "Rust Hours:");
    
    const valueString = !steam || steam.rustHours === null ? "Unknown" : steam.gameCount && steam.rustHours === 0 ? "Private" : `${steam.rustHours} hours`;

    let currentClass = !steam || steam.rustHours === null || (steam.gameCount && steam.rustHours === 0) ?
        "" :
        getAscendingClassString(settings, [steam.rustHours], settings[3]);
    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);

    if (isHistoric) {
        title.classList.add("bme-red-background");
        value.classList.add("bme-red-background");
    }
    
    return [title, value];
}
function getHistoricTimestampElements(steam, settings) {
    const title = createHtmlElement("dt", "Last Seen:");
    title.classList.add("bme-red-background");
    
    const valueString = getTimeString(steam.gamesLastChecked)+" ago";

    const since = Date.now() - steam.gamesLastChecked;    
    let currentClass = getAscendingClassString(settings, [since], settings[3]);

    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);
    value.classList.add("bme-red-background");
    return [title, value];
}



function getBmInfoPanel(bm) {
    const settings = JSON.parse(localStorage.getItem("BME_BM_INFO_SETTINGS"))
    const element = document.createElement("div");

    const title = document.createElement("p");
    title.classList.add("bme-info-title");
    title.innerText = "BattleMetrics:";
    element.appendChild(title);

    const list = document.createElement("div");
    list.classList.add("css-h1lc4m");
    element.appendChild(list)

    const items = [];
    items.push(...getAccountAgeElements(bm, settings.bmAccountAgeColors))
    items.push(...getBmAccountStatus(bm))
    items.push(...getKillCountElements(bm, settings.killColors, settings.killBarrier));
    items.push(...getDeathElements(bm, settings.deathColors, settings.deathBarrier));
    items.push(...getKdElements(bm, settings.kdColors, settings.kdBarrier));
    items.push(...getReportElements(bm, settings.allReportsColor, settings.allReportsBarrier))
    items.push(...getCheatReportElements(bm, settings.cheatReportsColors, settings.cheatReportsBarrier))
    items.push(...getServerCountElements(bm, settings.serverCountColors))
    items.push(...getBmRustHoursElements(bm, settings.bmRustHoursColors))
    items.push(...getAimTrainingElements(bm, settings.aimTrainColors));
    for (const item of items) list.appendChild(item);

    return element;
}
function getAccountAgeElements(bm, settings) {
    const title = createHtmlElement("dt", "Account Age:");

    const valueString = bm.accountAge ? getTimeString(bm.accountAge) : "Unknown";

    let currentClass = bm.accountAge ? getAscendingClassString(settings, [Date.now() - bm.accountAge], settings[3]) : [];
    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);
    return [title, value];
}
function getBmAccountStatus(bm) {
    const title = createHtmlElement("dt", "Private:");

    const value = createHtmlElement("dd", `${typeof (bm.private) === "boolean" ? bm.private : "Unknown"}`, bm.private ? ["bme-red-text"] : []);
    return [title, value];
}
function getServerCountElements(bm, settings) {
    const title = createHtmlElement("dt", "Server Count:");

    let currentClass = getAscendingClassString(settings, [bm.numberOfServer], settings[3])
    const value = createHtmlElement("dd", `${bm.numberOfServer}`, currentClass ? [currentClass] : []);
    return [title, value];
}
function getReportElements(bm, settings, recent) {
    const title = createHtmlElement("dt", "Reports:");

    const reportCount = bm.allReports.length
    let valueString = "" + reportCount;

    let recentReportCount = -1;
    if (recent !== -1) {
        const barrier = Date.now() - recent;
        recentReportCount = bm.allReports.filter(report => report > barrier).length;
        const timeString = getBmInfoTimeString(recent);
        valueString += ` (${recentReportCount} in ${timeString})`;
    }
    let currentClass = getDescendingClassString(settings, [reportCount, recentReportCount], settings[3]);
    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);
    return [title, value];
}
function getCheatReportElements(bm, settings, recent) {
    const title = createHtmlElement("dt", "Cheat Reports:");

    const reportCount = bm.cheatReports.length
    let valueString = "" + reportCount;

    let recentReportCount = -1;
    if (recent !== -1) {
        const barrier = Date.now() - recent;
        recentReportCount = bm.cheatReports.filter(report => report > barrier).length;
        const timeString = getBmInfoTimeString(recent);
        valueString += ` (${recentReportCount} in ${timeString})`;
    }
    let currentClass = getDescendingClassString(settings, [reportCount, recentReportCount], settings[3])
    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);
    return [title, value];
}
function getBmRustHoursElements(bm, settings) {
    const title = createHtmlElement("dt", "Rust Hours:");

    let currentClass = getAscendingClassString(settings, [bm.combinedPlaytime], settings[3])
    const value = createHtmlElement("dd", `${bm.combinedPlaytime} hours`, currentClass ? [currentClass] : []);
    return [title, value];
}
function getAimTrainingElements(bm, settings) {
    const title = createHtmlElement("dt", "Aim Training:");

    let currentClass = getAscendingClassString(settings, [bm.aimTrainPlaytime], settings[3])
    const value = createHtmlElement("dd", `${bm.aimTrainPlaytime} hours`, currentClass ? [currentClass] : []);
    return [title, value];
}
function getKillCountElements(bm, settings, recent) {
    const title = createHtmlElement("dt", "Kills:");

    const killCount = bm.kills.length
    let killValueString = "" + killCount;

    let recentKillCount = -1;
    if (recent !== -1) {
        const barrier = Date.now() - recent;
        recentKillCount = bm.kills.filter(kill => kill > barrier).length;
        const timeString = getBmInfoTimeString(recent);
        killValueString += ` (${recentKillCount} in ${timeString})`;
    }
    let currentClass = getDescendingClassString(settings, [killCount, recentKillCount], settings[3])
    const value = createHtmlElement("dd", killValueString, currentClass ? [currentClass] : []);
    return [title, value];
}
function getDeathElements(bm, settings, recent) {
    const title = createHtmlElement("dt", "Deaths:");

    const deathCount = bm.deaths.length
    let deathValueString = "" + deathCount;
    let recentDeathCount = -1;
    if (recent !== -1) {
        const barrier = Date.now() - recent;
        recentDeathCount = bm.deaths.filter(death => death > barrier).length;
        const timeString = getBmInfoTimeString(recent);
        deathValueString += ` (${recentDeathCount} in ${timeString})`;
    }
    let currentClass = getDescendingClassString(settings, [deathCount, recentDeathCount], settings[3])
    const value = createHtmlElement("dd", deathValueString, currentClass ? [currentClass] : []);
    return [title, value];
}
function getKdElements(bm, settings, recent) {
    const title = createHtmlElement("dt", "K/D:");

    const kd = bm.kills.length / Math.max(bm.deaths.length, 1);
    let kdValueString = kd.toFixed(2);

    let recentKd = -1;
    if (recent !== -1) {
        const barrier = Date.now() - recent;
        const recentKills = bm.kills.filter(kill => kill > barrier);
        const recentDeaths = bm.deaths.filter(death => death > barrier);
        const timeString = getBmInfoTimeString(recent);

        recentKd = recentKills.length / Math.max(recentDeaths.length, 1);
        kdValueString += ` (${recentKd.toFixed(2)} in ${timeString})`;
    }

    let currentClass = getDescendingClassString(settings, [kd, recentKd], settings[3])
    const value = createHtmlElement("dd", kdValueString, currentClass ? [currentClass] : []);
    return [title, value]
}

function getDescendingClassString(settings, values, invertColors = false) {
    const value = Math.max(...values);
    if (settings[0] !== -1 && value > settings[0]) return invertColors ? "bme-green-text" : "bme-red-text";
    if (settings[1] !== -1 && value > settings[1]) return "bme-yellow-text";
    if (settings[2] !== -1 && value > settings[2]) return invertColors ? "bme-red-text" : "bme-green-text";
    return "";
}
function getAscendingClassString(settings, values, invertColors = false) {
    const value = Math.max(...values);
    if (settings[0] !== -1 && value < settings[0]) return invertColors ? "bme-green-text" : "bme-red-text";
    if (settings[1] !== -1 && value < settings[1]) return "bme-yellow-text";
    if (settings[2] !== -1 && value < settings[2]) return invertColors ? "bme-red-text" : "bme-green-text";
    return "";
}

function createHtmlElement(node, innerText, classList = []) {
    const element = document.createElement(node);
    if (classList.length > 0) element.classList.add(...classList)
    element.innerText = innerText;
    return element;
}



const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;
const ONE_MONTH = 30 * ONE_DAY;
const ONE_YEAR = 12 * ONE_MONTH;
export function getTimeString(timestamp) {
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
function getBmInfoTimeString(timestamp) {
    if (timestamp > (3 * ONE_DAY)) return `${Math.floor(timestamp / ONE_DAY)} days`;
    if (timestamp > ONE_HOUR) return `${Math.floor(timestamp / ONE_HOUR)} hours`;
    if (timestamp > ONE_MINUTE) return `${Math.floor(timestamp / ONE_MINUTE)} minutes`;
    if (timestamp > ONE_SECOND) return `${Math.floor(timestamp / ONE_SECOND)} seconds`
    return NaN;
}