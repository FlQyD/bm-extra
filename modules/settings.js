const ONE_DAY = 24 * 60 * 60 * 1000;
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

    const menuPoints = ["Overview", "Identifier", "BM Information", /*"Multi Org", "Evasion Checker",*/ "API Keys"];
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
    if (index === 3) return getApiKeysSettings();
}

function getIdentifierSettings() {
    const element = document.createElement("div");
    const title = document.createElement("h1");
    title.innerText = "Identifier Settings";
    element.appendChild(title);


    return element;
}



function getOverviewSettings() {
    const element = document.createElement("div");
    const title = document.createElement("h1");
    title.innerText = "Overview Settings";
    element.appendChild(title);

    const settingsBucket = "BME_OVERVIEW_SETTINGS";
    const settings = JSON.parse(localStorage.getItem(settingsBucket));
    
    const showAvatarToggle = getToggleSettingsElement(
        "Show avatar on page",
        "Shows the players avatar when it's available next to his name", 
        null, settingsBucket, "showAvatar", settings.showAvatar
    )
    const showBmInfoPanel = getToggleSettingsElement(
        "Show BM Information",
        "Shows detailed information that is stored by battlemetrics and usually not visible by default",
        null, settingsBucket, "showInfoPanel", settings.showInfoPanel
    );
    const removeSteamInfo = getToggleSettingsElement(
        "Remove Steam Information",
        "Remove the default Steam information panel from the battlemetrics RCON profile when it appears",
        null, settingsBucket, "removeSteamInfo", settings.removeSteamInfo,
    );
    const showServer = getToggleSettingsElement(
        "Show server",
        "Show either the current or the last server the user has played on, as well as displaying connection details",
        null, settingsBucket, "showServer", settings.showServer
    )
    const advancedBans = getToggleSettingsElement(
        "Advanced Bans",
        "Update ban reasons for a more readable format",
        null, settingsBucket, "advancedBans", settings.advancedBans
    )
    const closeAdminLog = getToggleSettingsElement(
        "Close Admin Log",
        "Close admin log by default when opening a battlemetrics profile.",
        null, settingsBucket, "closeAdminLog", settings.closeAdminLog
    )
    const swapBattleEyeGuid = getToggleSettingsElement(
        "Swap BattlEye GUID",
        "Swap BattlEye GUID to the player's streamer mode name",
        ["SM Names"], settingsBucket, "swapBattleEyeGuid", settings.swapBattleEyeGuid
    )
    const maxNamesOnProfile = getNumberSettingsElement(
        "Maximum names:",
        "The maximum number of names allowed to be showed in the overview section.",
        null, settingsBucket, "maxNames", settings.maxNames
    )
    const maxIpsOnProfile = getNumberSettingsElement(
        "Maximum IP addresses:",
        "The maximum number of IP addresses allowed to be showed in the overview section.",
        null, settingsBucket, "maxIps", settings.maxIps
    )
    const resetButton = getResetButton("bm-overview");

    element.append(
        showAvatarToggle, showBmInfoPanel, removeSteamInfo, showServer,
        advancedBans, closeAdminLog, swapBattleEyeGuid, 
        maxNamesOnProfile, maxIpsOnProfile,
        

        resetButton
    );

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



function getApiKeysSettings() {
    const element = document.createElement("div");

    const titleRow = document.createElement("div");
    titleRow.classList.add("bme-flex", "bme-title-row")
    element.appendChild(titleRow);

    const title = document.createElement("h1");
    title.innerText = "API Keys";
    titleRow.appendChild(title);

    const battleMetricsKeyElements = getApiKeyDiv("BattleMetrics API Key:", "BME_BATTLEMETRICS_API_KEY", "bm-api");
    const steamKeyElement = getApiKeyDiv("Steam API Key:", "BME_STEAM_API_KEY", "steam-api");
    const rustApiKeyElement = getApiKeyDiv("Rust API Key:", "BME_RUST_API_KEY", "rust-api");
    const updater = getSmUpdater();

    element.append(battleMetricsKeyElements, steamKeyElement, rustApiKeyElement, updater);


    return element;
}
function getApiKeyDiv(titleText, value, id) {
    const container = document.createElement("div");

    const currentKey = localStorage.getItem(value);

    const title = document.createElement("h3")
    title.innerText = titleText;
    container.appendChild(title)

    const detail = document.createElement("p");
    detail.id = `${id}-key-detail`;
    detail.classList.add("bme-key-settings-detail");
    detail.innerText = getKeyDetailContent(currentKey);
    container.appendChild(detail);

    const wrapper = document.createElement("div");
    wrapper.classList.add("bme-key-settings-wrapper");
    container.appendChild(wrapper);

    const keyInput = document.createElement("input");
    keyInput.id = `${id}-key-input`;
    wrapper.appendChild(keyInput);

    const updateButton = document.createElement("button");
    updateButton.innerText = "Update"
    wrapper.appendChild(updateButton);

    updateButton.addEventListener("click", e => {
        const input = document.getElementById(`${id}-key-input`);
        const newKey = input.value;
        input.value = "";

        localStorage.setItem(value, newKey);

        const detailItem = document.getElementById(`${id}-key-detail`);
        detailItem.innerText = getKeyDetailContent(newKey);
    })

    return container;
}
function getKeyDetailContent(key) {
    return key ? `Your key starts with: ${key.substring(0, 10)}` : "You have no key saved yet.";
}
function getSmUpdater() {
    const element = document.createElement("div");
    element.classList.add("bme-sm-settings-updater")

    const title = document.createElement("h3");
    title.innerText = "Stored Steamer Mode Names:";
    element.appendChild(title);

    const text = document.createElement("p");
    text.innerText = "Streamer Mode names should be uploaded and stored from the game files. They may change with an update, in which case they will have to be reuploaded.";
    element.appendChild(text);

    const folder = document.createElement("h4");
    folder.classList.add("bme-sm-settings-gap")
    folder.innerText = "Default folder:";
    element.appendChild(folder);

    const folderUrl = document.createElement("code");
    folderUrl.classList.add("bme-sm-settings-margin");
    folderUrl.innerText = `C:\\Program Files (x86)\\Steam\\steamapps\\common\\Rust\\RustClient_Data\\StreamingAssets\\`;
    element.appendChild(folderUrl);

    const file = document.createElement("h4");
    file.innerText = "File:"
    element.appendChild(file);

    const fileUrl = document.createElement("code");
    fileUrl.classList.add("bme-sm-settings-margin");
    fileUrl.innerText = `RandomUsernames.json`;
    element.appendChild(fileUrl);

    const wrapper = document.createElement("div");
    wrapper.id = "bme-sm-input-wrapper"
    element.appendChild(wrapper)

    const input = document.createElement("input");
    input.classList.add("bme-sm-settings-gap");
    input.type = "file";
    input.accept = "application/json,.json";
    input.id = "bmi-file";
    input.addEventListener("change", fileChanged)
    wrapper.appendChild(input)

    let smData = null;
    try {
        smData = JSON.parse(localStorage.getItem("BME_SM_NAMES"))   
    } catch (error) {};    

    const lastUpdated = smData ? smData.lastUpdated : null;
    const status = document.createElement("div");
    status.id = "bme-status";
    if (lastUpdated) status.innerText = `Last updated: ${new Date(lastUpdated).toLocaleString().replace(",", "").substring(0, 16)} | ${smData.names.length} names stored!`;
    wrapper.appendChild(status)

    return element
    async function fileChanged(e) {
        const file = e.target.files && e.target.files[0];
        const status = document.getElementById("bme-status");
        try {


            if (!file) {
                status.textContent = "ERROR: No file selected."
                return invokeChange("red");
            };

            const content = await file.text();
            if (!content) {
                status.innerText = "ERROR: Empty file was selected.";
                return invokeChange("red");
            }

            const json = JSON.parse(content);
            const names = json?.RandomUsernames;
            if (!names || typeof (names) !== "object") {
                status.innerText = "ERROR: Invalid file format!";
                return invokeChange("red");
            }

            const obj = {};
            obj.lastUpdated = Date.now();
            obj.names = names;

            localStorage.setItem("BME_SM_NAMES", JSON.stringify(obj));

            invokeChange("green");
            status.innerText = "Names were stored. Reload in 3 seconds!"
            setTimeout(() => { status.innerText = "Names were stored. Reload in 2 seconds!" }, 1000);
            setTimeout(() => { status.innerText = "Names were stored. Reload in 1 seconds!" }, 2000);
            setTimeout(() => {
                status.innerText = "Names were stored. Reloading..."
                location.reload()
            }, 3000);

        } catch (error) {
            status.innerText = "ERROR: Invalid file!";
            return invokeChange("red");
        }
    }
}
function invokeChange(type) {
    const settingsPage = document.getElementById("bme-sm-input-wrapper");
    settingsPage.classList.add(`bme-sm-${type}`);
    setTimeout(() => { settingsPage.classList.remove(`bme-sm-${type}`); }, 900);
}



function getNumberSettingsElement(title, description, requirements, settingsBucket, settingsName, currentValue) {
    const element = document.createElement("div");
    element.className = "bme-settings-row";

    const firstRow = document.createElement("div");

    const titleElement = document.createElement("h3");
    titleElement.className = "bme-settings-title";
    titleElement.textContent = title;
    
    const input = document.createElement("input");
    input.classList.add("bme-settings-number-input")
    input.value = currentValue;
    firstRow.append(titleElement, input)

    input.addEventListener("change", e => { 
        const value = e.target.value;
        try {
            if (isNaN(Number(value))) throw new Error("Input value must be a number.");
            if (value < -1) throw new Error("Minimum value is -1");

            setSettingTo(settingsBucket, settingsName, Number(value)) 
            e.target.classList.add("bme-sm-green")
            setTimeout(() => { e.target.classList.remove("bme-sm-green") }, 400);
        } catch (error) {
            console.log(error);
            e.target.classList.add("bme-sm-red")
            setTimeout(() => {e.target.classList.remove("bme-sm-red") }, 400);
        }
    })

    const desc = document.createElement("p");
    desc.className = "bme-settings-description";
    desc.textContent = description;

    element.append(firstRow, desc)
    return element;
}
function getToggleSettingsElement(title, description, requirements, settingsBucket, settingsName, currentValue) {
    const element = document.createElement("div");
    element.className = "bme-settings-row";

    const firstRow = document.createElement("div");

    const input = document.createElement("input");
    input.classList.add("bme-toggle-input")
    input.type = "checkbox";
    input.checked = currentValue;

    input.addEventListener("change", e => { setSettingTo(settingsBucket, settingsName, e.target.checked) })

    const titleElement = document.createElement("h3");
    titleElement.className = "bme-settings-title";
    titleElement.textContent = title;
    firstRow.append(input, titleElement)

    const desc = document.createElement("p");
    desc.className = "bme-settings-description";
    desc.textContent = description;

    element.append(firstRow, desc)

    if (requirements) {
        const reqs = document.createElement("p");
        reqs.classList.add("bme-settings-requirements");
        reqs.innerText = `REQUIRED: ${requirements.join(" | ")}`;
        element.append(reqs);
    }
    return element;
}
function setSettingTo(settingsBucket, settingsName, settingsValue) {
    console.log(settingsBucket, settingsName, settingsValue);
    
    const settings = JSON.parse(localStorage.getItem(settingsBucket));
    settings[settingsName] = settingsValue;
    localStorage.setItem(settingsBucket, JSON.stringify(settings));
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
        if (type === "bm-overview") localStorage.setItem("BME_OVERVIEW_SETTINGS", JSON.stringify(getDefaultOverviewSettings()));



        location.reload();
    })


    return wrap;
}



