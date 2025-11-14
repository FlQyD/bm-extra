console.log("Service worker loaded!")

/**
 * apiKey - API KEY REGARDLESS OF THE SERVICE
 * subject - steam ID
 */
chrome.runtime.onMessage.addListener(async (request, sender) => {
    if (!request.type.startsWith("BME_")) return;
    console.log(`${request.type.padEnd(30)} | ${request.apiKey.substring(0, 10)} | ${request.subject.includes(",") ? `Account count: ${request.subject.split(",").length}` : request.subject}`); 
    
    /**
     * returnObject:
     * type: original type +"_RESOLVED"
     * status: "OK" | "ERROR"
     * value: the outcome of the request or the error object
     */
    const returnObject = { type: `${request.type}_RESOLVED` }
    if (request.type === "BME_STEAM_FRIENDLIST") return sendFriendlistFromSteam(request.subject, request.apiKey, sender, returnObject);
    if (request.type === "BME_RUST_API_FRIENDLIST") return sendFriendlistFromRustApi(request.subject, request.apiKey, sender, returnObject)
    if (request.type.startsWith("BME_PLAYER_SUMMARIES")) return sendSteamPlayerSummaries(request.subject, request.apiKey, sender, returnObject);
    if (request.type.startsWith("BME_BAN_SUMMARIES")) return sendSteamPlayerBanSummaries(request.subject, request.apiKey, sender, returnObject);
})

async function sendFriendlistFromSteam(steamId, apiKey, sender, returnObject) {
    try {
        const resp = await fetch(`https://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=${apiKey}&steamid=${steamId}&relationship=friend`);
        if (resp?.status !== 200 && resp.status !== 401) throw new Error(`Failed to request steam friends of ${steamId} with the key that starts: ${apiKey.substring(0, 10)} | Status: ${resp?.status}`)

        const data = await resp.json();
        returnObject.status = "OK";
        if (resp.status === 401) {
            returnObject.value = "Private";
        } else {
            returnObject.value = data.friendslist.friends.map(item => {
                return {
                    steamId: item.steamid,
                    since: item.friend_since,
                }
            })
        }
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    } catch (error) {
        console.error(error);
        returnObject.status = "ERROR";
        returnObject.value = error;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    }
}
async function sendFriendlistFromRustApi(steamId, apiKey, sender, returnObject) {
    try {
        const resp = await fetch(`https://rust-api.flqyd.dev/steamFriends/${steamId}?accessToken=${apiKey}`);
        if (resp?.status !== 200) throw new Error(`Request Failed | steamId: ${steamId} | API KEY: ${apiKey.substring(0, 10)}... | Status: ${resp?.status}`)

        const data = await resp.json();
        returnObject.status = "OK";
        returnObject.value = data.data.friends;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    } catch (error) {
        console.error(error);
        returnObject.status = "ERROR";
        returnObject.value = error;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    }

}
async function sendSteamPlayerSummaries(steamIds, API_KEY, sender, returnObject) {
    try {
        const resp = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${API_KEY}&steamids=${steamIds}`);
        if (resp.status === 429) throw new Error("Rate Limit")
        if (resp.status !== 200) throw new Error("Error while fetching, code: " + resp.status);

        const data = await resp.json();
        returnObject.status = "OK";
        returnObject.value = data.response.players.map(item => {            
            return {
                steamId: item.steamid,
                name: item.personaname,
                avatar: item.avatarhash,
                online: item.personastate,
                inGame: item.gameextrainfo ? item.gameextrainfo : "Not playing",
                setup: item.profilestate ? true : false,
            }
        });
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    } catch (error) {
        console.error(error);
        returnObject.status = "ERROR";
        returnObject.value = error;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    }
}
async function sendSteamPlayerBanSummaries(steamIds, API_KEY, sender, returnObject) {
    try {
        const resp = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${API_KEY}&steamids=${steamIds}`);
        if (resp.status !== 200) throw new Error("Error while fetching, code: " + resp.status);

        const data = await resp.json();
        returnObject.status === "OK";
        returnObject.value = data.players.map(item => {
            return {
                steamId: item.SteamId,
                daysSinceLastBan: item.DaysSinceLastBan,
                gameBanCount: item.NumberOfGameBans,
                vacBanCount: item.NumberOfVACBans,
                vacBanStatus: item.VACBanned,
            }
        })
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    } catch (error) {
        console.error(error);
        returnObject.status = "ERROR";
        returnObject.value = error;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    }
}