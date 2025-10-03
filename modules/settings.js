const menuPoints = ["Settings", "Identifier", "BM Information"];


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
    
}

function getOverViewSettings() {
    const settings = JSON.parse(localStorage.getItem("BME_MAIN_SETTINGS"))
    console.log(settings);
    
    const element = document.createElement("div");
    const title = document.createElement("h1");
    title.innerText = "Main Settings";
    element.appendChild(title);

    const showAvatarRow = getMainSettingsInputRowElement(settings, "showAvatar", "Show Avatar", "Shows the players avatar when it's available next to his name.");
    element.appendChild(showAvatarRow);

    const showInfoPanel = getMainSettingsInputRowElement(settings, "showInfoPanel", "Show BM Information", "Shows detailed information that is stored by battlemetrics and usually not visible by default.");
    element.appendChild(showInfoPanel);
    
    const removeSteamInfo = getMainSettingsInputRowElement(settings, "removeSteamInfo", "Remove Steam Information", "Remove the default Steam information panel from the battlemetrics RCON profile when it appears.");
    element.appendChild(removeSteamInfo);

    const showServer = getMainSettingsInputRowElement(settings, "showServer", "Show server", "Show the either the current or the last server the user has played on, as well as displaying connection details.");
    element.appendChild(showServer);

    const closeAdminLog = getMainSettingsInputRowElement(settings, "closeAdminLog", "Close Admin Log", "Close admin log by default when opening a battlemetrics profile.");
    element.appendChild(closeAdminLog);

    return element;
}

function switchMainSettingsTo(id, value) {
    console.log(id, value);
    
    const settings = JSON.parse(localStorage.getItem("BME_MAIN_SETTINGS"))

    settings[id] = value;

    console.log(settings);
    localStorage.setItem("BME_MAIN_SETTINGS", JSON.stringify(settings));
}

function getMainSettingsInputRowElement(settings, settingsName, settingsTitle, description) {
    const row = document.createElement("div");
    row.className = "bme-settings-row";

    const firstRow = document.createElement("div");

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = settings[settingsName];
    firstRow.appendChild(input);

    input.addEventListener("change", e => {switchMainSettingsTo(settingsName, e.target.checked)})

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
