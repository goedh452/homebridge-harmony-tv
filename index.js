var Service, Characteristic;
var request = require("request");
var syncrequest = require("sync-request");
var pollingtoevent = require("polling-to-event");

var harmonyHubs;

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

  this.getHubs();


  //getActivities(this.baseURL);
}


HarmonyTV.prototype = {

  getHubs: function()
  {
    this.baseURL = "http://" + this.apiIP + ":" + this.apiPort + "/hubs";

    this.syncRequest("GET", this.baseURL, function(error, response, hubBody)
    {
      if (error)
      {
        this.log("Get hub failed: %s", error.message);
        callback(error);
      }
      else
      {
        var jsonHub = JSON.parse(hubBody);
        this.harmonyHubs = jsonHub.hubs[0];
        console.log("HarmonyTV: HUB found: " + this.harmonyHubs);
      }
    }.bind(this));
  },

  syncRequest: function(method, url, callback)
  {
    var callbackMethod = callback;

    console.log("URL: " + url);

    syncrequest(method, url, {
        body: body,
        timeout: this.timeout
      },
      function(error, response, responseBody)
      {
        if (callbackMethod)
        {
          callbackMethod(error, response, responseBody);
        }
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
