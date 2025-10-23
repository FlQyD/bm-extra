const ONE_DAY = 24*60*60*1000;
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

    const menuPoints = ["Settings", "Identifier", "BM Information", "Multi Org"];
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
    if (index === 0) return getOverViewSettings();
    if (index === 1) return getIdentifierSettings();
    if (index === 2) return getBmInfoSettings();
    if (index === 3) return getMultiOrgSettings();
}

function getOverViewSettings() {
    const settings = JSON.parse(localStorage.getItem("BME_MAIN_SETTINGS"))
    console.log(settings);

    const element = document.createElement("div");
    const title = document.createElement("h1");
    title.innerText = "Main Settings";
    element.appendChild(title);

    const showAvatarOverviewRow = getMainSettingsInputRowElement(settings, "showAvatarOverview", "Show Avatar on Overview Page", "Shows the players avatar when it's available next to his name.");
    element.appendChild(showAvatarOverviewRow);

    const showAvatarIdentifierRow = getMainSettingsInputRowElement(settings, "showAvatarIdentifier", "Show Avatar on Identifier Page", "Shows the players avatar when it's available next to his name.");
    element.appendChild(showAvatarIdentifierRow);

    const showInfoPanel = getMainSettingsInputRowElement(settings, "showInfoPanel", "Show BM Information", "Shows detailed information that is stored by battlemetrics and usually not visible by default.");
    element.appendChild(showInfoPanel);

    const removeSteamInfo = getMainSettingsInputRowElement(settings, "removeSteamInfo", "Remove Steam Information", "Remove the default Steam information panel from the battlemetrics RCON profile when it appears.");
    element.appendChild(removeSteamInfo);

    const showServer = getMainSettingsInputRowElement(settings, "showServer", "Show server", "Show the either the current or the last server the user has played on, as well as displaying connection details.");
    element.appendChild(showServer);
    
    const advancedBans = getMainSettingsInputRowElement(settings, "advancedBans", "Advanced Bans", "Update ban reasons for a more readable format.");
    element.appendChild(advancedBans);

    const closeAdminLog = getMainSettingsInputRowElement(settings, "closeAdminLog", "Close Admin Log", "Close admin log by default when opening a battlemetrics profile.");
    element.appendChild(closeAdminLog);
    

    const button = getResetButton("bm-main");
    element.appendChild(button);

    return element;
}
function switchMainSettingsTo(id, value) {
    const settings = JSON.parse(localStorage.getItem("BME_MAIN_SETTINGS"))
    settings[id] = value;
    localStorage.setItem("BME_MAIN_SETTINGS", JSON.stringify(settings));
}
function getMainSettingsInputRowElement(settings, settingsName, settingsTitle, description) {
    const row = document.createElement("div");
    row.className = "bme-settings-row";

    const firstRow = document.createElement("div");

    const input = document.createElement("input");
    input.classList.add("bme-toggle-input")
    input.type = "checkbox";
    input.checked = settings[settingsName];
    firstRow.appendChild(input);

    input.addEventListener("change", e => { switchMainSettingsTo(settingsName, e.target.checked) })

    const title = document.createElement("h3");
    title.className = "bme-settings-title";
    title.textContent = settingsTitle;
    firstRow.appendChild(title)

    const desc = document.createElement("p");
    desc.className = "bme-settings-description";
    desc.textContent = description;

    row.append(firstRow, desc);
    return row;
}

function getIdentifierSettings() {
    const element = document.createElement("div");
    const title = document.createElement("h1");
    title.innerText = "Identifier Settings";
    element.appendChild(title);


    return element;
}


