var Service, Characteristic;
var request = require("request");
var syncrequest = require("sync-request");
var pollingtoevent = require("polling-to-event");

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-harmony-tv", "HarmonyTV", HarmonyTV);
};


function HarmonyTV(log, config)
{
  this.log = log;

  // Config file
  this.name             = config.name             || "Harmony TV";
  this.apiIP            = config.ApiIP            || "192.168.1.117";
  this.apiPort          = config.ApiPort          || 8282;
  this.pollingInterval  = config.pollingInterval  || 5000;
  this.timeout          = config.timeout          || 5000;
  this.manufacturer     = config.manufacturer     || "goedh452";
  this.model            = config.model            || "Harmony TV";
  this.serial           = config.serial           || "Harmony TV";

  // Variables
  this.enabledServices = [];
  this.baseURL = "http://" + this.apiIP + ":" + this.apiPort + "/hubs";
  this.harmonyHubs;

  // Initialize service
  this.initInformationService();
  this.initTVService();
  this.initHubInfo();
  this.startPolling();

}


HarmonyTV.prototype = {

  initInformationService : function()
  {
    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serial);

    this.enabledServices.push(this.informationService);

  },

  initTVService: function()
  {
    this.tvService = new Service.Television(this.name);

    this.tvService
      .setCharacteristic(Characteristic.ConfiguredName, this.name)
      .setCharacteristic(Characteristic.SleepDiscoveryMode, Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);

    this.tvService
      .getCharacteristic(Characteristic.Active)
      .on('get', this.getCurrentState.bind(this))
      .on('set', this.setPowerState.bind(this));

    this.enabledServices.push(this.tvService);
  },

  addInputServices: function(inputID, inputLabel)
  {
    let tmpInput = new Service.InputSource(inputID, inputID);

    tmpInput
      .setCharacteristic(Characteristic.Identifier, inputID)
      .setCharacteristic(Characteristic.ConfiguredName, inputLabel)
      .setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
      .setCharacteristic(Characteristic.InputSourceType, Characteristic.InputSourceType.APPLICATION)
      .setCharacteristic(Characteristic.CurrentVisibilityState, Characteristic.CurrentVisibilityState.SHOWN);

    this.tvService.addLinkedService(tmpInput);
    this.enabledServices.push(tmpInput);
  },

  initHubInfo: function()
  {
    // Get Hubs
    this.baseURL = "http://" + this.apiIP + ":" + this.apiPort + "/hubs";

    var hubResponse = syncrequest("GET", this.baseURL, { timeout: this.timeout });
    var jsonHub = JSON.parse(hubResponse.getBody('utf8'));
    this.harmonyHubs = jsonHub.hubs[0];
    console.log("HarmonyTV: HUB found: " + this.harmonyHubs);

    // Get activities
    var activitiesURL = this.baseURL + "/" + this.harmonyHubs + "/activities";
    var actResponse = syncrequest("GET", activitiesURL, { timeout: this.timeout });
    var jsonAct = JSON.parse(actResponse.getBody('utf8'));
    var inputID;
    var inputLabel;

    for (var key = 0; key < jsonAct.activities.length; key++)
    {
      if ( jsonAct.activities[key].id == "-1" )
      { console.log("HarmonyTV: Activity found: poweroff -> do not add as input"); }
      else
      {
        console.log("HarmonyTV: Activity found: " + jsonAct.activities[key].label);
        inputID    = jsonAct.activities[key].id;
        inputLabel = jsonAct.activities[key].label;
        this.addInputServices(inputID, inputLabel);
      }
    }
  },

  startPolling: function()
  {
    var that = this;
    if (this.apiIP && this.apiPort)
    {
      var statusURL = this.baseURL + "/" + this.harmonyHubs + "/status";
      var statusemitter = pollingtoevent(function(done)
      {
        that.httpRequest(statusURL, "", "GET", function(error, response, body)
        {
          if (error)
          {
            console.log("HarmonyTV get status function failed: %s", error.message);
              try
              { done(new Error("Network failure")); }
              catch (err)
              { console.log(err.message); }
            }
            else
            { done(null, body); }
          })
        }, {
          interval: that.pollingInterval,
          eventName: "statuspoll"
        });

        statusemitter.on("statuspoll", function(statusBody)
        {
          var powerOn;
          var jsonStatus = JSON.parse(statusBody);
          var harmonyStatusOff = jsonStatus.off;

          if ( harmonyStatusOff === true  )
          { powerOn = false; }
          else
          { powerOn = true; }

          console.log("HarmonyTV: State is currently: " + powerOn);
          that.tvService.getCharacteristic(Characteristic.Active).updateValue(powerOn);
        });
      }
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
      });
  },

  getCurrentState: function(callback)
  {
     var currentStateURL = this.baseURL + "/" + this.harmonyHubs + "/status";

		this.httpRequest(currentStateURL, "", "GET", function (error, response, statusBody)
    { if (error) { console.log("HarmonyTV: get state function failed %s", error.message); }
		else
		{
      var powerOn = false;
      var jsonStatus  = JSON.parse(statusBody);
      var harmonyStatusOff = jsonStatus.off;

      if ( harmonyStatusOff === true  )
      { powerOn = false; }
      else
      { powerOn = true; }

			callback(error, powerOn);
		}
	}.bind(this));
  },

  setPowerState: function(callback)
  {

  },

  getServices: function()
  {
    return this.enabledServices;
  }
};
