import { talkToBackgroundScript } from "../../misc.js";

export const organizations = [];

class Atlas {
    id = "41737";

    static {
        organizations.push(new this());
    }

    async getTeamInfo(steamId, serverId, token, count = 0) {
        if (count > 2) return "error";
        try {

            const resp = await fetch(`https://api.battlemetrics.com/servers/${serverId}/command`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "Accept-Version": "^0.1.0"
                },
                body: JSON.stringify({
                    data: {
                        attributes: {
                            command: "c46e957a-54d8-497c-81ec-c2dcef2cd7e2",
                            options: {
                                player: steamId,
                            }
                        },
                        type: "rconCommand"
                    }
                })
            })
            if (resp?.status === 202) throw new Error("Re-try! Not ready yet. | S: 202");
            if (resp?.status !== 200) {
                console.error(`Failed to fetch | S: ${resp?.status}`);
                return "error";
            }

            const data = await resp.json();
            const result = data?.data?.attributes?.result[0]?.children[1]?.children[0]?.children[0]?.reference.result;
            if (!result) {
                console.error(`Failed to request teaminfo | Status: ${resp.status} | Result: ${result}`);
                return "error";
            }

            return result;
        } catch (error) {
            console.error(`Failed to request teaminfo: ${error}`);
            await this.getTeamInfo(steamId, serverId, token, count + 1)
        }
    }
}

// Old implementation, only works for full admins
class BestRust {
    id = "18611";

    static {
        organizations.push(new this());
    }

    async getTeamInfo(steamId, serverId, token) {
        const resp = await fetch(`https://api.battlemetrics.com/servers/${serverId}/command`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Accept-Version": "^0.1.0"
            },
            body: JSON.stringify({
                data: {
                    type: "rconCommand",
                    attributes: {
                        command: "edb0be86-6f5e-4e4b-a655-5fcecd4af11f",
                        options: {
                            command: "teaminfo",
                            steamid: steamId,
                            format: " "
                        }
                    }
                }
            })
        })

        if (resp.status !== 200) {
            console.error(`Failed to request teaminfo | Status: ${resp.status}`);
            return "error";
        }

        const data = await resp.json();

        const result = data.data?.attributes?.result[0]?.children[1]?.children[0]?.children[0]?.reference.result
        if (!result) {
            console.error(`Failed to request teaminfo | Status: ${resp.status} | Result: ${result}`);
            return "error";
        }

        return result;
    }
}

// New implementation, works for both full admins and trial admins.
// Commented out for now to re-add old implementation, as this method of getting rconRoles has been patched by recent BM changes (storeBootstrap encryption).
/*class BestRust {
    id = "18611";

    static {
        organizations.push(new this());
    }

    async getTeamInfo(steamId, serverId, token) {
        const roles = JSON.parse(document.getElementById("storeBootstrap").innerText)?.state?.account?.rconRoles;
        const brRoles = roles.filter(role => role.org_id === this.id);

        const triggers = [];
        brRoles.forEach(role => {
            for (const trigger in role.permissions.triggers || {}) triggers.push(trigger)
        })

        const payload = getBrPayload(triggers, steamId);
        const resp = await fetch(`https://api.battlemetrics.com/servers/${serverId}/command`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Accept-Version": "^0.1.0"
            },
            body: JSON.stringify({
                data: payload,
            })
        })

        if (resp.status !== 200) {
            console.error(`Failed to request teaminfo | Status: ${resp.status}`);
            return "error";
        }

        const data = await resp.json();

        const result = data.data?.attributes?.result[0]?.children[1]?.children[0]?.children[0]?.reference.result
        if (!result) {
            console.error(`Failed to request teaminfo | Status: ${resp.status} | Result: ${result}`);
            return "error";
        }

        return result;

        function getBrPayload(triggers, steamId) {
            if (triggers.includes("edb0be86-6f5e-4e4b-a655-5fcecd4af11f")) {
                return {
                    type: "rconCommand",
                    attributes: {
                        command: "edb0be86-6f5e-4e4b-a655-5fcecd4af11f",
                        options: {
                            command: "teaminfo",
                            steamid: steamId,
                            format: " "
                        }
                    }
                }
            } else if (triggers.includes("4cc932cc-8a86-440f-95aa-d8d99a8ac6ec")) {
                return {
                    type: "rconCommand",
                    attributes: {
                        command: "4cc932cc-8a86-440f-95aa-d8d99a8ac6ec",
                        options: {
                            command: "teaminfo",
                            steamid: steamId,
                        }
                    }
                }

            }
        }
    }
}*/

