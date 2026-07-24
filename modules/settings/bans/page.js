import { getBootstrap, getMyServers, setNativeValue } from "../../misc.js";
import { getResetButton, getSettingsElement } from "../settings.js";


let myServers = null;
loadMyServers();
async function loadMyServers() {
    if (!myServers) myServers = await getMyServers();
}

export function getBanPageSettings() {
    const element = document.createElement("div");
    const title = document.createElement("h1");
    title.innerText = "Ban Page Settings";
    element.appendChild(title);

    const settingsBucket = "BME_BAN_PAGE_SETTINGS";
    const settings = JSON.parse(localStorage.getItem(settingsBucket));

    const selectLastServer = getSettingsElement(
        "toggle", "Select Last Server",
        "Automatically selects the last server if it's present on your server list.",
        null, settingsBucket, "selectLastServer", settings.selectLastServer
    )

    const banPresetsSegment = document.createElement("div")
    banPresetsSegment.classList.add("bme-settings-segment", "bme-inactive-segment");

    const banPresetsEnabled = getSettingsElement(
        "toggle", "Enable Ban Presets",
        "Ban presets are disabled. If you had previously setup presets, you can use those until they work, but you cannot setup new ones.",
        /*"Allows you to create ban presets that you can activate with one click on the sidebar.",*/
        null, settingsBucket, "presets-enabled",
        settings.presets.enabled
    )

    const banSidebarSlots = [
        { value: "right-slot-1", display: "RIGHT 1" },
        { value: "right-slot-2", display: "RIGHT 2" },
        { value: "left-slot-1", display: "LEFT 1" },
        { value: "left-slot-2", display: "LEFT 2" },
    ]
    const banPresetSidebarSpot = getSettingsElement(
        "switch", "Position:",
        "Choose which sidebar spot should the ban presets be present",
        null, settingsBucket, "presets-spot", settings.presets.spot, { options: banSidebarSlots }
    )

    const setupBansAfterFirst = getSettingsElement(
        "toggle", "Chain Bans",
        "If you used a preset, the rest of the bans you open will automatically invoke the same preset.",
        null, settingsBucket, "presets-setupBansAfterFirst", settings.presets.setupBansAfterFirst
    );

    const copyEvidence = getSettingsElement(
        "toggle", "Use Clipboard For Evidence",
        "It will paste the default content of your clipboard if the ban note is empty.",
        null, settingsBucket, "presets-pasteEvidenceIfEmpty", settings.presets.pasteEvidenceIfEmpty
    )

    banPresetsSegment.append(banPresetSidebarSpot, setupBansAfterFirst, copyEvidence,);

    const bootstrap = getBootstrap();
    if (bootstrap && myServers) {
        const rawOrgData = bootstrap.state.account.organizations
        const orgData = rawOrgData.map(item => getOrgData(item))

        const newPresetCreator = getNewPresetCreatorElement(orgData);
        banPresetsSegment.append(newPresetCreator);

        const currentPresets = document.createElement("div");
        currentPresets.id = "bme-ban-presets-showcase";
        currentPresets.appendChild(getCurrentPresetsShowcase(settings));
        banPresetsSegment.append(currentPresets)

        const banPresetsImportExport = getImportExport()
        banPresetsSegment.append(banPresetsImportExport)
    }


    const resetButton = getResetButton("bm-bans")
    element.append(
        selectLastServer,
        banPresetsEnabled, banPresetsSegment,


        resetButton
    )

    return element;
}
function getOrgData(orgData) {
    const newOrgData = {};
    newOrgData.id = orgData.org_id;
    newOrgData.name = orgData.name;
    newOrgData.banLists = orgData.ban_lists.map(banList => {
        return {
            name: banList.name,
            id: banList.list_id,
            reasons: banList.default_reasons || [],
            orgId: orgData.org_id,
        }
    })
    newOrgData.servers = orgData.servers.map(serverId => getServerData(serverId))
    return newOrgData;
}
function getServerData(serverId) {
    if (myServers) {
        const server = myServers.find(item => item.id === serverId);
        if (server) return server;
    }

    return { id: serverId, name: serverId, orgId: null };
}
function getNewPresetCreatorElement(orgData) {
    const servers = [{ name: "Select Server", id: "select" }, { name: "Last Server - Where the player last played", id: "last" }];
    const banLists = [{ name: "Select Ban List", id: "select" }, { name: "Default | Do not touch", id: "default" }];
    const defaultReasons = [{ name: "Select Reason", id: "select" }, { name: "Default | Do not touch", id: "default" }];
    orgData.forEach(org => {
        org.servers.forEach(server => {
            servers.push(server)
        })
        org.banLists.forEach(banList => {
            banLists.push(banList);
        })
    });

    /**
     * preset:
     *   displayName: "string"
     *   color: "string"
     *   server: "last" | serverId,
     *   banList: "default" | banListId,
     *   reason: "default" | "string"
     */
    const element = document.createElement("div");
    element.id = "new-ban-preset-container"

    const title = document.createElement("h3");
    title.innerText = "New Ban Preset";
    element.append(title)

    const nameInput = document.createElement("input");
    nameInput.placeholder = "Ban Preset Name"
    element.append(nameInput);

    const colorInput = document.createElement("input");
    colorInput.value = "#d2d2d2";
    colorInput.classList.add("bme-preset-color-settings")
    colorInput.type = "color";
    element.append(colorInput)

    const serverSelect = document.createElement("select");
    serverSelect.classList = "bme-settings-selector";

    servers.forEach(server => {
        const option = document.createElement("option");
        option.value = server.id;
        option.textContent = server.name;
        serverSelect.appendChild(option);
    });
    serverSelect.addEventListener("change", e => {
        const value = e.target.value;

        const banListSelector = document.getElementById("ban-list-selector");
        if (!banListSelector) return console.error("BM-ERROR: banListSelector wasn't found.")

        setNativeValue(banListSelector, "select")

        if (value === "select") {
            banListSelector.disabled = true;
            return;
        }

        banListSelector.disabled = false;
        const server = servers.find(server => server.id === value);
        const orgId = server?.orgId || -1;

        const banListOptions = Array.from(banListSelector.children);
        if (orgId === -1) {
            banListOptions.forEach(option => option.disabled = false);
        } else {
            banListOptions.forEach((option, i) => {
                const banListOrgId = getBanListOrgId(option.value, banLists);
                if (option.value === "select") return option.disabled = true;
                if (option.value === "default") return option.disabled = false;

                if (orgId === banListOrgId) option.disabled = false;
                else option.disabled = true;
            })
        }
    })

    const banListSelect = document.createElement("select")
    banListSelect.classList = "bme-settings-selector";
    banListSelect.id = "ban-list-selector";
    banListSelect.disabled = true;

    banLists.forEach(banList => {
        const option = document.createElement("option");
        option.value = banList.id;
        option.textContent = `${getOrgName(banList.orgId, orgData)}${banList.name}`;
        banListSelect.appendChild(option);
    });

    banListSelect.addEventListener("change", e => {
        const value = e.target.value;

        const banReasonSelector = document.getElementById("ban-reason-selector");
        if (!banReasonSelector) return console.error("BM-ERROR: banReasonSelector wasn't found.")

        setNativeValue(banReasonSelector, "select")
        if (value === "select") return banReasonSelect.disabled = true;
        if (value === "default") {
            setNativeValue(banReasonSelector, "default")
            return banReasonSelect.disabled = true;
        }

        const banList = banLists.find(banList => banList.id === value);

        const reasons = [];
        defaultReasons.forEach(reason => reasons.push(reason));
        banList.reasons.forEach(reason => { reasons.push({ name: reason, id: reason }) });

        banReasonSelector.replaceChildren();
        for (const reason of reasons) {
            const opt = document.createElement("option");
            opt.textContent = reason.name;
            opt.value = reason.id;
            banReasonSelector.appendChild(opt);
            if (reason.id === "select") opt.disabled = true;
        }
        banReasonSelector.disabled = false;
    })

    const banReasonSelect = document.createElement("select")
    banReasonSelect.classList = "bme-settings-selector";
    banReasonSelect.id = "ban-reason-selector"
    banReasonSelect.disabled = true;

    defaultReasons.forEach(reason => {
        const option = document.createElement("option");
        option.value = reason.id;
        option.textContent = `${reason.name}`;
        banReasonSelect.appendChild(option);
    });

    const banDuration = document.createElement("input");
    banDuration.placeholder = "Number of Days | Empty for Permanent"

    const addButton = document.createElement("button");
    addButton.innerText = "Add New Ban Preset"
    addButton.addEventListener("click", e => {
        const items = Array.from(e.target.parentNode.children)

        let isItOkay = true;
        const name = items[1].value;
        if (!name) {
            turnItRed(items[1]);
            isItOkay = false;
        }

        const color = items[2].value;

        const server = items[3].value;
        if (server === "select" || !server) {
            turnItRed(items[3]);
            isItOkay = false;
        }

        const banList = items[4].value;
        if (banList === "select" || !banList) {
            turnItRed(items[4]);
            isItOkay = false;
        }

        const reason = items[5].value;
        if (reason === "select" || !reason) {
            turnItRed(items[5]);
            isItOkay = false;
        }

        const duration = items[6].value || -1;
        if (isNaN(Number(duration))) {
            turnItRed(items[6]);
            isItOkay = false;
        }
        if (!isItOkay) return;

        const newPreset = { name, color, server, banList, reason, duration };
        const settings = JSON.parse(localStorage.getItem("BME_BAN_PAGE_SETTINGS"));
        settings.presets.items.push(newPreset);
        localStorage.setItem("BME_BAN_PAGE_SETTINGS", JSON.stringify(settings));

        items[1].value = "";
        //items[2].value = "#151515";
        setNativeValue(items[3], "select");
        setNativeValue(items[4], "select");
        setNativeValue(items[5], "select");
        items[6].value = "";

        const currentPresets = document.getElementById("bme-ban-presets-showcase");
        if (!currentPresets) return console.error("BM-EXTRA: Failed to load currentPresets");

        currentPresets.innerHTML = "";
        currentPresets.appendChild(getCurrentPresetsShowcase(settings));
    })

    element.append(serverSelect, banListSelect, banReasonSelect, banDuration, addButton);
    return element;
}
function getOrgName(orgId, orgs) {
    const org = orgs.find(org => org.id === orgId);
    if (org) return `${org.name} | `;
    return "";
}
function getBanListOrgId(id, banLists) {
    const banList = banLists.find(banList => banList.id === id);
    if (banList) return banList.orgId;
    return -1;
}
function turnItRed(element) {
    element.classList.add("bme-red-highlight");
    setTimeout(() => { element.classList.remove("bme-red-highlight"); }, 450);
}
function getCurrentPresetsShowcase(setting) {
    const element = document.createElement("div");

    const title = document.createElement("h3");
    title.innerText = `Current Presets(${setting.presets.items.length}):`;
    element.append(title);

    const body = document.createElement("div");
    body.id = "bme-ban-presets-showcase-body"
    element.append(body)

    setting.presets.items.forEach((preset, i, arr) => {
        const presetElement = getPresetElement(preset, i, arr.length);
        body.appendChild(presetElement)
    })

    return element;
}
function getPresetElement(preset, index, max) {
    const element = document.createElement("div");
    element.classList.add("bme-ban-preset-showcase-item")
    element.style.setProperty("--color", preset.color)

    const name = document.createElement("p")
    name.innerText = `${preset.name}`;
    element.appendChild(name);

    const controlContainer = document.createElement("div")
    controlContainer.classList.add("bme-control-wrapper")
    element.appendChild(controlContainer)

    const arrowUp = document.createElement("img");
    arrowUp.classList.add(`up-arrow`)
    if (index === 0) arrowUp.classList.add("arrow-disabled")
    arrowUp.src = browser.runtime.getURL('assets/img/arrow.png');

    const deleteButton = document.createElement("img");
    deleteButton.src = browser.runtime.getURL('assets/img/trash.png');

    const arrowDown = document.createElement("img");
    arrowDown.classList.add(`down-arrow`)
    if (index === max - 1) arrowDown.classList.add("arrow-disabled")
    arrowDown.src = browser.runtime.getURL('assets/img/arrow.png');

    arrowUp.addEventListener("click", e => {
        if (!e.target.classList.contains("arrow-disabled")) processBanPresetChange(index, "up");
    })
    arrowDown.addEventListener("click", e => {
        if (!e.target.classList.contains("arrow-disabled")) processBanPresetChange(index, "down");
    })

    deleteButton.addEventListener("click", e => {
        if (e.target.classList.contains("confirm")) {
            processBanPresetChange(index, "delete");
        } else {
            e.target.classList.add("confirm");
            setTimeout(() => { e?.target?.classList?.remove("confirm") }, 2500);
        }
    })

    controlContainer.append(arrowUp, deleteButton, arrowDown)


    return element;
}
function processBanPresetChange(i, action) {
    const settings = JSON.parse(localStorage.getItem("BME_BAN_PAGE_SETTINGS"));

    const presets = settings.presets.items;
    if (action === "up") {
        const tmp = presets[i - 1];
        presets[i - 1] = presets[i];
        presets[i] = tmp;
    } else if (action === "down") {
        const tmp = presets[i + 1];
        presets[i + 1] = presets[i];
        presets[i] = tmp;
    } else if (action === "delete") {
        presets.splice(i, 1);
    }

    settings.presets.items = presets;
    localStorage.setItem("BME_BAN_PAGE_SETTINGS", JSON.stringify(settings));

    const bmeBanPresets = document.getElementById("bme-ban-presets-showcase");
    if (bmeBanPresets) {
        bmeBanPresets.innerHTML = "";
        bmeBanPresets.appendChild(getCurrentPresetsShowcase(settings))
    }
    return presets;
}
function getImportExport() {
    const element = document.createElement("div");
    element.classList.add("bme-ban-import-export");

    const title = document.createElement("h3");
    title.innerText = "Ban Presets Import / Export:";

    const wrapper = document.createElement("div");

    const importButton = document.createElement("button");
    importButton.innerText = "Import";

    const exportButton = document.createElement("button");
    exportButton.innerText = "Export";

    const statusText = document.createElement("p");
    statusText.id = "bme-ie-status-text";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/json";
    fileInput.style.display = "none";

    importButton.addEventListener("click", () => {
        fileInput.click();
    });
    fileInput.addEventListener("change", fileInputChange);
    exportButton.addEventListener("click", exportButtonPressed);

    wrapper.append(importButton, exportButton);
    element.append(title, wrapper, statusText, fileInput);

    return element;
}
function fileInputChange(e) {
    const status = document.getElementById("bme-ie-status-text");
    try {
        const file = e.target.files[0];
        if (!file) throw new Error("No file was uploaded.");
        if (file.type !== "application/json") throw new Error("File must be JSON.");

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const json = JSON.parse(reader.result);
                banPresetImported(json);
            } catch (error) {
                const msg = document.getElementById("bme-ie-status-text");
                msg.innerText = `Failed to parse file content to a JSON object.`;
            }
        };
        reader.readAsText(file);
    } catch (error) {
        const msg = document.getElementById("bme-ie-status-text");
        msg.innerText = error.message;
    }
}
function banPresetImported(json) {
    try {
        if (!json.length) throw new Error("Not a valid ban preset format.");

        const settings = JSON.parse(localStorage.getItem(("BME_BAN_PAGE_SETTINGS")));

        const expected = new Set(["name", "color", "server", "banList", "reason", "duration"]);
        for (const preset of json) {
            const keys = Object.keys(preset);
            if (keys.length !== expected.size) throw new Error("Not a valid ban preset format.");
            if (!keys.every(key => expected.has(key))) throw new Error("Not a valid ban preset format.");

            settings.presets.items.push(preset);
        }
        localStorage.setItem("BME_BAN_PAGE_SETTINGS", JSON.stringify(settings));

        const currentPresets = document.getElementById("bme-ban-presets-showcase");
        if (!currentPresets) throw new Error("BM-EXTRA: Failed to load currentPresets");

        currentPresets.innerHTML = "";
        currentPresets.appendChild(getCurrentPresetsShowcase(settings));
    } catch (error) {
        console.log(error);
        const msg = document.getElementById("bme-ie-status-text");
        msg.innerText = `Failed to parse file content to a JSON object.`;
        return 1;
    }
}
function exportButtonPressed() {
    const banSettings = JSON.parse(localStorage.getItem("BME_BAN_PAGE_SETTINGS"));
    const presets = banSettings.presets.items;

    let message = null;
    if (presets.length === 0) {
        message = "You have no presets to export."
    } else {
        browser.runtime.sendMessage({
            type: "BME_JSON_DOWNLOAD",
            filename: "banPresets.json",
            data: presets
        });
        message = `${presets.length} ban presets were exported.`
    }

    if (!message) return;
    const msg = document.getElementById("bme-ie-status-text");
    msg.innerText = message;
}