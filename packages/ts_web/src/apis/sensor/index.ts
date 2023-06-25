/**
 * Interface to Sensor APIs (DeviceMotionEvent, DeviceOrientationEvent) 
 * Of note, there is an actual "Sensor API" which I explored and looks robust but is not supported/available on my Pixel7 or IphoneXR (June 2023)
 * Thus I am not sure what the status of it is. Instead, the DeviceMotionEvent and DeviceOrientationEvent are working on both.
 * You can access the mobile devices accelerometer, orientation, ambient light sensor, etc and use the data stream in your custom app 
 * 
 * The DeviceMotion and DeviceOrientation apis are simply used by window event listeners  
 * Thus for the architecture of this package we will listen to the events and then allow other agents to subscribe to this package to receive the forwarded 
 * results. This architecture has several benefits, including ensuring that only one listener is registered and that any transformation or edits on top of the 
 * listener can be consolidated before distribution to any subscribing clients of the api 
 * 
 * @packageDocumentation 
 */

import {logger,fp} from "tidyscripts_common"

const log = logger.get_logger({id:'sensors'}) ;

var device_motion_active : boolean = false;
var device_orientation_active : boolean = false;


declare var window : any ; 
export var motion_subscribers : any  = {} ;
export var orientation_subscribers : any  = {} ;


/**
 * Logs the motion events to the console for n seconds 
 */
export function log_motion(n : number) {
  let id = "default.motion.logger"
  let handler = function(e :any) { 
    let {acceleration, rotationRate} = e ; 
    let {x,y,z} = acceleration ; 
    let {alpha, beta, gamma} = rotationRate ; 
    log(`x,y,z,alpha,beta,gamma=${x},${y},${z},${alpha},${beta},${gamma}`)
  }
  subscribe_to_motion(id, handler) ;
  window.setTimeout( function() {
    unsubscribe_motion_id(id)
  }, n*1000 )
  
}


/**
 * Logs the orientation events to the console for n seconds 
 */
export function log_orientation(n : number) {
  let id = "default.orientation.logger"
  let handler = function(e :any) { 
    let {alpha, beta, gamma} = e ; 
    log(`alpha,beta,gamma=${alpha},${beta},${gamma}`)
  }
  subscribe_to_orientation(id, handler) ;
  window.setTimeout( function() {
    unsubscribe_orientation_id(id)
  }, n*1000 )
  
} 


/**
 * Subscribe to motion events, for example ~> 
 * ```
 * let handler = function(e) { 
 *    let {acceleration, rotationRate} = e ; 
 *    let {x,y,z} = acceleration ; 
 *    let {alpha, beta, gamma} = rotationRate ; 
 *    console.log(`x,y,z,alpha,beta,gamma=${x},${y},${z},${alpha},${beta},${gamma}`)
 * } 
 * //now we use the function
 * subscribe_to_motion('unique_id', handler)
 * ```
 * 
 */
export function subscribe_to_motion(id : string, handler : (e :any) => any ) {
  start_device_motion() //only starts if not yet active
  if (motion_subscribers[id]) {
    log(`WARNING! motion subscription id ${id} has already been used`)
  } 
  motion_subscribers[id] = handler  ; 
} 


/**
 * Susbcribe to orientation events 
 * ```
 * let handler = function(e :any) { 
 *   let {alpha, beta, gamma} = e ; 
 *   console.log(`alpha,beta,gamma=${alpha},${beta},${gamma}`)
 * }
 * 
 * //now use the function 
 * subscribe_to_orientation('unique_id' , handler ) 
 * ```
 * 
 */
export function subscribe_to_orientation(id : string, handler : (e: any) => any ) {
  start_device_orientation() //only starts if not yet active
  if (orientation_subscribers[id]) {
    log(`WARNING! orientation subscription id ${id} has already been used`)
  } 
  orientation_subscribers[id] = handler ; 
} 


export function unsubscribe_motion_id(id : string) {
  delete motion_subscribers[id] ;
  log(`Unsubscribed motion id: ${id}`)
  if (fp.is_empty_array(fp.keys(motion_subscribers))) {
    //no more subscribers left; so we wil detach the event listener
    log(`No more motion subscribers; so listener will be detached`)
    stop_device_motion() ; 
  } 
} 

export function unsubscribe_orientation_id(id : string) {
  delete orientation_subscribers[id] ;
  log(`Unsubscribed orientation id: ${id}`)
  if (fp.is_empty_array(fp.keys(orientation_subscribers))) {
    //no more subscribers left; so we wil detach the event listener
    log(`No more orientation subscribers; so listener will be detached`)
    stop_device_orientation() ; 
  } 
} 



export function motion_handler(event : any) {
  //we pass the event to all the subscribers
  let handler_fns = fp.values(motion_subscribers) ;
  handler_fns.map( (f:any) => f(event) ) ; 
} 

export function orientation_handler(event : any) {
  //we pass the event to all the subscribers
  let handler_fns = fp.values(orientation_subscribers) ;
  handler_fns.map( (f:any) => f(event) ) ; 
} 



/**
 * Starts listening to the device's motion events via subscribing to the "devicemotion" event 
 */
export function start_device_motion() {
  if (!device_motion_active) {
    window.addEventListener('devicemotion',motion_handler) ;
    log("Started listening to device motion (registered handler") ; 
    device_motion_active = true ; 
  }
} 


/**
 * Starts listening to the device's orientation events via subscribing to the window "orientation" event 
 */
export function start_device_orientation() {
  if (!device_orientation_active) {
    window.addEventListener('deviceorientation',orientation_handler) ;
    log("Started listening to device orientation (registered handler") ; 
    device_orientation_active = true ; 
  }
  
}

export function stop_device_motion() {
  window.removeEventListener('devicemotion' , motion_handler)  
  device_motion_active = false ; 
  log("Unregistered device motion handler")
}

export function stop_device_orientation() {
  window.removeEventListener('deviceorientation' , orientation_handler)
  device_orientation_active = false ;     
  log("Unregistered device orientation handler") ;
} 



