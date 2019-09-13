var Service, Characteristic;
var request = require("sync-request");
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

  this.getHubs();
  this.getActivities();

}


HarmonyTV.prototype = {

  getHubs: function(callback)
  {
    // Get Harmony Hubs
    baseURL = "http://" + this.apiIP + ":" + this.apiPort + "/hubs";

    this.httpRequest(baseURL, "", "GET", function(error, response, hubBody)
    {
      if (error)
      {
        this.log('Get hub failed: %s', error.message);
        callback(error);
      }
      else
      {
        var harmonyHubs;
        jsonHub = JSON.parse(hubBody);
        harmonyHubs = jsonHub.hubs[0];
        this.log("HarmonyTV: HUB found: " + harmonyHubs);
        callback(null, harmonyHubs);
      }
    }.bind(this));

  },

  getActivities: function(callback)
  {
    // Get hub activities
    activitiesURL = baseURL + "/" + this.harmonyHubs + "/activities";

    this.httpRequest(activitiesURL, "", "GET", function(error, response, activityBody)
    {
      if (error)
      {
        this.log('Get activities failed: %s', error.message);
        callback(error);
      }
      else
      {
        var activityArray = new Array();
        jsonAct = JSON.parse(activityBody);

        for (var key = 0; key < jsonAct.activities.length; key++)
        {
          this.log("HarmonyTV: Activity found: " + jsonAct.activities[key].slug);
          activityArray.push(jsonAct.activities[key].slug);
          callback(null, activityArray);
        }
      }
    }.bind(this));
  },

  httpRequest: function(url, body, method, callback)
  {
    var callbackMethod = callback;

    request({
        url: url,
        body: body,
        method: method,
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
