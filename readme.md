# homebridge-wled-simple

## Description

This [homebridge](https://github.com/nfarina/homebridge) plugin exposes a WLED RGB device to Apple's [HomeKit](http://www.apple.com/ios/home/). Heavily based on [homebridge-web-rgb](https://github.com/Tommrodrigues/homebridge-web-rgb).

## Installation

1. Install [homebridge](https://github.com/nfarina/homebridge#installation-details)
2. Install this plugin: `npm install -g homebridge-wled-simple`
3. Update your `config.json` file

## Configuration

```json
"accessories": [
     {
       "accessory": "WLEDSimple",
       "name": "Moodlight Livingroom",
       "apiroute": "http://102.168.1.133"
     }
]
```

### Core
| Key | Description | Default |
| --- | --- | --- |
| `accessory` | Must be `WLEDSimple` | N/A |
| `name` | Name to appear in the Home app | N/A |
| `apiroute` | Root URL of your device | N/A |

### Options fields
| Key | Description | Default |
| --- | --- | --- |
| `pollInterval` | Time (in seconds) between device polls | `300` |
| `timeout` | Time (in milliseconds) until the accessory will be marked as _Not Responding_ if it is unreachable | `3000` |
| `port` | Port for your HTTP listener (if enabled) | `2000` |
| `model` | Appears under the _Model_ field for the accessory | plugin |
| `serial` | Appears under the _Serial_ field for the accessory | apiroute |
| `manufacturer` | Appears under the _Manufacturer_ field for the accessory | author |
| `firmware` | Appears under the _Firmware_ field for the accessory | version |
