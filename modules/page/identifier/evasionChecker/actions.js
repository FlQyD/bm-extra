import { getAuthToken } from "../../../misc.js";
import { checkPlayer } from "./check.js";
import { getEcSettings } from "./panel.js";

export async function loadPlayersPressed(e, autoStart = false) {
    const btn = e.target

    if (!isButtonUseable(btn)) return;
    btn.classList.add("bme-ec-inactive")

    const modeChanger = document.getElementById("bme-ec-load-mode-changer");
    const text = modeChanger.innerText;
    const labels = JSON.parse(modeChanger.dataset.labels);
    const index = labels.findIndex(item => item === text);
    const current = modeChanger.dataset.used.split("|");
    current[index] = 1;

    modeChanger.classList.add("bme-ec-used", "bme-ec-inactive");

    const loadPlayers = loadPlayersHub(text.toLowerCase());

    modeChanger.classList.remove("bme-ec-inactive");
    if (loadPlayers) {
        modeChanger.dataset.used = current.join("|");
    } else {
        modeChanger.classList.remove("bme-ec-used");
        btn.classList.remove("bme-ec-inactive")
    }

    if (autoStart) {
        await new Promise(r => { setTimeout(r, 100); })
        const checkButton = document.getElementById("bme-ec-check-button")
        const event = { target: checkButton };
        checkPlayersPressed(event);
    }
}
async function loadPlayersHub(type) {
    const bmId = window.location.href.split("/")[5];

    const authToken = await getAuthToken();

    if (!authToken) {
        sendMessage("Missing authToken!")
        console.error("BM-EXTRA: Missing authToken!")
        return false;
    }

    if (type === "normal") return loadPlayers(bmId, authToken, true);
    if (type === "inclusive") return loadPlayers(bmId, authToken, false);
    if (type === "thorough") return loadPlayersThorough(bmId, authToken, false);

    return false
}
async function loadPlayers(bmId, authToken, ignoreVpns) {
    const { status, players, identifiers } = await getRelatedPlayers(bmId, authToken)
    if (status !== 200) {
        sendMessage(`Failed to fetch related players, try again. | Status: ${status}`);
        return false;
    }

    let loadedPlayers = [];

    for (const identifier of identifiers) {
        const meta = identifier.meta;
        if (ignoreVpns && (meta.datacenter || meta.proxy || meta.tor)) continue;

        identifier.players.forEach(player => {
            if (loadedPlayers.includes(player)) return;

            loadedPlayers.push(player)
        })
    }

    loadedPlayers = loadedPlayers.map(player => {
        const obj = players.get(player);
        if (obj) return obj;
        return { id: player, name: player }
    })

    setupPlayersForCheck(loadedPlayers)
    return true;
}
async function loadPlayersThorough(bmId, authToken, ignoreVpns) {
    const { status, players } = await getRelatedPlayers(bmId, authToken)
    if (status !== 200) {
        sendMessage(`Failed to fetch related players, try again. | Status: ${status}`);
        return false;
    }

    const loadedPlayers = [];
    players.forEach((value, key) => {
        loadedPlayers.push(value)
    });

    setupPlayersForCheck(loadedPlayers)
    return true;
}

const relatedPlayerCache = {};
async function getRelatedPlayers(bmId, token) {
    if (relatedPlayerCache[bmId]) return relatedPlayerCache[bmId];
    //Return from short cache if stored

    const data = await fetchRelatedPlayers(`https://api.battlemetrics.com/players/${bmId}/relationships/related-identifiers?&filter[matchIdentifiers]=ip&filter[identifiers]=ip&include=player&page[size]=100`, token);
    if (data.status !== 200){
        sendMessage("Failed to fetch related players.")
        return console.error(`BM-EXTRA: Failed to fetch related players. | ${bmId} | ${data.status}`);
    } 

    const players = new Map();
    data.included.forEach(item => {
        if (item.type !== "player") return;

        players.set(item.id, { id: item.id, name: item?.attributes?.name || item.id });
    });

    const identifiers = data.data.map(item => {
        if (item.attributes?.type !== "ip") return null;
        return {
            meta: item.attributes?.metadata?.connectionInfo,
            players: item.relationships?.relatedPlayers?.data.map(player => {
                if (player.type !== "player") return null;
                return player.id;
            }).filter(player => player)
        }
    });

    const returnObject = { status: 200, players, identifiers };
    relatedPlayerCache[bmId] = returnObject; //Cache it for later use
    return returnObject;
}
async function fetchRelatedPlayers(url, token, count = 0) {
    if (count > 2) return { status: null };
    try {
        const resp = await fetch(`${url}&access_token=${token}`);
        if (resp?.status === 429) {
            await new Promise(r => { setTimeout(r, 10000) });
            throw new Error(`Rate Limit reached while requesting related identifiers for ${bmId} | Status: ${resp.status}`);
        }
        if (resp?.status !== 200) throw new Error(`Failed to fetch | Status : ${resp?.status || 0}`);

        const data = await resp.json();
        data.status = resp.status;
        if (data.links?.next) {
            const nextPage = await fetchRelatedPlayers(data.links.next, token);
            data.data.push(...nextPage.data);
            data.included.push(...nextPage.included);
        }

        return data;
    } catch (error) {
        sendMessage(`BM-EXTRA: ${error}`);
        return fetchRelatedPlayers(url, token, count + 1);
    }
}

