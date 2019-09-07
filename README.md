# WORK IN PROGRES!!!


# homebridge-harmony-tv

`hombridge-harmony-tv` is a plugin for Homebridge which allows you to control your activities from your Harmony remote. It creates a homekit television with inputs that represent the activities.

### Features
* HomeKit TV integration
* HomeKit automation
* Turn activity on/off
* Choose activity from the input list

To use the plugin iOS 12.2 or higher is required.

## Installation

For this plugin to work, enable XMPP for the Harmony hub and install the Harmony API:

### XMPP:
* Open the Harmony app
* Go to Harmony setup
* Add/change devices and activities
* Remote and Hub
* Enable XMPP
* Confirm twice

### Install Harmony API

See https://github.com/maddox/harmony-api for installation instructions. Make sure it is running as a service.

### Install homebridge-harmony-tv:
```sh
sudo npm install -g homebridge-harmony-tv
```

## Configuration

Add the accessory in `config.json` in your home directory inside `.homebridge`.
