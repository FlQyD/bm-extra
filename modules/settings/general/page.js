import { getAutoLocale, getLocaleTags } from "../../misc.js";
import { getResetButton, getSettingsElement } from "../settings.js";

export function getGeneralSettings() {
    const element = document.createElement("div");

    const titleRow = document.createElement("div");
    titleRow.classList.add("bme-flex", "bme-title-row")
    element.appendChild(titleRow);

    const title = document.createElement("h1");
    title.innerText = "General";
    titleRow.appendChild(title);

    element.append(titleRow)
    const bucket = "BME_GENERAL_SETTINGS";
    const settings = JSON.parse(localStorage.getItem(bucket));

    const locale = getSettingsElement(
        "select", "Locale",
        "Sets how dates and times are formatted. Automatic picks it based on your timezone. Reload the page to apply.",
        null, bucket, "locale", settings.locale, { options: getLocaleOptions() }
    )

    const resetButton = getResetButton("bm-general")
    element.append(locale, resetButton)

    return element
}
function getLocaleOptions() {
    const displayNames = new Intl.DisplayNames(["en"], { type: "language" });

    const options = getLocaleTags()
        .map(tag => ({ value: tag, display: displayNames.of(tag) }))
        .sort((a, b) => a.display.localeCompare(b.display));

    options.unshift({ value: "auto", display: `Automatic (${getAutoLocale()})` });
    return options;
}