function getBmInfoSettings() {
    const settings = JSON.parse(localStorage.getItem("BME_BM_INFO_SETTINGS"))

    const element = document.createElement("div");
    const title = document.createElement("h1");
    title.innerText = "BM Information Settings:";
    element.appendChild(title);

    element.appendChild(getColorSettingsRow(settings, "steamAccountAgeColors", "Steam Account Age Colors (milliseconds):", ""))
    element.appendChild(getColorSettingsRow(settings, "steamGameCountColors", "Steam Game Count Colors:", ""))
    element.appendChild(getColorSettingsRow(settings, "steamCombinedHoursColors", "Steam Hours Colors:", ""))
    element.appendChild(getColorSettingsRow(settings, "steamRustHoursColors", "Steam Rust Hours Colors:", ""))
    element.appendChild(getColorSettingsRow(settings, "gamesLastCheckedColors", "Steam Games Last Checked Colors (milliseconds):", ""))
    element.appendChild(getColorSettingsRow(settings, "bmAccountAgeColors", "BattleMetrics Account Age Colors (milliseconds):", ""))
    element.appendChild(getColorSettingsRow(settings, "serverCountColors", "BM Servers Count Colors:", ""))
    element.appendChild(getBarrierSettingsRow(settings, "allReportsBarrier", "Recent Reports Barrier (milliseconds):", ""))
    element.appendChild(getColorSettingsRow(settings, "allReportsColor", "BattleMetrics Report Colors:", ""))
    element.appendChild(getBarrierSettingsRow(settings, "cheatReportsBarrier", "Recent Cheat Reports Barrier (milliseconds):", ""))
    element.appendChild(getColorSettingsRow(settings, "cheatReportsColors", "BattleMetrics Cheat Report Colors:", ""))
    element.appendChild(getColorSettingsRow(settings, "bmRustHoursColors", "BattleMetrics Hours Colors:", ""))
    element.appendChild(getColorSettingsRow(settings, "aimTrainColors", "BattleMetrics Aim Train Hours Colors:", ""))
    element.appendChild(getBarrierSettingsRow(settings, "killBarrier", "Recent Kills Barrier (milliseconds):", ""))
    element.appendChild(getColorSettingsRow(settings, "killColors", "BattleMetrics Kill Count Colors:", ""))
    element.appendChild(getBarrierSettingsRow(settings, "deathBarrier", "Recent Deaths Barrier (milliseconds):", ""))
    element.appendChild(getColorSettingsRow(settings, "deathColors", "BattleMetrics Death Count Colors:", ""))
    element.appendChild(getBarrierSettingsRow(settings, "kdBarrier", "Recent Kill/Death Ratio Barrier (milliseconds):", ""))
    element.appendChild(getColorSettingsRow(settings, "kdColors", "BattleMetrics Kill/Death Ratio Colors:", ""))

    const button = getResetButton("bm-info");
    element.appendChild(button);

    return element;
}
function getColorSettingsRow(settings, settingsName, settingsTitle, settingsDescription, type) {
    const [first, second, third, reverse] = settings[settingsName];

    const row = document.createElement("div");
    row.className = "bme-settings-bm-info-row";

    const title = document.createElement("h4");
    title.textContent = settingsTitle;
    row.appendChild(title);

    const actualRow = document.createElement("div");
    row.appendChild(actualRow);

    const firstElement = getColorElement(0, settings, settingsName);
    const secondElement = getColorElement(1, settings, settingsName);
    const thirdElement = getColorElement(2, settings, settingsName);
    const colorReverseElement = getColorReverseInput(settings, settingsName);
    actualRow.append(firstElement, secondElement, thirdElement, colorReverseElement)

    if (settingsDescription) {
        const desc = document.createElement("p");
        desc.innerText = settingsDescription;
        row.appendChild(desc);
    }

    return row;
}
function getColorElement(index, settings, settingsName) {
    const div = document.createElement("div");
    const colorClass = getColorClass(settings[settingsName][3], index);
    div.classList.add(colorClass, "bme-settings-color-div");

    const value = settings[settingsName][index];

    const input = document.createElement("input");
    input.type = "number";
    input.value = value;
    div.appendChild(input)

    input.addEventListener("change", e => {
        const target = e.target;

        const newValue = target.value;
        if (isNaN(Number(newValue))) return updateStatus(target, false);

        const settings = JSON.parse(localStorage.getItem("BME_BM_INFO_SETTINGS"));
        settings[settingsName][index] = newValue;
        localStorage.setItem("BME_BM_INFO_SETTINGS", JSON.stringify(settings));
        return updateStatus(target, true);
    })

    return div
}
function updateStatus(element, success) {
    if (success) {
        element.classList.add("bme-success-input");
        setTimeout(() => {
            element.classList.remove("bme-success-input");
        }, 200);
    } else {
        element.classList.add("bme-error-input");
        setTimeout(() => {
            element.classList.remove("bme-error-input");
        }, 200);
    }

}
function getColorReverseInput(settings, settingsName) {
    const div = document.createElement("div");
    div.classList.add("bme-color-switch-wrapper")
    const checked = settings[settingsName][3];

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked;
    input.classList.add("bme-color-switch-input")
    div.appendChild(input)

    input.addEventListener("change", (e) => {
        const target = e.target;
        const row = target.parentNode.parentNode.childNodes;

        const first = row[0];
        first.classList.toggle("bme-red-highlight")
        first.classList.toggle("bme-green-highlight")
        const third = row[2];
        third.classList.toggle("bme-red-highlight")
        third.classList.toggle("bme-green-highlight")

        //SAVE        
        const settings = JSON.parse(localStorage.getItem("BME_BM_INFO_SETTINGS"));
        settings[settingsName][3] = target.checked;
        localStorage.setItem("BME_BM_INFO_SETTINGS", JSON.stringify(settings));
    })

    return div;
}
function getColorClass(reverse, index) {
    if (index === 0) return reverse ? "bme-green-highlight" : "bme-red-highlight";
    if (index === 1) return "bme-yellow-highlight"
    if (index === 2) return reverse ? "bme-red-highlight" : "bme-green-highlight";
    return "";
}
function getBarrierSettingsRow(settings, settingsName, settingsTitle, settingsDescription) {
    const row = document.createElement("div");
    row.className = "bme-settings-bm-info-row";

    const title = document.createElement("h4");
    title.textContent = settingsTitle;
    row.appendChild(title);

    const actualRow = document.createElement("div");
    actualRow.classList.add("bme-settings-color-div")
    row.appendChild(actualRow);

    const input = document.createElement("input");
    input.type = "number";
    input.value = settings[settingsName];
    actualRow.appendChild(input);

    return row;
}


