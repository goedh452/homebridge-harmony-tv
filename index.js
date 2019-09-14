var Service, Characteristic;
var request = require("request");
var syncrequest = require("sync-request");
var pollingtoevent = require("polling-to-event");

var harmonyHubs;
var baseURL;
var activitiesURL;
var statusURL;

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

  this.initializeService();
}


HarmonyTV.prototype = {

  initializeService: function()
  {
    // Get Hubs
    this.baseURL = "http://" + this.apiIP + ":" + this.apiPort + "/hubs";

    var hubResponse = syncrequest("GET", this.baseURL, { timeout: this.timeout });
    var jsonHub = JSON.parse(hubResponse.getBody('utf8'));
    this.harmonyHubs = jsonHub.hubs[0];
    console.log("HarmonyTV: HUB found: " + this.harmonyHubs);

    // Get activities
    this.activitiesURL = this.baseURL + "/" + this.harmonyHubs + "/activities";
    var actResponse = syncrequest("GET", this.activitiesURL, { timeout: this.timeout });
    var jsonAct = JSON.parse(actResponse.getBody('utf8'));
    var activityArray = [];
    for (var key = 0; key < jsonAct.activities.length; key++)
    {
      if ( jsonAct.activities[key].id == "-1" )
      { console.log("HarmonyTV: Activity found: poweroff -> do not add as input"); }
      else
      {
        console.log("HarmonyTV: Activity found: " + jsonAct.activities[key].slug);
        activityArray.push(jsonAct.activities[key].slug);
      }
    }

    // Start polling
    if (this.apiIP && this.apiPort)
    {
      this.statusURL = this.baseURL + "/" + this.harmonyHubs + "/status";
      console.log("statusURL: " + this.statusURL);
      var statusemitter = pollingtoevent(function(done)
      {
        this.httpRequest(statusURL, "", "GET", function(error, response, body)
        {
          if (error)
          {
            this.log("HarmonyTV get status function failed: %s", error.message);
              try
              { done(new Error("Network failure")); }
              catch (err)
              { that.log(err.message); }
            }
            else
            { done(null, body); }
          }.bind(this))
        }, {
          interval: this.pollingInterval,
          eventName: "statuspoll"
        });

        statusemitter.on("statuspoll", function(statusBody)
        {
          console.log("responseBody: " + statusBody);
          var powerOn = false;
          var jsonStatus  = JSON.parse(statusBody);
          var harmonyStatusOff = jsonStatus.off;

          console.log("harmonyStatusOff: " + harmonyStatusOff);

          if ( harmonyStatusOff === true  )
          { powerOn = false; }
          else
          { powerOn = true; }

          console.log("HarmonyTV: State is currently: " + powerOn);

          this.tvService.getCharacteristic(Characteristic.Active).updateValue(powerOn);
        });
      }
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
