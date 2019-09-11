var Service, Characteristic;
var request = require("request");

var baseURL;
var activitiesURL;
var statusURL;
var jsonHub;
var jsonAct;
var jsonStatus;
var harmonyHubs;
var harmonyActs;
var harmonyStatus;
var activityArray = new Array();

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-harmony-tv", "HarmonyTV", HarmonyTV);
};


function HarmonyTV(log, config)
{
  this.log = log;

  this.name         = config.name              || "Harmony TV";

  // Harmony API settings
  this.ApiIP        = config.ApiIP             || "192.168.1.117";
  this.ApiPort      = config.ApiPort           || 8282;

  this.timeout      = config.timeout           || 5000;

  // Manufacturer information
  this.manufacturer = config.manufacturer      || "goedh452";
  this.model        = config.model             || "Harmony TV";
  this.serial       = config.serial            || "Harmony TV";
  this.firmware     = "0.0.1";


  // Get Harmony Hubs
  baseURL = "http://" + this.ApiIP + ":" + this.ApiPort + "/hubs";

  this.httpRequest(baseURL, "", "GET", function(error, response, responseBody)
  {
    if (error)
    {
      this.log('Get hub failed: %s', error.message);
      callback(error);
    }
    else
    {
      jsonHub = JSON.parse(responseBody);
      harmonyHubs = jsonHub.hubs[0];
      this.log("HarmonyTV: HUB found: " + harmonyHubs);

      // Get hub activities
      activitiesURL = baseURL + "/" + harmonyHubs + "/activities";

      this.httpRequest(activitiesURL, "", "GET", function(error, response, responseBody)
      {
        if (error)
        {
          this.log('Get activities failed: %s', error.message);
          callback(error);
        }
        else
        {
          jsonAct = JSON.parse(responseBody);

          for (var key = 0; key < jsonAct.activities.length; key++)
          {
            this.log("HarmonyTV: Activity found: " + jsonAct.activities[key].slug);
            activityArray.push(jsonAct.activities[key].slug);
          }
        }
      }.bind(this));
    }
  }.bind(this));
}


HarmonyTV.prototype = {

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
    // Get current status
    statusURL = baseURL + "/" + harmonyHubs + "/status";

    this.httpRequest(statusURL, "", "GET", function(error, response, responseBody)
    {
      if (error)
      {
        this.log('Get status failed: %s', error.message);
        callback(error);
      }
      else
      {
        this.log(responseBody);
        jsonStatus = JSON.parse(responseBody);
        harmonyStatus = jsonStatus.off;
        this.log("HarmonyTV: Current status: " + harmonyStatus);
      }
    }.bind(this));
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
