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
  this.inputServices = [];
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

    this.tvService
      .getCharacteristic(Characteristic.ActiveIdentifier)
      .on('set', this.setActiveIdentifier.bind(this));

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
    this.log("HUB found: " + this.harmonyHubs);

    // Get activities
    var activitiesURL = this.baseURL + "/" + this.harmonyHubs + "/activities";
    var actResponse = syncrequest("GET", activitiesURL, { timeout: this.timeout });
    var jsonAct = JSON.parse(actResponse.getBody('utf8'));
    var inputID;
    var inputSlug;
    var inputLabel;

    for (var key = 0; key < jsonAct.activities.length; key++)
    {
      if ( jsonAct.activities[key].id == "-1" )  // Poweroff
      {
        //this.log("Activity found: poweroff -> do not add as input");
      }
      else
      {
        inputID    = jsonAct.activities[key].id;
        inputSlug  = jsonAct.activities[key].slug;
        inputLabel = jsonAct.activities[key].label;

        this.log("Activity found: " + inputLabel);
        this.inputServices.push({id : inputID, slug : inputSlug});
        this.addInputServices(inputID, inputLabel);
      }
    }
  },

  setActiveIdentifier: function(identifier, callback)
  {
    var slug = this.inputServices.find(x => x.id == identifier).slug;
    var inputURL = this.baseURL + "/" + this.harmonyHubs + "/activities/" + slug;

    this.log("Change activity to " + slug);

    this.httpPostRequest(inputURL, "", function(error, response, responseBody)
    {
      if (error)
      { this.log("HarmonyTV start activity function failed: %s", error.message); }
    });
    callback();
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
              { this.log(err.message); }
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
          var currentActivityId;
          var currentActivityLabel;
          var jsonStatus = JSON.parse(statusBody);
          var harmonyStatusOff = jsonStatus.off;

          if ( harmonyStatusOff === false  )
          {
            currentActivityId    = jsonStatus.current_activity.id;
            currentActivityLabel = jsonStatus.current_activity.label;
            //this.log("Current activity is " + currentActivityId + " / " + currentActivityLabel);
            that.tvService.getCharacteristic(Characteristic.Active).updateValue(true);
            that.tvService.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(currentActivityId);
          }
          else
          {
            //this.log("State is currently Off");
            that.tvService.getCharacteristic(Characteristic.Active).updateValue(false);
          }
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
      });
  },

  httpPostRequest: function(url, body, callback)
  {
    var callbackMethod = callback;
    request.post({
        url: url,
        body: body,
        method: "POST",
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
    var statusURL = this.baseURL + "/" + this.harmonyHubs + "/status";
    this.httpRequest(statusURL, "", "GET", function(error, response, statusBody)
    {
      if (error)
      {
        this.log("HarmonyTV get status function failed: %s", error.message);
      }
      else
      {
        var powerOn;
        var currentActivityId;
        var currentActivityLabel;
        var jsonStatus = JSON.parse(statusBody);
        var harmonyStatusOff = jsonStatus.off;

        if ( harmonyStatusOff === false  )
        { powerOn = true; }
        else
        { powerOn = false; }

        callback(error, powerOn);
      }
    }.bind(this));
  },

  setPowerState: function(powerOn, callback)
  {
    var inputURL;

    if ( powerOn == 0 )
    {
      this.log("Set activity off");
      inputURL = this.baseURL + "/" + this.harmonyHubs + "/off";
    }
    else
    {
      this.log("Set activity on");
      inputURL = this.baseURL + "/" + this.harmonyHubs + "/activities/" + "tv-kijken";
    }

    this.httpPostRequest(inputURL, "", function(error, response, responseBody)
    {
      if (error)
      { this.log("HarmonyTV start activity function failed: %s", error.message); }
    });
    callback();
  },

  getServices: function()
  {
    return this.enabledServices;
  }
};