export function checkAndSetupSettingsIfMissing() {
    checkMainSettings();
    checkOverviewSettings();
    checkBmInfoSettings();
    checkSidebarSettings();
}

function checkMainSettings() {
    try {
        const mainSettings = JSON.parse(localStorage.getItem("BME_MAIN_SETTINGS"));
        if (typeof (mainSettings) !== "object") throw new Error("Settings error");
        if (typeof (mainSettings.showAvatarIdentifier) !== "boolean") throw new Error("Settings error");
    } catch (error) {
        const defaultSettings = getDefaultMainSettings();
        localStorage.setItem("BME_MAIN_SETTINGS", JSON.stringify(defaultSettings));
    }
}
function getDefaultMainSettings() {
    const settings = {};
    settings.showAvatarIdentifier = false;
    return settings;
}
function checkOverviewSettings() {
    try {
        const settings = JSON.parse(localStorage.getItem("BME_OVERVIEW_SETTINGS"));
        if (typeof (settings) !== "object") throw new Error("Settings error");
        if (typeof (settings.showAvatar) !== "boolean") throw new Error("Settings error");
        if (typeof (settings.showServer) !== "boolean") throw new Error("Settings error");
        if (typeof (settings.showInfoPanel) !== "boolean") throw new Error("Settings error");
        if (typeof (settings.removeSteamInfo) !== "boolean") throw new Error("Settings error");
        if (typeof (settings.advancedBans) !== "boolean") throw new Error("Settings error");
        if (typeof (settings.closeAdminLog) !== "boolean") throw new Error("Settings error");
        if (typeof (settings.swapBattleEyeGuid) !== "boolean") throw new Error("Settings error");
        if (typeof (settings.maxNames) !== "number") throw new Error("Settings error");
        if (typeof (settings.maxIps) !== "number") throw new Error("Settings error");
    } catch (error) {
        const defaultSettings = getDefaultOverviewSettings();
        localStorage.setItem("BME_OVERVIEW_SETTINGS", JSON.stringify(defaultSettings));
    }
}
function getDefaultOverviewSettings() {
    const settings = {};
    settings.showAvatar = true;
    settings.showServer = true;
    settings.showInfoPanel = true;
    settings.removeSteamInfo = true;
    settings.advancedBans = true;
    settings.closeAdminLog = true;
    settings.swapBattleEyeGuid = false;
    settings.maxNames = -1;
    settings.maxIps = -1;
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
function checkSidebarSettings() {
    try {
        const settings = JSON.parse(localStorage.getItem("BME_SIDEBAR_SETTINGS"));
        if (typeof (settings.friends) !== "object") throw new Error("Settings error");
        if (!settings.friends.spot) throw new Error("Settings error");
        throw new Error("Settings");
        
    } catch (error) {
        const defaultSettings = getDefaultSidebarSettings();
        localStorage.setItem("BME_SIDEBAR_SETTINGS", JSON.stringify(defaultSettings));
    }
}
function getDefaultSidebarSettings() {
    const settings = {};
    settings.friends = {}
    settings.friends.enabled = true;
    settings.friends.spot = "right-slot-2"

    settings.historicFriends = {}
    settings.historicFriends.enabled = true;
    settings.historicFriends.spot = "right-slot-3"
    settings.historicFriends.seenOnOrigin = "#55ffff15"
    settings.historicFriends.seenOnFriend = "#ffff5515"

    settings.currentTeam = {};
    settings.currentTeam.enabled = true;
    settings.currentTeam.spot = "left-slot-1";

    settings.publicBans = {}
    settings.publicBans.enabled = true;
    settings.publicBans.spot = "left-slot-2";
    
    return settings;
}