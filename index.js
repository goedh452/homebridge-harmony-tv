var Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-harmony-tv", "HarmonyTV", HarmonyTV);
};


function HarmonyTV(log, config) {
  this.log = log;
	
  this.name = config.name || "Harmony TV";
	
  this.manufacturer = config.manufacturer || "goedh452";
  this.model = config.model || "Harmony TV";
  this.serial = config.serial || "Harmony TV";
}


HarmonyTV.prototype = {
	
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
