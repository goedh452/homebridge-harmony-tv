var Service, Characteristic;
var request = require("request");
var syncrequest = require("sync-request");
var pollingtoevent = require("polling-to-event");

var harmonyHubs;
var baseURL;
var activitiesURL;
var activitiesArray = new Array();

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

  this.getHubsInformation();


  //getActivities(this.baseURL);
}


HarmonyTV.prototype = {

  getHubsInformation: function()
  {
    this.baseURL = "http://" + this.apiIP + ":" + this.apiPort + "/hubs";

    var hubResponse = syncrequest("GET", this.baseURL, { timeout: this.timeout });
    var jsonHub = JSON.parse(hubResponse.getBody('utf8'));
    this.harmonyHubs = jsonHub.hubs[0];
    console.log("HarmonyTV: HUB found: " + this.harmonyHubs);

    this.activitiesURL = this.baseURL + "/" + this.harmonyHubs + "/activities";
    console.log(this.activitiesURL);

    var actResponse = syncrequest("GET", this.activitiesURL, { timeout: this.timeout });
    console.log("jsonAct: " + jsonAct.getBody('utf8'));

    var jsonAct = JSON.parse(actResponse.getBody('utf8'));

    for (var key = 0; key < jsonAct.activities.length; key++)
    {
      console.log("HarmonyTV: Activity found: " + jsonAct.activities[key].slug);
      activityArray.push(jsonAct.activities[key].slug);
    }
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