class BattleZone {
    id = "29251";

    static {
        organizations.push(new this());
    }

    async getTeamInfo(steamId, serverId, token) {
        const resp = await fetch(`https://api.battlemetrics.com/servers/${serverId}/command`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Accept-Version": "^0.1.0"
            },
            body: JSON.stringify({
                data: {
                    type: "rconCommand",
                    attributes: {
                        command: "raw",
                        options: {
                            raw: `teaminfo ${steamId}`
                        }
                    }
                }
            })
        })

        if (resp.status !== 200) {
            console.error(`Failed to request teaminfo | Status: ${resp.status}`);
            return "error";
        }

        const data = await resp.json();
        const result = data.data?.attributes?.result
        if (!result) {
            console.error(`Failed to request teaminfo | Status: ${resp.status} | Result: ${result}`);
            return "error";
        }

        return result;
    }
}

class FalconNetwork {
    id = "110187";

    static {
        organizations.push(new this());
    }

    async getTeamInfo(steamId, serverId, token) {
        const resp = await fetch(`https://api.battlemetrics.com/servers/${serverId}/command`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Accept-Version": "^0.1.0"
            },
            body: JSON.stringify({
                data: {
                    type: "rconCommand",
                    attributes: {
                        command: "41b418ed-552b-4dbe-9955-29cdbdd2db01",
                        options: {
                            type: "teaminfo",
                            steamid: steamId
                        }
                    }
                }
            })
        })

        if (resp.status !== 200) {
            console.error(`Failed to request teaminfo | Status: ${resp.status}`);
            return "error";
        }

        const data = await resp.json();
        const result = data.data?.attributes?.result[0]?.children[1]?.children[0]?.children[0]?.reference.result
        if (!result) {
            console.error(`Failed to request teaminfo | Status: ${resp.status} | Result: ${result}`);
            return "error";
        }

        return result;
    }
}

class Rustix {
    id = "99713";

    static {
        organizations.push(new this());
    }

    async getTeamInfo(steamId, serverId, token) {
        const resp = await fetch(`https://api.battlemetrics.com/servers/${serverId}/command`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Accept-Version": "^0.1.0"
            },
            body: JSON.stringify({
                data: {
                    type: "rconCommand",
                    attributes: {
                        command: "a7fe4768-745b-4118-9ce6-6906479f10ef",
                        options: {
                            type: "teaminfo",
                            steamid: steamId
                        }
                    }
                }
            })
        })

        if (resp.status !== 200) {
            console.error(`Failed to request teaminfo | Status: ${resp.status}`);
            return "error";
        }

        const data = await resp.json();
        const result = data.data?.attributes?.result[0]?.children[1]?.children[0]?.children[0]?.reference.result
        if (!result) {
            console.error(`Failed to request teaminfo | Status: ${resp.status} | Result: ${result}`);
            return "error";
        }

        return result;
    }
}

class RustLands {
    id = "59930";

    static {
        organizations.push(new this());
    }