function getMultiOrgSettings() {
    const element = document.createElement("div");

    const titleRow = document.createElement("div");
    titleRow.classList.add("bme-flex", "bme-title-row")
    element.appendChild(titleRow);
    
    const title = document.createElement("h1");
    title.innerText = "Multi Org Settings";
    titleRow.appendChild(title);

    const settings = JSON.parse(localStorage.getItem("BME_MULTI_ORG_SETTINGS"))

    const enableInput = document.createElement("input");
    enableInput.type = "checkbox";
    enableInput.classList.add("bme-toggle-input");
    titleRow.appendChild(enableInput);

    enableInput.addEventListener("change", e => {
        console.log(e.target.checked);
        
    })

    

    return element;
}




function getResetButton(type) {
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
            return;
        }

        target.innerText = "Reloading...";
        target.classList.add("bme-button-green-background")

        if (type === "bm-main") localStorage.setItem("BME_MAIN_SETTINGS", JSON.stringify(getDefaultMainSettings()));
        if (type === "bm-info") localStorage.setItem("BME_BM_INFO_SETTINGS", JSON.stringify(getDefaultBmInfoSettings()));



        location.reload();
    })


    return wrap;
}





export function checkAndSetupSettingsIfMissing() {
    checkMainSettings();
    checkBmInfoSettings();
    checkMultiOrgSettings();
}

