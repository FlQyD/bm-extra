import { getLocale, makeDropDownMenu } from "../../../misc.js";
import { getPercentage } from "./check.js";

export async function showcaseDetails(main, player, outcome, settings) {
    const showcase = getShowcaseElement(main, player, outcome, settings);
    document.body.append(showcase);

    showcase.offsetWidth;
    showcase.classList.add("bme-ec-showcase-visible");
}
function getShowcaseElement(main, player, outcome, settings) {
    const showcase = document.createElement("div")
    showcase.id = "bme-ec-showcase";
    const color = settings.color[outcome.color]
    showcase.style.setProperty("--bg", `${color}45`);
    showcase.style.setProperty("--border", color);

    showcase.addEventListener("click", e => {
        const target = e.target;
        if (target.id !== "bme-ec-showcase") return;

        target.classList.remove("bme-ec-showcase-visible");
        setTimeout(() => { target.remove(); }, 400);
    })

    const container = getShowcaseContainer(main, player, outcome, settings)
    showcase.append(container)

    return showcase;
}
function getShowcaseContainer(main, player, outcome, settings) {
    const container = document.createElement("div");
    container.id = "bme-showcase-container";

    const header = getHeader(main, player)

    const nameSection = getNameSection(main, player, outcome);
    //const sessionsSection = getSessionSection(main, player, outcome);

    container.append(header, nameSection, /*sessionsSection*/);
    return container;
}
function getHeader(main, player) {
    const header = document.createElement("div");
    header.classList.add("bme-flex");
    header.id = "bme-showcase-header"

    const mainProfile = getHeaderProfile(main);
    const divider = getDivider();
    const playerProfile = getHeaderProfile(player)

    header.append(mainProfile, divider, playerProfile);
    return header;
    function getHeaderProfile(player) {
        const profile = document.createElement("div");
        profile.classList.add("bme-showcase-profile-header")

        const avatarUrl = player.account.avatarUrl;
        const name = player.account.name;
        const steamId = player.account?.steamId?.identifier || null;
        const bmId = player.account.bmId;

        const bmAccountAge = player.account.firstSeen;
        const hours = getBmHours(player.account.servers);

        const bans = []
        if (player.bans[0]) bans.push(player.bans[0].timestamp);
        if (player.account?.steamId?.rustBans?.banned)
            bans.push(player.account.steamId.rustBans.lastBan)

        const lastBanTimestamp = Math.max(...bans, 0);

        const isServerBanned = Boolean(player.bans[0]);
        const isGameBanned = Boolean(player.account?.steamId?.rustBans?.banned);
        const lastBan = lastBanTimestamp === 0 ? "Not Banned" : `${getShowCaseTimeString(lastBanTimestamp)} ago`;

        const html = `
        <div class="bme-header-profile"> 
            <div class="bme-showcase-first-line">
                <img id="bme-sc-avatar">
                <div>
                    <p id="bme-sc-name">NAME_PLACEHOLDER</p>
                    <div>
                        <a target="_blank" href="${`https://www.battlemetrics.com/rcon/players/${bmId}`}">BM Profile</a>
                        ${steamId ?
                `<a target="_blank" href="${`https://steamcommunity.com/profiles/${steamId}`}">Steam Profile</a>` :
                `<p>Steam Profile</p>`
            }
                    </div>
                </div>
            </div>
            <div class="bme-showcase-header-details">
                <p>BM Account Age: ${getShowCaseTimeString(bmAccountAge)}</p>
                <p>BM Hours: ${hours} hours</p>
                <div class="bme-flex">
                    <p>Last ban: ${lastBan}</p>
                    ${isGameBanned ?
                `<img title="Currently Rust Game Banned" src="${browser.runtime.getURL('/assets/img/eac-banned.png')}">` :
                `<img title="Not Game Banned" src="${browser.runtime.getURL('/assets/img/not-eac-banned.png')}">`
            }
                    ${isServerBanned ?
                `<img title="Server Banned" src="${browser.runtime.getURL('/assets/img/server-banned.png')}">` :
                `<img title="Not Server Banned" src="${browser.runtime.getURL('/assets/img/not-server-banned.png')}">`
            }
                </div>
            </div>
        </div>
        `
        profile.innerHTML = html;
        
        const nameElement = profile.querySelector("#bme-sc-name");
        nameElement.innerText = name;

        const avatarElement = profile.querySelector("#bme-sc-avatar");
        avatarElement.src = avatarUrl;
        
        return profile;

        function getBmHours(servers) {
            let timePlayed = 0;

            servers.forEach(server => { timePlayed += server.timePlayed });
            return Math.floor(timePlayed / 60 / 60);
        }

    }
}
function getNameSection(main, player, outcome) {
    const nameSection = document.createElement("div");

    const body = getNameSectionBody(main, player);
    const header = getNameSectionHeader(outcome, body);

    nameSection.append(header, body)
    return nameSection;

    function getNameSectionHeader(outcome, body) {
        const header = document.createElement("div");
        header.classList.add("bme-showcase-section-header")

        header.innerHTML = `
            <p>Name match: ${outcome.maxNameMatch}%</p>
            <img src="${browser.runtime.getURL('/assets/img/arrow.png')}">
        `;

        header.addEventListener("click", e => {
            let target = e.target;
            let count = 0;
            while (true) {
                count++;
                if (count > 5) return

                if (target.classList.contains("bme-showcase-section-header")) break;
                target = target.parentNode;
            }

            if (target.classList.contains("active-section")) {
                target.classList.remove("active-section");
                body.style.setProperty("--height", `0px`);
                body.style.setProperty("--size", `0px`);
                return;
            }

            recalculateNameSectionBodyHeight(target.parentNode.lastChild);
            target.classList.add("active-section");
        })
        return header;
    }
    function recalculateNameSectionBodyHeight(body) {
        let height = 0;

        const sections = Array.from(body.querySelectorAll(".showcase-name-container"));
        sections.forEach(section => {
            const current = Array.from(section.children).length;
            if (height < current * 50) height = current * 50;
        })

        body.style.setProperty("--height", `${height}px`);
        body.style.setProperty("--size", `2px`);
    }
    function getNameSectionBody(main, player) {
        const body = document.createElement("div");
        body.id = "bme-showcase-section-body";
        body.style.setProperty("--height", `0px`);

        const mainNames = main.account.identifiers.names;
        const playerNames = player.account.identifiers.names;

        prepareMaxNameMatches(mainNames, playerNames)
        prepareMaxNameMatches(playerNames, mainNames)

        const names = {
            main: mainNames,
            player: playerNames
        }

        const mainNamesElement = getNameRows(names, "main", true, 0);
        const playerNamesElement = getNameRows(names, "player", true, 0);
        const divider = getDivider();

        body.append(mainNamesElement, divider, playerNamesElement);
        return body;
    }
    function prepareMaxNameMatches(arr1, arr2) {
        arr1.forEach(name1 => {
            let max = 0;
            arr2.forEach(name2 => {
                const percentage = getPercentage(name1.identifier, name2.identifier);
                if (percentage > max) max = percentage;
            })
            name1.maxMatch = max;
        })

        arr1.sort((a, b) => b.maxMatch - a.maxMatch);
    }
    function getNameRows(data, type, click, dummyCount) {
        const container = document.createElement("div");
        container.classList.add("showcase-name-container")
        container.id = `${type === "main" ? "main" : "player"}-name-container`

        const names = type === "main" ? data.main : data.player;
        container.style.setProperty("height", `${names.length * 50}px`)

        for (let i = 0; i < dummyCount; i++) {
            const dummyNameElement = getDummyNameElement();
            if (i + 1 === dummyCount) dummyNameElement.classList.add("last-dummy")
            container.append(dummyNameElement);
        }

        names.forEach((name, idx) => {
            const nameElement = getNameElement(name, idx, type, data, click);
            container.append(nameElement)
        })

        return container;
    }
    function getNameElement(name, idx, type, data, click) {
        const element = document.createElement("div");
        element.classList.add("showcase-name-item")

        const details = document.createElement("div")

        const nameElement = document.createElement("p");
        nameElement.innerText = name.identifier;

        const lastSeenElement = document.createElement("p");
        const formatted = new Intl.DateTimeFormat(getLocale(), {
            year: "numeric",
            month: "short",
            day: "2-digit",
        }).format(new Date(name.lastSeen));

        lastSeenElement.innerText = formatted;

        details.append(nameElement, lastSeenElement);

        const percentageWrapper = document.createElement("div");
        const percentageElement = document.createElement("p");
        percentageElement.innerText = `${name.maxMatch}%`;
        percentageWrapper.append(percentageElement);

        element.append(details, percentageWrapper)

        if (!click) {
            element.classList.add("showcase-inactive")
            return element;
        }

        element.addEventListener("click", e => {
            const oppositeType = type === "main" ? "player" : "main";

            const container = document.getElementById(`${oppositeType}-name-container`);

            let target = e.target;
            while (true && target) {
                if (target.classList.contains("showcase-name-item")) break;
                target = target.parentNode;
            }

            const body = document.getElementById("bme-showcase-section-body");

            if (target.id === "bme-showcase-name-active") {
                target.id = "";

                const newContainer = getNameRows(data, oppositeType, true, 0);
                container.replaceWith(newContainer)

                recalculateNameSectionBodyHeight(body);
                return;
            }

            const prevTarget = document.getElementById("bme-showcase-name-active");
            if (prevTarget) prevTarget.id = "";

            target.id = "bme-showcase-name-active";

            const names = data[oppositeType]
                .map(item => {
                    return {
                        identifier: item.identifier,
                        lastSeen: item.lastSeen,
                        maxMatch: getPercentage(item.identifier, name.identifier)
                    }
                })
                .sort((a, b) => b.maxMatch - a.maxMatch);

            const dummyCount = (idx - 1) < 0 ? 0 : idx - 1;
            const newData = JSON.parse(JSON.stringify(data))
            newData[oppositeType] = names;

            const newContainer = getNameRows(newData, oppositeType, false, idx);

            container.replaceWith(newContainer)
            recalculateNameSectionBodyHeight(body);
        })

        return element;
    }
    function getDummyNameElement() {
        const element = document.createElement("div");
        element.classList.add("showcase-dummy-name-item")

        return element;
    }
}
function getSessionSection(main, player, outcome) {
    const element = document.createElement("div");
    const header = getSessionHeader(main, player, outcome);

    element.append(header)
    return element;

    function getSessionHeader() {
        const header = document.createElement("div")
        header.classList.add("bme-showcase-section-header");

        const title = document.createElement("p");
        title.innerText = `Sessions: ${outcome.difference ? getShowCaseTimeString(outcome.difference, true) : "N/A"}`

        header.append(title)
        return header;
    }
}


function getDivider() {
    const div = document.createElement("div");
    div.classList.add("bme-showcase-divider")
    return div;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
export function getShowCaseTimeString(timestamp, short, isDuration) {
    const since = isDuration ? timestamp : Date.now() - timestamp;

    if (short) {
        if (since > DAY) return `${Math.floor(since / DAY)}d`;
        if (since > HOUR) return `${Math.floor(since / HOUR)}h`;
        if (since > MINUTE) return `${Math.floor(since / MINUTE)}m`;
        if (since > SECOND) return `${Math.floor(since / SECOND)}s`;
        return `0s`
    }

    if (since > DAY) return plural(since / DAY, "day");
    if (since > HOUR) return plural(since / HOUR, "hour");
    if (since > MINUTE) return plural(since / MINUTE, "minute");
    if (since > SECOND) return plural(since / MINUTE, "second");
    return `${since} ms`;
}
function plural(value, unit) {
    value = Math.floor(value);

    if (value <= 1) return `${value} ${unit}`;
    return `${value} ${unit}s`;
}