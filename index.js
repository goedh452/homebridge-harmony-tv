var Service, Characteristic;
var request = require("request");
var pollingtoevent = require('polling-to-event');

var baseURL;
var activitiesURL;
var statusURL;
var jsonStatus;
var harmonyStatusOff;
var activityArray = new Array();
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

  var that = this;

  this.baseURL = "http://" + this.apiIP + ":" + this.apiPort + "/hubs";

  getHubInfo();

  async function getHubInfo()
  {
    var hubsFound = await getHubs();
    var actsFound = await getActivities();
  }

  function getHubs()
  {
    that.httpRequest(that.baseURL, function(error, response, hubBody)
    {
      if (error)
      {
        console.log("Get hubs failed: %s", error.message);
      }
      else
      {
        var jsonHub = JSON.parse(hubBody);
        this.harmonyHubs = jsonHub.hubs[0];
        console.log("HarmonyTV: HUB found: " + this.harmonyHubs);
        return harmonyHubs;
      }
    });
  }

  function getActivities()
  {
    this.activitiesURL = this.baseURL + "/" + this.harmonyHubs + "/activities";
    console.log("activitiesURL: " + this.activitiesURL);

    that.httpRequest(this.activitiesURL, function(error, response, activityBody)
    {
      if (error)
      {
        console.log("Get activities failed: %s", error.message);
      }
      else
      {
        var jsonAct = JSON.parse(activityBody);

        for (var key = 0; key < jsonAct.activities.length; key++)
        {
          console.log("HarmonyTV: Activity found: " + jsonAct.activities[key].slug);
          this.activityArray.push(jsonAct.activities[key].slug);
        }
      }
    });
  }
}


HarmonyTV.prototype = {

  httpRequest: function(url, callback)
  {
    var callbackMethod = callback;

    console.log("URL: " + url);

    request({
        url: url,
        body: "",
        method: "GET",
        timeout: this.timeout,
        rejectUnauthorized: false
      },
      function(error, response, responseBody)
      {
        if (callbackMethod)
        {
          callbackMethod(error, response, responseBody);
        }

      })
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
