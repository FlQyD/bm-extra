# bm-extra
Chromium-based BattleMetrics extension providing quality-of-life features for Rust admins.

## Installation
1. Download: Go to the [Github repository](https://github.com/FlQyD/bm-extra) and download the latest release.
2. Unpack the ZIP file.
3. Open Chrome Extensions Settings: Navigate to `chrome://extensions/` in Google Chrome.
4. Click `Load Unpacked` and select the unpacked `bm-extra` directory.

> **Note:** Some features will not work properly on smaller screen sizes.

## Features:
- Steam Friends
- Teaminfo
- BM Information Panel
- Extra Identifier Information
- Versatile Settings

### Steam Friends
Displays the current Steam Friends of the player if you provided a [Steam API Key](https://steamcommunity.com/dev/apikey).

### Teaminfo:
Displays basic information about a player's team status on the BattleMetrics RCON profile.
> Teaminfo is only available on a handful of servers.

### BM Information Panel:
Displays a new panel on the overview page called `BM Information`, which offers details to support your investigation. You don't need Steam API Key for this.

### Extra Identifier Information:
Displays extra details about certain identifiers, allows you to differentiate between VPNs more easily, while giving a more user-friendly look to the identifier page.

### Versatile Settings
Behind the whole extension there is a fully customizable settings page which allows you to decide which features you want to use and which features you don't.

## Requirements
Not all features require API keys but whichever does you can obtain the keys from:
- **Steam API Key**: [Steam Web API documentation](https://steamcommunity.com/dev)
- **BattleMetrics API Key**: [Developer Page](https://www.battlemetrics.com/developers)

If you want to use Streamer Mode names, go to the settings and upload the file `C:\Program Files (x86)\Steam\steamapps\common\Rust\RustClient_Data\StreamingAssets\RandomUsernames.json` from the game files. This contains the list of the used Streamer Mode names.

## Contact
For any questions or to report any issue, please contact me on discord: [flqyd](https://discord.com/users/1094976844027134113)