function checkMainSettings() {
    try {
        const mainSettings = JSON.parse(localStorage.getItem("BME_MAIN_SETTINGS"));
        if (typeof (mainSettings) !== "object") throw new Error("Settings error");
        if (typeof (mainSettings.showServer) !== "boolean") throw new Error("Settings error");
        if (typeof (mainSettings.showInfoPanel) !== "boolean") throw new Error("Settings error");
        if (typeof (mainSettings.showAvatarOverview) !== "boolean") throw new Error("Settings error");
        if (typeof (mainSettings.showAvatarIdentifier) !== "boolean") throw new Error("Settings error");
        if (typeof (mainSettings.removeSteamInfo) !== "boolean") throw new Error("Settings error");
        if (typeof (mainSettings.advancedBans) !== "boolean") throw new Error("Settings error");
        if (typeof (mainSettings.closeAdminLog) !== "boolean") throw new Error("Settings error");
    } catch (error) {
        const defaultSettings = getDefaultMainSettings();
        localStorage.setItem("BME_MAIN_SETTINGS", JSON.stringify(defaultSettings));
    }
}
function getDefaultMainSettings() {
    const settings = {};
    settings.showServer = true;
    settings.showInfoPanel = true;
    settings.showAvatarOverview = true;
    settings.showAvatarIdentifier = false;
    settings.removeSteamInfo = true;
    settings.advancedBans = true;
    settings.closeAdminLog = true;
    return settings;
}
function checkBmInfoSettings() {
    try {
        const bmInfoSettings = JSON.parse(localStorage.getItem("BME_BM_INFO_SETTINGS"));
        if (typeof (bmInfoSettings) !== "object") throw new Error("Settings error");
        if (!bmInfoSettings.steamAccountAgeColors) throw new Error("Settings error");
        if (!bmInfoSettings.steamGameCountColors) throw new Error("Settings error");
        if (!bmInfoSettings.steamCombinedHoursColors) throw new Error("Settings error");
        if (!bmInfoSettings.steamRustHoursColors) throw new Error("Settings error");
        if (!bmInfoSettings.bmAccountAgeColors) throw new Error("Settings error");
        if (!bmInfoSettings.bmAccountAgeColors) throw new Error("Settings error");
        if (!bmInfoSettings.serverCountColors) throw new Error("Settings error");
        if (!bmInfoSettings.allReportsBarrier) throw new Error("Settings error");
        if (!bmInfoSettings.allReportsColor) throw new Error("Settings error");
        if (!bmInfoSettings.cheatReportsBarrier) throw new Error("Settings error");
        if (!bmInfoSettings.cheatReportsColors) throw new Error("Settings error");
        if (!bmInfoSettings.bmRustHoursColors) throw new Error("Settings error");
        if (!bmInfoSettings.aimTrainColors) throw new Error("Settings error");
        if (!bmInfoSettings.killBarrier) throw new Error("Settings error");
        if (!bmInfoSettings.killColors) throw new Error("Settings error");
        if (!bmInfoSettings.deathBarrier) throw new Error("Settings error");
        if (!bmInfoSettings.deathColors) throw new Error("Settings error");
        if (!bmInfoSettings.kdBarrier) throw new Error("Settings error");
        if (!bmInfoSettings.kdColors) throw new Error("Settings error");
    } catch (error) {
        const defaultSettings = getDefaultBmInfoSettings();
        localStorage.setItem("BME_BM_INFO_SETTINGS", JSON.stringify(defaultSettings));
    }
}
function getDefaultBmInfoSettings() {
    const settings = {};
    settings.steamAccountAgeColors = [30 * ONE_DAY, 90 * ONE_DAY, -1, false]
    settings.steamGameCountColors = [2, -1, -1, false]
    settings.steamCombinedHoursColors = [150, 750, 100000, false]
    settings.steamRustHoursColors = [150, 750, 100000, false]
    settings.gamesLastCheckedColors = [30 * ONE_DAY, 60 * ONE_DAY, 90 * ONE_DAY, true]
    settings.bmAccountAgeColors = [30 * ONE_DAY, 90 * ONE_DAY, -1, false]
    settings.serverCountColors = [8, -1, -1], false;
    settings.allReportsBarrier = 2 * ONE_DAY;
    settings.allReportsColor = [-1, -1, -1, false];
    settings.cheatReportsBarrier = 2 * ONE_DAY;
    settings.cheatReportsColors = [-1, -1, -1, false];
    settings.bmRustHoursColors = [150, 750, 100000, false];
    settings.aimTrainColors = [25, 50, 100000, false];
    settings.killBarrier = 2 * ONE_DAY;
    settings.killColors = [-1, -1, -1, false];
    settings.deathBarrier = 2 * ONE_DAY;
    settings.deathColors = [-1, -1, -1, false];
    settings.kdBarrier = 2 * ONE_DAY;
    settings.kdColors = [3, -1, -1, false];

    return settings;
}
function checkMultiOrgSettings() {
    try {
        const bmMultiOrgSettings = JSON.parse(localStorage.getItem("BME_MULTI_ORG_SETTINGS"));
        if (typeof (bmMultiOrgSettings) !== "object") throw new Error("Settings error");
        if (typeof (bmMultiOrgSettings.enabled) !== "boolean") throw new Error("Settings error");
    } catch (error) {
        const defaultSettings = getDefaultMultiOrgSettings();
        localStorage.setItem("BME_MULTI_ORG_SETTINGS", JSON.stringify(defaultSettings));
    }
}
function getDefaultMultiOrgSettings() {
    const settings = {};
    settings.enabled = false;
    return settings;
}