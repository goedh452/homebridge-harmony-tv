var Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-harmony-tv", "Harmony TV", HarmonyTV);
};


function HttpSprinkler(log, config) {
  this.log = log;
	
	this.name = config.name || "Harmony TV";
	
	this.manufacturer = config.manufacturer || "goedh452";
  this.model = config.model || "Harmony TV";
  this.serial = config.serial || "Harmony TV";
}


HarmonyTV.prototype {
	
	getServices: function() {
		
		this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serial);
		
		this.tvService = new Service.Television(this.name, 'tvService');
		
		this.tvService
			.setCharacteristic(Characteristic.ConfiguredName, this.name)
    	.setCharacteristic(Characteristic.SleepDiscoveryMode, Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);
		
		this.tvService
        .getCharacteristic(Characteristic.Active)
        .on('get', this.getPowerState.bind(this))
        .on('set', this.setPowerState.bind(this));

		this.tvService
        .getCharacteristic(Characteristic.ActiveIdentifier)
        .on('set', (inputIdentifier, callback) => {
            this.log.debug('Input source changed, new input source identifier: %d, source appId: %s', inputIdentifier, this.inputAppIds[inputIdentifier]);
            this.setAppSwitchState(true, callback, this.inputAppIds[inputIdentifier]);
        });
		
    this.tvService
        .getCharacteristic(Characteristic.RemoteKey)
        .on('set', this.remoteKeyPress.bind(this));
		
    this.tvService
        .getCharacteristic(Characteristic.PowerModeSelection)
        .on('set', (newValue, callback) => {
            this.log.debug('Requested tv settings (PowerModeSelection): ' + newValue);
            this.setRemoteControlButtonState(true, callback, 'MENU');
        });
		
		return [this.tvService, this.informationService];
	}
};
