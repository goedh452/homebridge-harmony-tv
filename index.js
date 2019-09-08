var Service, Characteristic;
var request = require("request");

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-harmony-tv", "HarmonyTV", HarmonyTV);
};


function HarmonyTV(log, config)
{
  this.log = log;

  this.name = config.name                 || "Harmony TV";

  // Harmony API settings
  this.ApiIP = config.ApiIP               || "192.168.1.117";
  this.ApiPort = config.ApiPort           || 8282;

  this.timeout = config.timeout           || 5000;

  // Manufacturer information
  this.manufacturer = config.manufacturer || "goedh452";
  this.model = config.model               || "Harmony TV";
  this.serial = config.serial             || "Harmony TV";


  // Get Harmony Hubs
  var baseURL = this.ApiIP + ":" + this.ApiPort + "/hubs";

  this.httpRequest(baseURL, "", "GET", function(error, response, responseBody)
  {
    if (error)
    {
      this.log('Get hub failed: %s', error.message);
      callback(error);
    }
    else
    {
      var jsonHub = JSON.parse(responseBody);
      var hub  = jsonHub[0].hubs;

      this.log("HUB responsebody: " + jsonHub);
      this.log("HUB received: " + hub);
    }
  }.bind(this));

  // Get hub activities
  var activitiesURL = baseURL + "/" + hub + "/activities";

  this.httpRequest(activitiesURL, "", "GET", function(error, response, responseBody)
  {
    if (error)
    {
      this.log('Get activities failed: %s', error.message);
      callback(error);
    }
    else
    {
      var jsonAct     = JSON.parse(responseBody);
      var activities  = jsonAct[0].slug;

      this.log("Activity responsebody: " + jsonAct);
      this.log("Activities received: " + activities);
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
