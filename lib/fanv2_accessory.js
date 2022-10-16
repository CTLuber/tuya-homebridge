const BaseAccessory = require('./base_accessory')
 let Accessory;
 let Service;
 let Characteristic;
 let UUIDGen;

 const DEFAULT_SPEED_COUNT = 3;
 const DEFAULT_SPEED_RANGE = {'min': 1, 'max': 100};
 const DEFAULT_SPEED_LEVELS = ['1', '2', '3'];
 const DEFAULT_BRIGHTNESS_RANGE = {'min': 10, 'max': 1000};

 class Fanv2Accessory extends BaseAccessory {
   constructor(platform, homebridgeAccessory, deviceConfig) {

     ({ Accessory, Characteristic, Service } = platform.api.hap);
     ({Accessory, Characteristic, Service} = platform.api.hap);
     super(
       platform,
       homebridgeAccessory,
 @@ -26,7 +27,7 @@ class Fanv2Accessory extends BaseAccessory {

   //addLightService function
   addLightService() {
     this.lightStatus = this.statusArr.find((item, index) => { return item.code === 'light' && typeof item.value === 'boolean' });
     this.lightStatus = this.statusArr.find((item) => { return item.code === 'light' && typeof item.value === 'boolean' });
     if (this.lightStatus) {
       // Service
       this.lightService = this.homebridgeAccessory.getService(Service.Lightbulb);
 @@ -43,6 +44,7 @@ class Fanv2Accessory extends BaseAccessory {
   //init Or refresh AccessoryService
   refreshAccessoryServiceIfNeed(statusArr, isRefresh) {
     this.isRefresh = isRefresh
     let speedStatusDetected = false;
     for (const statusMap of statusArr) {
       if (statusMap.code === 'switch' || statusMap.code === 'fan_switch' || statusMap.code === 'switch_fan') {
         this.switchMap = statusMap
 @@ -67,26 +69,22 @@ class Fanv2Accessory extends BaseAccessory {
         this.normalAsync(Characteristic.RotationDirection, hbDirection)
       }

       if (statusMap.code === 'fan_speed_percent') {
         this.speedMap = statusMap
         this.speed_range = this.getSpeedFunctionRange(this.speedMap.code)
         const rawValue = this.speedMap.value // 1~12
         const value = Math.floor((rawValue * 100 - 100 * this.speed_range.min) / (this.speed_range.max - this.speed_range.min));  // 0-100
         this.normalAsync(Characteristic.RotationSpeed, value)
       }

       if (statusMap.code === 'fan_speed') {
       if (!speedStatusDetected && ['fan_speed_enum', 'fan_speed', 'fan_speed_percent'].includes(statusMap.code)) {
         speedStatusDetected = true;
         this.speedMap = statusMap;
         if ((typeof this.speedMap.value == 'string') && this.speedMap.value.constructor == String) {
           //get speed level dp range
           this.speed_count = this.getSpeedFunctionLevel(this.speedMap.code)
           this.speed_coefficient = 100 / this.speed_count
           const hbSpeed = parseInt(this.speedMap.value * this.speed_coefficient);
         const funcDic = this.getDpFunction(this.speedMap.code);
         if (funcDic.type === 'Enum') {
           //get speed levels
           this.speed_levels = this.getSpeedFunctionLevels(this.speedMap.code)
           this.speed_coefficient = 100 / this.speed_levels.length;
           const levelIndex = this.speed_levels.findIndex(level => level === this.speedMap.value) + 1;
           const hbSpeed = Math.floor((levelIndex > 0 ? levelIndex : this.speed_levels.length) * this.speed_coefficient);
           this.normalAsync(Characteristic.RotationSpeed, hbSpeed)
         }else{
         } else if (funcDic.type === 'Integer') {
           this.speed_range = this.getSpeedFunctionRange(this.speedMap.code)
           const rawValue = this.speedMap.value // 1~12
           const value = Math.floor((rawValue * 100 - 100 * this.speed_range.min) / (this.speed_range.max - this.speed_range.min));  // 0-100
           const rawValue = this.speedMap.value >= this.speed_range.min && this.speedMap.value <= this.speed_range.max
             ? this.speedMap.value : this.speed_range.max;
           const value = Math.floor((rawValue * 100 - 100 * this.speed_range.min) / (this.speed_range.max - this.speed_range.min)); // 0-100
           this.normalAsync(Characteristic.RotationSpeed, value)
         }
       }
 @@ -136,63 +134,64 @@ class Fanv2Accessory extends BaseAccessory {
         this.platform.tuyaOpenApi.sendCommand(this.deviceId, param).then(() => {
           this.setCachedState(name, value);
           callback();
         }).catch((error) => {
           this.log.error('[SET][%s] Characteristic Error: %s', this.homebridgeAccessory.displayName, error);
           this.invalidateCache();
           callback(error);
         });
       }).catch((error) => {
         this.log.error('[SET][%s] Characteristic Error: %s', this.homebridgeAccessory.displayName, error);
         this.invalidateCache();
         callback(error);
       });
     });
   }

   getSendParam(name, hbValue) {
     var code;
     var value;
     switch (name) {
       case Characteristic.Active:
         value = hbValue == 1 ? true : false;
         value = !!hbValue;
         const isOn = value;
         code = this.switchMap.code;
         value = isOn;
         break;
       case Characteristic.TargetFanState:
         value = hbValue == 1 ? "smart" : "nature";
         value = !!hbValue ? "smart" : "nature";
         const mode = value;
         code = "mode";
         value = mode;
         break;
       case Characteristic.LockPhysicalControls:
         value = hbValue == 1 ? true : false;
         value = !!hbValue;
         const isLock = value;
         code = "child_lock";
         value = isLock;
         break;
       case Characteristic.RotationDirection:
         value = hbValue == 0 ? "forward" : "reverse";
         value = !hbValue ? "forward" : "reverse";
         const direction = value;
         code = "fan_direction";
         value = direction;
         break;
       case Characteristic.RotationSpeed:
         let speed
         if ((typeof this.speedMap.value == 'string') && this.speedMap.value.constructor == String) {
           let level = Math.floor(hbValue / this.speed_coefficient) + 1
           level = level > this.speed_count ? this.speed_count : level;
           speed = "" + level;
         }else{
         const funcDic = this.getDpFunction(this.speedMap.code);
         if (funcDic.type === 'Enum' && this.speed_levels) {
           let levelIndex = Math.floor(hbValue / this.speed_coefficient) - 1;
           levelIndex = levelIndex >= 0 && levelIndex < this.speed_levels.length ? levelIndex : this.speed_levels.length - 1;
           speed = "" + this.speed_levels[levelIndex];
         } else if (funcDic.type === 'Integer' && this.speed_range) {
           speed = Math.floor((hbValue * this.speed_range.max - hbValue * this.speed_range.min + 100 * this.speed_range.min) / 100);  //1~100
         }
         code = this.speedMap.code;
         value = speed;
         break;
       case Characteristic.SwingMode:
         value = hbValue == 1 ? true : false;
         value = !!hbValue;
         const isSwing = value;
         code = "switch_vertical";
         value = isSwing;
         break;
       case Characteristic.On:
         code = this.switchLed.code;
         value = hbValue == 1 ? true : false;
         value = !!hbValue;
         break;
       case Characteristic.Brightness:
         value = Math.floor((this.bright_range.max - this.bright_range.min) * hbValue / 100 + this.bright_range.min); //  value 0~100
 @@ -211,7 +210,6 @@ class Fanv2Accessory extends BaseAccessory {
     };
   }


   tuyaParamToHomeBridge(name, param) {
     switch (name) {
       case Characteristic.On:
 @@ -244,45 +242,68 @@ class Fanv2Accessory extends BaseAccessory {
     }
   }

   /**
    * @param {string} code
    * @return {{}}
    */
   getDpFunction(code) {
     if (this.functionArr.length === 0) {
       return {};
     }
     return this.functionArr.find((item) => {
       return item.code === code
     })
   }

   /**
    * @param {string} code
    * @return {{min: number, max: number}}
    */
   getSpeedFunctionRange(code) {
     if (this.functionArr.length == 0) {
       return { 'min': 1, 'max': 100 };
     const funcDic = this.getDpFunction(code);
     if (!funcDic.code) {
       return DEFAULT_SPEED_RANGE;
     }
     var funcDic = this.functionArr.find((item, index) => { return item.code == code })
     if (funcDic) {
       let valueRange = JSON.parse(funcDic.values)
       let isnull = (JSON.stringify(valueRange) == "{}")
       return isnull ? { 'min': 1, 'max': 100 } : { 'min': parseInt(valueRange.min), 'max': parseInt(valueRange.max) };
       let isnull = (JSON.stringify(valueRange) === "{}")
       return isnull || valueRange.min === undefined || valueRange.max === undefined ?
         DEFAULT_SPEED_RANGE : {'min': parseInt(valueRange.min), 'max': parseInt(valueRange.max)};
     } else {
       return { 'min': 1, 'max': 100 };
       return DEFAULT_SPEED_RANGE;
     }
   }

   getSpeedFunctionLevel(code) {
     if (this.functionArr.length == 0) {
       return DEFAULT_SPEED_COUNT;
   /**
    * @param {string} code
    * @return {string[]}
    */
   getSpeedFunctionLevels(code) {
     const funcDic = this.getDpFunction(code);
     if (!funcDic.code) {
       return DEFAULT_SPEED_LEVELS;
     }
     var funcDic = this.functionArr.find((item, index) => { return item.code == code })
     if (funcDic) {
       let value = JSON.parse(funcDic.values)
       let isnull = (JSON.stringify(value) == "{}")
       return isnull || !value.range ? DEFAULT_SPEED_COUNT : value.range.length;
       let isnull = (JSON.stringify(value) === "{}")
       return isnull || !value.range || !Array.isArray(value.range) ? DEFAULT_SPEED_LEVELS : value.range;
     } else {
       return DEFAULT_SPEED_COUNT;
       return DEFAULT_SPEED_LEVELS;
     }
   }

   getBrightnessFunctionRange(code) {
     if (this.functionArr.length == 0) {
       return { 'min': 10, 'max': 1000 };
     const funcDic = this.getDpFunction(code);
     if (!funcDic.code) {
       return DEFAULT_BRIGHTNESS_RANGE;
     }
     var funcDic = this.functionArr.find((item, index) => { return item.code === code })
     if (funcDic) {
       let valueRange = JSON.parse(funcDic.values)
       let isnull = (JSON.stringify(valueRange) == "{}")
       return isnull ? { 'min': 10, 'max': 1000 } : { 'min': parseInt(valueRange.min), 'max': parseInt(valueRange.max) };
       let isnull = (JSON.stringify(valueRange) === "{}")
       return isnull || valueRange.min === undefined || valueRange.max === undefined ?
         DEFAULT_BRIGHTNESS_RANGE : { 'min': parseInt(valueRange.min), 'max': parseInt(valueRange.max) };
     } else {
       return { 'min': 10, 'max': 1000 }
       return DEFAULT_BRIGHTNESS_RANGE
     }
   }