    async getTeamInfo(steamId, serverId, token) {
        const resp = await fetch(`https://api.battlemetrics.com/servers/${serverId}/command`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Accept-Version": "^0.1.0"
            },
            body: JSON.stringify({
                data: {
                    type: "rconCommand",
                    attributes: {
                        command: "6fb3538a-243e-4310-9468-db272ce5b20a",
                        options: {
                            type: "teaminfo",
                            steamid: steamId
                        }
                    }
                }
            })
        })

        if (resp.status !== 200) {
            console.error(`Failed to request teaminfo | Status: ${resp.status}`);
            return "error";
        }

        const data = await resp.json();
        const result = data.data?.attributes?.result[0]?.children[1]?.children[0]?.children[0]?.reference.result
        if (!result) {
            console.error(`Failed to request teaminfo | Status: ${resp.status} | Result: ${result}`);
            return "error";
        }

        return result;
    }
}

class TrustYourSkill {
    id = "16330";

    static {
        organizations.push(new this());
    }

    async getTeamInfo(steamId, serverId, token) {
        const resp = await fetch(`https://api.battlemetrics.com/servers/${serverId}/command`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Accept-Version": "^0.1.0"
            },
            body: JSON.stringify({
                data: {
                    type: "rconCommand",
                    attributes: {
                        command: "0f24f509-fad4-4205-bb49-c50f9b85bc08",
                        options: {
                            type: "teaminfo",
                            steamid: steamId
                        }
                    }
                }
            })
        })

        if (resp.status !== 200) {
            console.error(`Failed to request teaminfo | Status: ${resp.status}`);
            return "error";
        }

        const data = await resp.json();
        const result = data.data?.attributes?.result[0]?.children[1]?.children[0]?.children[0]?.reference.result
        if (!result) {
            console.error(`Failed to request teaminfo | Status: ${resp.status} | Result: ${result}`);
            return "error";
        }

        return result;
    }
}

class KovacRust {
    id = "126406";

    static {
        organizations.push(new this());
    }

    async getTeamInfo(steamId, serverId, token) {
        const resp = await fetch(`https://api.battlemetrics.com/servers/${serverId}/command`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Accept-Version": "^0.1.0"
            },
            body: JSON.stringify({
                data: {
                    type: "rconCommand",
                    attributes: {
                        command: "36aa8d8a-57e1-45ca-bb21-39705a8e4acd",
                        options: {
                            command: "teaminfo",
                            steamid: steamId
                        }
                    }
                }
            })
        })

        if (resp.status !== 200) {
            console.error(`Failed to request teaminfo | Status: ${resp.status}`);
            return "error";
        }

        const data = await resp.json();
        const result = data.data?.attributes?.result[0]?.children[1]?.children[0]?.children[0]?.reference.result
        if (!result) {
            console.error(`Failed to request teaminfo | Status: ${resp.status} | Result: ${result}`);
            return "error";
        }

        return result;
    }
}

class Hollow {
    id = "17965";

    static {
        organizations.push(new this());
    }

    async getTeamInfo(steamId, serverId, token) {
        const resp = await fetch(`https://api.battlemetrics.com/servers/${serverId}/command`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Accept-Version": "^0.1.0"
            },
            body: JSON.stringify({
                data: {
                    type: "rconCommand",
                    attributes: {
                        command: "0a3eff8d-8abd-4582-8660-6ad52be5afe4",
                        options: {
                            player: steamId
                        }
                    }
                }
            })
        })

        if (resp.status !== 200) {
            console.error(`Failed to request teaminfo | Status: ${resp.status}`);
            return "error";
        }

        const data = await resp.json();
        const result = data.data?.attributes?.result[0]?.children[1]?.children[0]?.children[0]?.reference.result
        if (!result) {
            console.error(`Failed to request teaminfo | Status: ${resp.status} | Result: ${result}`);
            return "error";
        }

        return result;
    }
}

class Ace {
    id = "39868";

    static {
        organizations.push(new this());
    }

    async getTeamInfo(steamId, serverId, token) {
        const resp = await fetch(`https://api.battlemetrics.com/servers/${serverId}/command`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Accept-Version": "^0.1.0"
            },
            body: JSON.stringify({
                data: {
                    type: "rconCommand",
                    attributes: {
                        command: "1eb00812-e89e-497d-bcfa-bcd77dc90d96",
                        options: {
                            player: steamId
                        }
                    }
                }
            })
        })

        if (resp.status !== 200) {
            console.error(`Failed to request teaminfo | Status: ${resp.status}`);
            return "error";
        }

        const data = await resp.json();
        const result = data.data?.attributes?.result[0]?.children[1]?.children[0]?.children[0]?.reference.result
        if (!result) {
            console.error(`Failed to request teaminfo | Status: ${resp.status} | Result: ${result}`);
            return "error";
        }

        return result;
    }
}