function setupPlayersForCheck(players) {
    const container = document.getElementById("bme-ec-players-container");
    const alreadyLoaded = Array.from(container.childNodes).map(item => item.dataset.id);

    const playerElements = [];
    for (const player of players) {
        if (alreadyLoaded.includes(player.id)) continue;

        const element = getPlayerElement(player);
        playerElements.push(element);
    }
    container.append(...playerElements);

    const title = document.getElementById("bme-ec-players-title");
    title.innerText = `Loaded Players(${Array.from(container.childNodes).length})`;


    if (players.length === 0) sendMessage(`Couldn't find any players.`);
    else sendEcMessage(`${players.length} player(s) found, ${playerElements.length} of them are added.`);
}
function getPlayerElement(player) {
    const element = document.createElement("div");
    element.dataset.id = player.id;
    element.classList.add("bme-ec-player", "bme-ec-unchecked");
    colorPlayer(element, "unchecked")

    const details = document.createElement("img");
    details.src = browser.runtime.getURL('assets/img/open.png');
    details.classList.add("bme-ec-player-details")
    details.id = `bme-ec-player-details-${player.id}`;

    const name = document.createElement("a");
    name.target = "_blank";
    name.href = `https://www.battlemetrics.com/rcon/players/${player.id}`;
    name.innerText = player.name;

    const statLine = document.createElement("span");
    statLine.classList.add("bme-ec-stat-line")
    statLine.id = `bme-ec-player-stat-line-${player.id}`;

    const banLine = document.createElement("span");
    banLine.classList.add("bme-ec-ban-line")
    banLine.id = `bme-ec-player-ban-line-${player.id}`;

    element.append(details, name, statLine, banLine)
    return element;
}

export async function checkPlayersPressed(e) {
    const btn = e.target;    
    if (!isButtonUseable(btn)) return;

    const buttons = [btn];

    const loadButton = document.getElementById("bme-ec-load-button");
    if (!loadButton.classList.contains("bme-ec-inactive")) buttons.push(loadButton);

    const modeChanger = document.getElementById("bme-ec-load-mode-changer")
    if (!modeChanger.classList.contains("bme-ec-inactive")) buttons.push(modeChanger);

    const failed = Array.from(document.getElementsByClassName("bme-ec-failed"));
    failed.forEach(item => {
        item.classList.remove("bme-ec-failed");
        item.classList.add("bme-ec-unchecked");
        colorPlayer(item, "unchecked")
    })

    const orgChanger = document.getElementById("bme-ec-org-changer");
    orgChanger.disabled = true;

    buttons.forEach(button => button.classList.add("bme-ec-inactive"));

    const check = { org: orgChanger.value }
    const playerPool = Array.from(document.getElementsByClassName("bme-ec-unchecked"));
    const playerCount = playerPool.length;    
    await checkPlayers(playerPool, check);

    sendEcMessage(`${playerCount} player(s) have been checked.`)

    buttons.forEach(button => button.classList.remove("bme-ec-inactive"));
    orgChanger.disabled = false;
    return true;
}

let running = false;
async function checkPlayers(players, check, maxProcess = 5) {
    if (running) return false;
    try {
        running = true;
        const settings = getEcSettings();
        
        let index = 0;
        async function worker() {
            while (index < players.length) {
                const player = players[index++];
                if (!player || !player.isConnected) return;

                await checkPlayer(player, settings, check);
            }
        }

        const workers = Array.from({ length: maxProcess }, () => worker());
        await Promise.all(workers);
        return true;
    } catch (error) {
        return false;
    } finally {
        running = false;
    }
}

export function colorPlayer(player, color) {
    const settings = getEcSettings();
    const colors = settings.color;

    player.style.setProperty("--bg", `${colors[color]}7f`);
    player.style.setProperty("--border", colors[color]);
}
function isButtonUseable(btn) {
    if (!btn) return false;
    if (btn.classList?.contains("bme-ec-used")) return false;
    if (btn.classList?.contains("bme-ec-inactive")) return false;

    return true;
}
function sendMessage(text) {
    const paragraph = document.getElementById("bme-ec-msg");
    paragraph.innerText = text;
}

export async function autoStart(settings) {
    const bmId = window.location.href.split("/")[5];
    const authToken = await getAuthToken();

    const limit = settings.core.autoStartLimit;
    const { status, identifiers } = await getRelatedPlayers(bmId, authToken);
    if (status !== 200) return sendMessage(`Failed to start the process automatically.`);

    const uniquePlayers = [];
    identifiers.forEach(item => {
        item.players.forEach(player => {
            if (uniquePlayers.includes(player)) return;
            uniquePlayers.push(player);
        })
    })

    //Check if autoStart can happen;
    if (uniquePlayers.length > limit) return;

    const loadButton = document.getElementById("bme-ec-load-button");
    const event = { target: loadButton }
    loadPlayersPressed(event, true);
}

function sendEcMessage(msg) {
    const paragraph = document.getElementById("bme-ec-msg");
    if (!paragraph) console.error(`Failed to find message to display: ${msg}`)
    paragraph.innerText = msg;
}