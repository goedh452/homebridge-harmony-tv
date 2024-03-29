# !!! Not maintained anymore !!!
Since I do not use Homebridge anymore, this module is not maintained. Feel free to fork it and make the changes you need.

# homebridge-harmony-tv

`hombridge-harmony-tv` is a plugin for Homebridge which allows you to control your activities of your Harmony remote. It creates a Homekit television with inputs that represent the activities.

## Features
* HomeKit TV integration
* HomeKit automation
* Turn activity on/off
* Choose activity from the input list

To use the plugin iOS 12.2 or higher is required.

## Todo
* MQTT support for harmony API

## Installation

For this plugin to work, enable XMPP for the Harmony hub and install the Harmony API:

### Enable XMPP:
* Open the Harmony app
* Go to Harmony setup
* Add/change devices and activities
* Remote and Hub
* Enable XMPP
* Confirm twice

### Install Harmony API (with great thanks to maddox)
```sh
cd $HOME
git clone https://github.com/maddox/harmony-api.git
cd harmony-api
script/bootstrap
```
Install Harmony API as a service
```sh
sudo mkdir -p /var/lib/harmony-api
sudo cp -R * /var/lib/harmony-api
sudo ln -sf /var/lib/harmony-api/config /etc/harmony-api
sudo cp /var/lib/harmony-api/config/harmony-api-server.service /etc/systemd/system/
sudo systemctl enable harmony-api-server.service
```

Then either reboot or run
```sh
sudo systemctl start harmony-api-server.service
```

Harmony API server log is checked with
```sh
sudo journalctl -f -u harmony-api-server
```

### Install homebridge-harmony-tv:
```sh
sudo npm install -g homebridge-harmony-tv
```

## Configuration

Add the accessory in `config.json`. The hub will be detected automatically and add the activities.

### Core
| Key | Description | Default |
| --- | --- | --- |
| `accessory` | Must be `HarmonyTV` | N/A |
| `name` | Name to appear in the Home app | N/A |
| `connection` | Must be `http` (for now) | `http` |

### httpSettings block (mandatory when connection = http)
| Key | Description | Default |
| --- | --- | --- |
| `apiIP` | IP address of Harmony API server | N/A |
| `apiPort` | Port of Harmony API server | `8282` |
| `pollingInterval` | Time (in ms) between status checks | `5000` |
| `timeOut` | Time (in ms) until the accessory will be marked as Not Responding | `5000` |

### MQTT block (mandatory when connection = mqtt)
Todo

### Additional fields
| Key | Description | Default |
| --- | --- | --- |
| `model` _(optional)_ | Appears under the _Model_ field for the accessory | `Harmony TV` |
| `serial` _(optional)_ | Appears under the _Serial_ field for the accessory | `Harmony TV` |
| `manufacturer` _(optional)_ | Appears under the _Manufacturer_ field for the accessory | `goedh452` |

#### Config sample

 ```json
"accessories": [
  {
    "accessory": "HarmonyTV",
    "name": "Televisie WK-Achter",
    "connection": "http",
    "httpSettings":{
                    "apiIP": "192.168.1.100",
                    "apiPort": 8282,
                    "pollingInterval": 5000,
                    "timeout": 5000
                  }
    }
  ]
```
