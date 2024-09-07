[**Tidyscripts Docs**](../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../globals.md) / [web](../../../../README.md) / [apis](../../README.md) / sensor

# sensor

Interface to Sensor APIs (DeviceMotionEvent, DeviceOrientationEvent) 
Of note, there is an actual "Sensor API" which I explored and looks robust but is not supported/available on my Pixel7 or IphoneXR (June 2023)
Thus I am not sure what the status of it is. Instead, the DeviceMotionEvent and DeviceOrientationEvent are working on both.
You can access the mobile devices accelerometer, orientation, ambient light sensor, etc and use the data stream in your custom app 

The DeviceMotion and DeviceOrientation apis are simply used by window event listeners  
Thus for the architecture of this package we will listen to the events and then allow other agents to subscribe to this package to receive the forwarded 
results. This architecture has several benefits, including ensuring that only one listener is registered and that any transformation or edits on top of the 
listener can be consolidated before distribution to any subscribing clients of the api

## Index

### Variables

- [motion\_subscribers](variables/motion_subscribers.md)
- [orientation\_subscribers](variables/orientation_subscribers.md)

### Functions

- [log\_motion](functions/log_motion.md)
- [log\_orientation](functions/log_orientation.md)
- [motion\_handler](functions/motion_handler.md)
- [orientation\_handler](functions/orientation_handler.md)
- [start\_device\_motion](functions/start_device_motion.md)
- [start\_device\_orientation](functions/start_device_orientation.md)
- [stop\_device\_motion](functions/stop_device_motion.md)
- [stop\_device\_orientation](functions/stop_device_orientation.md)
- [subscribe\_to\_motion](functions/subscribe_to_motion.md)
- [subscribe\_to\_orientation](functions/subscribe_to_orientation.md)
- [unsubscribe\_motion\_id](functions/unsubscribe_motion_id.md)
- [unsubscribe\_orientation\_id](functions/unsubscribe_orientation_id.md)
