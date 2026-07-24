import { talkToBackgroundScript } from "../../misc.js";
import { getPcCacheSize } from "../../page/cache/cache.js";
import { getSettingsElement, loadPiPerms } from "../settings.js";

export function getApiKeysSettings() {
    const element = document.createElement("div");

    const titleRow = document.createElement("div");
    titleRow.classList.add("bme-flex", "bme-title-row")
    element.appendChild(titleRow);

    const title = document.createElement("h1");
    title.innerText = "API Keys";
    titleRow.appendChild(title);

    const steamKeyElement = getApiKeyDiv("Steam API Key:", "BME_STEAM_API_KEY", "steam-api", {
        detail: `Key can be generated at <a href="https://steamcommunity.com/dev/apikey" target="_blank">Steam Web API</a>.`
    });
    const battleMetricsKeyElements = getApiKeyDiv("BattleMetrics API Key:", "BME_BATTLEMETRICS_API_KEY", "bm-api", {
        detail: "OPTIONAL: Provided key will take priority, but it isn't necessary."
    });
    const piPermsSegment = document.createElement("div");
    piPermsSegment.classList.add("bme-settings-segment");
    const playerInsightApiKeyElement = getApiKeyDiv("Player Insight API Key:", "BME_PLAYER_INSIGHT_API_KEY", "pi-api", {
        segment: piPermsSegment,
    });
    generatePlayerInsightSegment(piPermsSegment);

    const proxyCheckSegment = document.createElement("div")
    proxyCheckSegment.classList.add("bme-settings-segment");
    const proxyCheckApiKeyElement = getApiKeyDiv("Proxycheck API Key:", "BME_PROXY_CHECK_API_KEY", "proxy-check", {
        segment: proxyCheckSegment,
        detail: `Key can be generated at <a href="https://proxycheck.io/" target="_blank">proxycheck.io</a>.`
    });


    const bucket = "BME_PROXY_CHECK_SETTINGS";
    const settings = JSON.parse(localStorage.getItem(bucket));

    const maxIps = getSettingsElement(
        "number", "Maximum IPs",
        "The maximum number of IPs to request for one player",
        null, bucket, "maxIps", settings.maxIps
    )

    const pcIpDurations = [
        { display: "Last 1 day", value: 86400000 },
        { display: "Last 15 days", value: 1296000000 },
        { display: "Last 1 Month", value: 2592000000 },
        { display: "Last 2 Months", value: 5184000000 },
        { display: "Last 3 Months", value: 7776000000 },
        { display: "Last Year", value: 31536000000 },
        { display: "Forever", value: -1 },
    ]
    const checkIpsNewerThan = getSettingsElement(
        "select", "Recent IPs",
        "Only check IPs that have been used in the selected time period",
        null, bucket, "checkAfter", settings.checkAfter, { options: pcIpDurations }
    )

    const ignoreKnownVpns = getSettingsElement(
        "toggle", "Ignore Known VPNs",
        "Do not request known VPNs from proxycheck.io",
        null, bucket, "ignoreKnownVpns", settings.ignoreKnownVpns
    )

    const currentCacheSize = getPcCacheSize();
    const keepCache = getSettingsElement(
        "toggle", "Keep Cache",
        `Keep proxycheck data for 24 hours, in order if you reopen a player don't waste resources with requesting the unnecessary data again. Your current cache has ${currentCacheSize} items.`,
        null, bucket, "keepCache", settings.keepCache
    )

    proxyCheckSegment.append(
        maxIps, checkIpsNewerThan, ignoreKnownVpns, keepCache,
    );

    element.append(
        steamKeyElement, battleMetricsKeyElements, playerInsightApiKeyElement,
        piPermsSegment, proxyCheckApiKeyElement, proxyCheckSegment,
        getSmUpdater()
    );

    return element;
}
function generatePlayerInsightSegment(segment) {
    const perms = JSON.parse(localStorage.getItem("BME_PLAYER_INSIGHT_PERMS"))?.perms || [];
    const p = document.createElement("p")

    p.innerHTML += `<span class="bme-settings-text-${perms.includes("steamFriends") ? "green" : "red"}">Historic Friends</span> | `;
    p.innerHTML += `<span class="bme-settings-text-${perms.includes("steamAvatars") ? "green" : "red"}">Historic Avatars</span> | `;
    p.innerHTML += `<span class="bme-settings-text-${perms.includes("steamBans") ? "green" : "red"}">Public Bans</span> | `;
    p.innerHTML += `<span class="bme-settings-text-${perms.includes("steamLinks") ? "green" : "red"}">Steam Links</span> | `;
    p.innerHTML += `<span class="bme-settings-text-${perms.includes("discordUser") ? "green" : "red"}">Discord Data</span>`;

    segment.innerHTML = "";
    segment.append(p);
}
//segment 
function getApiKeyDiv(titleText, storageName, id, meta) {
    const container = document.createElement("div");
    container.classList.add("bme-settings-key-container")

    const title = document.createElement("h3")
    title.innerText = titleText;
    container.appendChild(title)

    const detail = document.createElement("p");
    detail.id = `${id}-key-detail`;
    detail.classList.add("bme-key-settings-detail");
    detail.innerText = "Loading...";
    insertKey(detail, storageName, meta);
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

    updateButton.addEventListener("click", async e => {
        const input = document.getElementById(`${id}-key-input`);
        let newKey = input.value;
        input.value = "";

        browser.storage.local.set({ [storageName]: newKey });
        _keys[storageName] = newKey;

        if (storageName === "BME_PLAYER_INSIGHT_API_KEY") {
            await loadPiPerms();
            generatePlayerInsightSegment(meta.segment)
        }

        const detailItem = document.getElementById(`${id}-key-detail`);
        insertKey(detailItem, "N/A", meta, newKey);
    })

    if (meta?.detail) {
        const detail = document.createElement("p")
        detail.classList.add("bme-key-settings-detail")
        detail.innerHTML = meta.detail;
        container.appendChild(detail);
    }

    return container;
}
function changeButton(color, btn, time = 400) {
    btn.classList.add("bm-btn");

    btn.classList.add(`bme-btn-${color}`);
    setTimeout(() => {
        btn.classList.remove(`bme-btn-${color}`);
    }, time);
}
async function insertKey(detail, storageName, meta, key) {
    if (key === undefined) key = await getKey(storageName)

    detail.innerText = key ? `Your key starts with: ${key.substring(0, 10)}...` : "You have no key saved yet.";

    if (!meta?.segment) return;
    if (key) meta.segment.classList.remove("bme-inactive-segment");
    else meta.segment.classList.add("bme-inactive-segment");
}

function getSmUpdater() {
    const element = document.createElement("div");
    element.classList.add("bme-sm-settings-updater")

    const title = document.createElement("h2");
    title.innerText = "Stored Streamer Mode Names:";
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
    } catch (error) { };

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




const _keys = {};
export async function getKey(storageName) {    
    try {
        if (_keys[storageName] !== undefined) return _keys[storageName];

        let key = await loadKey(storageName);
        _keys[storageName] = key ?? "";
        return key ?? null;
    } catch (error) {        
        return await loadKey(storageName);
    }
}
async function loadKey(storageName) {
    let key = await browser.storage.local.get(storageName);
    key = key[storageName];
    return key;
}