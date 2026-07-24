export function checkGeneralSettings() {
    try {
        const settings = JSON.parse(localStorage.getItem("BME_GENERAL_SETTINGS"));
        if (!settings || typeof (settings) !== "object") throw new Error("Settings error");
        if (typeof (settings.locale) !== "string") throw new Error("Settings error");
    } catch (error) {
        const defaultSettings = getDefaultGeneralSettings();
        localStorage.setItem("BME_GENERAL_SETTINGS", JSON.stringify(defaultSettings));
    }
}
export function getDefaultGeneralSettings() {
    const settings = {};
    settings.locale = "auto";

    return settings;
}
