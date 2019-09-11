var Service, Characteristic;
var request = require("request");
var pollingtoevent = require('polling-to-event');

var baseURL;
var activitiesURL;
var statusURL;
var jsonHub;
var jsonAct;
var jsonStatus;
var harmonyHubs;
var harmonyActs;
var harmonyStatusOff;
var activityArray = new Array();

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-harmony-tv", "HarmonyTV", HarmonyTV);
};


function HarmonyTV(log, config)
{
  this.log = log;

  this.name         = config.name                || "Harmony TV";

  // Harmony API settings
  this.apiIP        = config.ApiIP               || "192.168.1.117";
  this.apiPort      = config.ApiPort             || 8282;

  this.pollingInterval = config.pollingInterval  || 5000;
  this.timeout         = config.timeout          || 5000;

  // Manufacturer information
  this.manufacturer = config.manufacturer        || "goedh452";
  this.model        = config.model               || "Harmony TV";
  this.serial       = config.serial              || "Harmony TV";
  this.firmware     = "0.0.1";

  var that = this;

  // Get Harmony Hubs
  baseURL = "http://" + this.apiIP + ":" + this.apiPort + "/hubs";

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

  // Status Polling
  if (this.apiIP && this.apiPort)
  {
    statusURL = baseURL + "/" + harmonyHubs + "/status";
    var statusemitter = pollingtoevent(function(done)
    {
      this.httpRequest(statusURL, "", "GET", function(error, response, body)
      {
        if (error)
        {
          this.log('HarmonyTV get status function failed: %s', error.message);
            try
            { done(new Error("Network failure that must not stop homebridge!")); }
            catch (err)
            { this.log(err.message); }
          }
          else
          { done(null, body); }
        })
      }, {
        interval: this.pollingInterval,
        eventName: "statuspoll"
      });

      statusemitter.on("statuspoll", function(responseBody)
      {
        var powerOn = false;
        jsonStatus  = JSON.parse(responseBody);
        harmonyStatusOff = jsonStatus.off;

        if ( harmonyStatusOff == true  )
        { powerOn = false; }
        else
        { powerOn = true; }

        this.log("HarmonyTV: State si currently: " + powerOn);

        this.tvService.getCharacteristic(Characteristic.Active).updateValue(powerOn);
      });
    }
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
