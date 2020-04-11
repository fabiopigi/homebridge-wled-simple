var Service, Characteristic;
const packageJson = require("./package.json");
const request = require("request");
const convert = require("color-convert");
const ip = require("ip");
const http = require("http");

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory(
    "homebridge-wled-simple",
    "WLEDSimple",
    WLEDSimple
  );
};

function WLEDSimple(log, config) {
  this.log = log;

  this.name = config.name;
  this.apiroute = config.apiroute;
  this.pollInterval = config.pollInterval || 300;

  this.requestArray = ["color", "brightness", "state"];

  this.manufacturer = config.manufacturer || packageJson.author.name;
  this.serial = config.serial || this.apiroute;
  this.model = config.model || packageJson.name;
  this.firmware = config.firmware || packageJson.version;

  this.debug = config.debug;
  this.log.warn("DEBUG:", this.debug, config);

  this.timeout = config.timeout || 3000;

  this.disableColor = config.disableColor || false;
  this.disableBrightness = config.disableBrightness || false;

  this.cacheHue = 0;
  this.cacheSaturation = 0;
  this.count = 0;

  this.service = new Service.Lightbulb(this.name);
}

WLEDSimple.prototype = {
  identify: function (callback) {
    this.log("Identify requested!");
    callback();
  },

  _httpRequest: function (url, body, method, callback) {
    request(
      {
        url: url,
        body: body,
        method: "GET",
        timeout: this.timeout,
        rejectUnauthorized: false,
      },
      function (error, response, body) {
        callback(error, response, body);
      }
    );
  },

  _getStatus: function (callback) {
    var url = this.apiroute + "/json/state";
    this.debug && this.log.debug("Getting status: %s", url);

    this._httpRequest(
      url,
      "",
      "GET",
      function (error, response, responseBody) {
        if (error) {
          this.log.warn("Error getting status: %s", error.message);
          this.service
            .getCharacteristic(Characteristic.On)
            .updateValue(new Error("Polling failed"));
          callback(error);
        } else {
          this.debug && this.log.debug("Device response: %s", responseBody);
          var json = JSON.parse(responseBody);
          var hsv = convert.rgb.hsv(...json.seg[0].col);
          var bri = Math.ceil(json.bri / 2.55);
          this.cacheHue = hsv[0];
          this.cacheSaturation = hsv[1];
          this.service
            .getCharacteristic(Characteristic.On)
            .updateValue(json.on);
          this.debug && this.log("Updated state to: %s", json.on);
          if (!this.disableBrightness) {
            this.service
              .getCharacteristic(Characteristic.Brightness)
              .updateValue(bri);
            this.debug && this.log("Updated brightness to: %s", bri);
          }
          if (!this.disableColor) {
            this.service
              .getCharacteristic(Characteristic.Hue)
              .updateValue(this.cacheHue);
            this.debug && this.log.debug("Updated hue to: %s", this.cacheHue);
            this.service
              .getCharacteristic(Characteristic.Saturation)
              .updateValue(this.cacheSaturation);
            this.debug &&
              this.log.debug("Updated saturation to: %s", this.cacheSaturation);
            this.debug &&
              this.log(
                "Updated color to: #%s",
                convert.rgb.hex(...json.seg[0].col)
              );
          }
          callback();
        }
      }.bind(this)
    );
  },

  _httpHandler: function (characteristic, value) {
    switch (characteristic) {
      case "state":
        this.service.getCharacteristic(Characteristic.On).updateValue(value);
        this.debug && this.log("Updated %s to: %s", characteristic, value);
        break;
      case "brightness":
        this.service
          .getCharacteristic(Characteristic.Brightness)
          .updateValue(value);
        this.debug && this.log("Updated %s to: %s", characteristic, value);
        break;
      case "color":
        var hsv = convert.hex.hsv(value);
        this.cacheHue = hsv[0];
        this.cacheSaturation = hsv[1];
        this.service
          .getCharacteristic(Characteristic.Hue)
          .updateValue(this.cacheHue);
        this.debug && this.log.debug("Updated hue to: %s", this.cacheHue);
        this.service
          .getCharacteristic(Characteristic.Saturation)
          .updateValue(this.cacheSaturation);
        this.debug &&
          this.log.debug("Updated saturation to: %s", this.cacheSaturation);
        this.debug && this.log("Updated %s to: %s", characteristic, value);
        break;
      default:
        this.log.warn(
          'Unknown characteristic "%s" with value "%s"',
          characteristic,
          value
        );
    }
  },

  setOn: function (value, callback) {
    var url = this.apiroute + "/win&FX=0&T=" + (value ? 1 : 0);
    this.log.debug("Setting state: %s", url);

    this._httpRequest(
      url,
      "",
      "GET",
      function (error, response, responseBody) {
        if (error) {
          this.log.warn("Error setting state: %s", error.message);
          callback(error);
        } else {
          this.debug && this.log("Set state to %s", value);
          callback();
        }
      }.bind(this)
    );
  },

  setBrightness: function (value, callback) {
    var url = this.apiroute + "/win&A=" + Math.floor(value * 2.55);
    this.log.debug("Setting brightness: %s", url);

    this._httpRequest(
      url,
      "",
      "GET",
      function (error, response, responseBody) {
        if (error) {
          this.log.warn("Error setting brightness: %s", error.message);
          callback(error);
        } else {
          this.debug && this.log("Set brightness to %s", value);
          callback();
        }
      }.bind(this)
    );
  },

  setHue: function (value, callback) {
    this.debug && this.log.debug("Setting hue to: %s", value);
    this.cacheHue = value;
    this._setRGB(callback);
  },

  setSaturation: function (value, callback) {
    this.debug && this.log.debug("Setting saturation to: %s", value);
    this.cacheSaturation = value;
    this._setRGB(callback);
  },

  _setRGB: function (callback) {
    this.count = this.count + 1;
    if (this.count === 1) {
      callback();
      return;
    }

    var hex = convert.hsv.hex(this.cacheHue, this.cacheSaturation, 100);
    var url = this.apiroute + "/win&CL=H" + hex;
    this.log.debug("Setting color: %s", url);

    this._httpRequest(
      url,
      "",
      "GET",
      function (error, response, responseBody) {
        if (error) {
          this.log.warn("Error setting color: %s", error);
          callback(error);
        } else {
          this.debug && this.log("Set color to: %s", hex);
          callback();
        }
        this.count = 0;
      }.bind(this)
    );
  },

  getServices: function () {
    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serial)
      .setCharacteristic(Characteristic.FirmwareRevision, this.firmware);

    this.service
      .getCharacteristic(Characteristic.On)
      .on("set", this.setOn.bind(this));

    if (!this.disableBrightness) {
      this.service
        .getCharacteristic(Characteristic.Brightness)
        .on("set", this.setBrightness.bind(this));
    }

    if (!this.disableColor) {
      this.service
        .getCharacteristic(Characteristic.Saturation)
        .on("set", this.setSaturation.bind(this));
      this.service
        .getCharacteristic(Characteristic.Hue)
        .on("set", this.setHue.bind(this));
    }

    this._getStatus(function () {});

    setInterval(
      function () {
        this._getStatus(function () {});
      }.bind(this),
      this.pollInterval * 1000
    );

    return [this.informationService, this.service];
  },
};
