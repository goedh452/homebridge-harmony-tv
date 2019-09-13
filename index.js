var Service, Characteristic;
var request = require("request");
var pollingtoevent = require("polling-to-event");

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-harmony-tv", "HarmonyTV", HarmonyTV);
};


function HarmonyTV(log, config)
{
  this.log = log;

  this.name             = config.name             || "Harmony TV";
  this.apiIP            = config.ApiIP            || "192.168.1.117";
  this.apiPort          = config.ApiPort          || 8282;
  this.pollingInterval  = config.pollingInterval  || 5000;
  this.timeout          = config.timeout          || 5000;
  this.manufacturer     = config.manufacturer     || "goedh452";
  this.model            = config.model            || "Harmony TV";
  this.serial           = config.serial           || "Harmony TV";

  var baseURL = "http://" + this.apiIP + ":" + this.apiPort + "/hubs";
  var harmonyHubs = this.getHubs(this.baseURL);

  console.log("HARHUBS: " + this.harmonyHubs);
  //getActivities(this.baseURL);
}


HarmonyTV.prototype = {

  getHubs: async function(baseURL)
  {
    var hubBody = await this.httpRequest(baseURL);
    var jsonHub = JSON.parse(hubBody);
    var harmonyHubs = jsonHub.hubs[0];
    console.log("HarmonyTV: HUB found: " + harmonyHubs);
    return harmonyHubs;
  },

  getActivities: async function()
  {
    this.activitiesURL = this.baseURL + "/" + this.harmonyHubs + "/activities";
    console.log("activitiesURL: " + this.activitiesURL);

    var activityBody = await this.httpRequest(this.activitiesURL);

    var jsonAct = JSON.parse(activityBody);
    for (var key = 0; key < jsonAct.activities.length; key++)
    {
      console.log("HarmonyTV: Activity found: " + jsonAct.activities[key].slug);
      this.activityArray.push(jsonAct.activities[key].slug);
    }
  },

  httpRequest: function(url)
  {
    return new Promise((resolve, reject) => {
        request(url, (error, response, body) => {
          console.log("ERROR: " + error);
          console.log("RESPONSE: " + response);
          console.log("BODY: " + body);

            if (error) reject(error);
            if (response.statusCode != 200) {
                reject('Invalid status code <' + response.statusCode + '>');
            }
            resolve(body);
        });
    });
  },

  getPowerState: function(callback)
  {
    // Status is handled by polling
  },

  setPowerState: function(callback)
  {

  },

  getServices: function()
  {

    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serial);

    this.tvService = new Service.Television(this.name);

    this.tvService
      .setCharacteristic(Characteristic.ConfiguredName, this.name)
      .setCharacteristic(Characteristic.SleepDiscoveryMode, Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);

    this.tvService
      .getCharacteristic(Characteristic.Active)
      .on('get', this.getPowerState.bind(this))
      .on('set', this.setPowerState.bind(this));

    return [this.tvService, this.informationService];
  }
};