class Hive {
    id = "75736";

    static {
        organizations.push(new this());
    }

    async getTeamInfo(steamId, serverId, token) {
        const resp = await fetch(`https://api.battlemetrics.com/servers/${serverId}/command`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Accept-Version": "^0.1.0"
            },
            body: JSON.stringify({
                data: {
                    type: "rconCommand",
                    attributes: {
                        command: "2d689696-94a4-4807-ac64-8f67a78381e7",
                        options: {
                            type: "teaminfo",
                            steamid: steamId
                        }
                    }
                }
            })
        })

        if (resp.status !== 200) {
            console.error(`Failed to request teaminfo | Status: ${resp.status}`);
            return "error";
        }

        const data = await resp.json();
        const result = data.data?.attributes?.result[0]?.children[1]?.children[0]?.children[0]?.reference.result
        if (!result) {
            console.error(`Failed to request teaminfo | Status: ${resp.status} | Result: ${result}`);
            return "error";
        }

        return result;
    }
}

class Gibberish {
    id = "130529";

    static {
        organizations.push(new this());
    }

    async getTeamInfo(steamId, serverId, token) {
        const resp = await fetch(`https://api.battlemetrics.com/servers/${serverId}/command`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Accept-Version": "^0.1.0"
            },
            body: JSON.stringify({
                data: {
                    type: "rconCommand",
                    attributes: {
                        command: "af0cd62d-7ce0-48ad-9d9a-ca74cba7cfed",
                        options: {
                            type: "teaminfo",
                            steamid: steamId
                        }
                    }
                }
            })
        })

        if (resp.status !== 200) {
            console.error(`Failed to request teaminfo | Status: ${resp.status}`);
            return "error";
        }

        const data = await resp.json();
        const result = data.data?.attributes?.result[0]?.children[1]?.children[0]?.children[0]?.reference.result
        if (!result) {
            console.error(`Failed to request teaminfo | Status: ${resp.status} | Result: ${result}`);
            return "error";
        }

        return result;
    }
}

class Pinnacle {
    id = "127229";

    static {
        organizations.push(new this());
    }

    async getTeamInfo(steamId, serverId, token) {
        const resp = await fetch(`https://api.battlemetrics.com/servers/${serverId}/command`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Accept-Version": "^0.1.0"
            },
            body: JSON.stringify({
                data: {
                    type: "rconCommand",
                    attributes: {
                        command: "b1597ac2-832a-4a83-aef7-13675d401cbc",
                        options: {
                            type: "teaminfo",
                            steamid: steamId
                        }
                    }
                }
            })
        })

        if (resp.status !== 200) {
            console.error(`Failed to request teaminfo | Status: ${resp.status}`);
            return "error";
        }

        const data = await resp.json();
        const result = data.data?.attributes?.result[0]?.children[1]?.children[0]?.children[0]?.reference.result
        if (!result) {
            console.error(`Failed to request teaminfo | Status: ${resp.status} | Result: ${result}`);
            return "error";
        }

        return result;
    }
}

// class ExampleOrganization {
//     id = "1234";
//
//     static {
//        organizations.push(new this());
//     }
//
//     /**
//      * Function that returns the response of the `teaminfo` command from a specific server.
//      * @param {String} steamId - Steam ID(steamID64) of the target player
//      * @param {Number} serverId - Battlemetrics Server ID where the command should run
//      * @param {String} token - Battlemetrics Access Token for the API
//      * @returns {String}
//      */
//     async getTeamInfo(steamId, serverId, token) {
//        return ""; // return the actual raw teaminfo here
//     }
// }
