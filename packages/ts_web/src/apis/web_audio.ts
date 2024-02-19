/*
 * 
 * This is a rewrite/upgrade of the audio apis that I created in the past
 */
import {logger,
	fp,
	asnc, 
	util} from "tidyscripts_common"

import * as bokeh from "./bokeh" 



/* declarations  */
declare var window : any ;
declare var Bokeh  : any ;
const dsp = util.dsp ;
const debug = util.debug; 

/* initializations  */
export var ctx : any = null ;
export var stream : any = null ;
export var analyser : any = null ;
export var sound_event_detector : any = null ;
const log = logger.get_logger({id : 'web_audio'}); 

/*
 * Returns the audio context
 */
export async function get_audio_context() {
    if (ctx) { return ctx } else {
	ctx = new window.AudioContext() ;
	stream = await window.navigator.mediaDevices.getUserMedia({audio:true}) ;
	return ctx 
    } 
}

/*
 * Return the audio stream 
 */
export async function get_audio_stream() {
    if (stream) { return stream } else {
	let ctx = await get_audio_context() ;
	return (await window.navigator.mediaDevices.getUserMedia({audio:true}))
    } 
} 

/*
 * Return the sampling rate 
 */
export async function get_sampling_rate() {
    let stream = await get_audio_stream()  ;
    return stream.getAudioTracks()[0].getSettings().sampleRate  ;
} 


/*
 * Decodes an arrayBuffer containing audio data into audio channel data 
 */
export async function decode_audio_array_buffer(arr_buff : any) {
    let ctx = await get_audio_context();
    return await ctx.decodeAudioData(arr_buff) ;
}

/*
 * Decodes a Blob containing audio data into audio channel data 
 */
export async function decode_audio_blob(blob : any) {
    return await decode_audio_array_buffer(await blob.arrayBuffer())  ; 
} 

/*
 * The mic callbacks object is a map of strings to functions and holds 
 * references to callback functions that wish to consume the microphone buffer 
 * data 
 */
export var mic_callbacks : any  = {}  ; 


/*
 * Registers a new callback function that consumes the microphone buffer data 
 */
export function register_mic_callback(id :string, cb : any) {
    mic_callbacks[id] = cb ; 
}

/*
 * Runs the mic callbacks
 */
export function run_mic_callbacks(data : Float32Array) {
    if (Object.keys(mic_callbacks).length > 0 ) { 
	fp.apply_function_dictionary_to_object(mic_callbacks,data) ;
    } 
}


export var mic_initialized = false;
export var data_array : Float32Array ; 

/*
 * Initialize microphone stream 
 */
export async function initialize_microphone() {
    if (mic_initialized) { return log('mic already initialized') }
    
    let ctx          = await get_audio_context() ;
    let stream       = await get_audio_stream() ;

    let source       = ctx.createMediaStreamSource(stream);
    analyser         = ctx.createAnalyser(); analyser.fftSize = 2048;
    data_array       = new Float32Array(analyser.frequencyBinCount);

    source.connect(analyser);

    function update() {
	requestAnimationFrame(update);
	analyser.getFloatTimeDomainData(data_array);
	run_mic_callbacks(data_array);
    }


    mic_initialized = true;
    update() 

}


export var a1 = new Float32Array(1024)
export var a2 = new Float32Array(1024) 

export async function test_diff(ms : number) {
    log(`testing diff with ${ms} ms`)  ;
    analyser.getFloatTimeDomainData(a1) ;
    //log(`Waiting ${ms} ms`)  ;    
    window.setTimeout( function() {
	analyser.getFloatTimeDomainData(a2) ;
	let equal = (JSON.stringify(a1) == JSON.stringify(a2))
	log(`Equality = ${equal}`)
    }, ms) 
}

/*
 * Get/Initialize sound detector 
 */
export async function get_sound_event_detector(_ops : any) {
    await initialize_microphone() ;
    // - 
    if (sound_event_detector) {
	log(`sound event detector already initialized`)
	return sound_event_detector
    }
    // - 
    let default_ops = {
	threshold : 0.2 ,
	margin : 600 ,
	audio_buffer_size : data_array.length , 
	register_fn : register_mic_callback  
    }
    // -     
    let ops = Object.assign(default_ops, _ops) ; //overwrite defaults  
    sound_event_detector = new SoundEventDetector(ops) ;
    await sound_event_detector.init()
    return sound_event_detector ; 
} 

/*
 * SoundEvent Detector class 
 * Abstraction for detecting "sound events" which can then be 
 * Analyzed for speech, etc 
 * It is initialized with parameters 
 * - threshold (-1,1): initializes and terminates detection
 * - margin: time spent below threshold before the event is ended 
 * - register_fn : function for linking to the microphone 
 */
export class SoundEventDetector extends window.EventTarget {

    threshold : number;
    margin : number;
    register_fn : any ;
    log : any; 
    audio_buffer_size : number; 
    sampling_rate : number;
    tmp_buffer  : any ;
    tmp_buffer_max_length : number;  
    recording_event : boolean ;
    event_start_time : number ;
    time_of_last_detection : number ;
    media_recorder : any ; 
    
    constructor( ops : any ) {
	super() 
	let {
	    threshold,
	    margin,
	    register_fn ,
	    audio_buffer_size, 
	} = ops ;

	this.threshold = threshold ; 
	this.margin = margin; 
	this.register_fn  = register_fn ;
	this.log  = logger.get_logger({id : 'snd_evt'}) ;
	this.sampling_rate  = 48000 ;//this will get updated in init
	this.audio_buffer_size    = audio_buffer_size ; 
	this.tmp_buffer = [ ];
	this.tmp_buffer_max_length = 10 ; //this will get updated in init
	this.recording_event  = false;
	this.event_start_time =  0 ;
	this.time_of_last_detection = performance.now() ;

	this.media_recorder = null ; 
	
	
    }

    async init() {
	
	let detector_ref = this ; 
	this.register_fn('SED', function(f32 : Float32Array) {
	    detector_ref.handle_data(f32) 
	})
	this.log(`Linked sound event detector to audio source`) ;
	this.sampling_rate = await get_sampling_rate()
	this.log(`Got sampling rate ${this.sampling_rate}`) ;

	//prep the tmp_buffer object
	let n_buffers = this.num_buffers_to_cover_margin() ; 
	//this.log(`To track a margin of ${this.margin} ms, tmp_buffer will need to hold ${n_buffers} audio_buffers of size ${this.audio_buffer_size} samples`) ;
	this.log(`Created tmp buffer of size ${n_buffers}`); 
	this.tmp_buffer_max_length = n_buffers ;
	this.tmp_buffer = fp.range(0,n_buffers).map( (i:number) => new Float32Array(this.audio_buffer_size) )

	let stream = await get_audio_stream() ; 
	this.media_recorder = new window.MediaRecorder(stream) ;
	this.log(`Initialized media recorder`) 

	
    } 

    handle_data(f32 : Float32Array) {
	/*
	   Todo: 
	   - TmpBuffer holds the last 'margin' ms of data 
	   - listen to incoming data and if the threshold is reached for "margin" seconds: 
	       - copy TmpBuffer into the EventBuffer 
	       - start appending new data to the EventBuffer 
	       - trigger event "EventStarted"  
	   - continue listening and appending UNTIL y(x) < threshold for "margin" seconds 
	   - concatenate the EventBuffer into one buffer of Float32Data 
	   - trigger event "EventEnded" 
	       - this will contain the copied EventBuffer and relevant transforms
	   - clear the EventBuffer and the TmpBuffer 
	   - repeat 

	 */

	this.tmp_buffer.shift()    //remove first element of tmp_buffer
	this.tmp_buffer.push(f32)  //add the current data to the tmp_buffer
	this.analyze_tmp_buffer()  //perform analysis on the existing samples 	

	return 
	
    }

    analyze_tmp_buffer() {
	/*
	 * Tmp buffer is Array of Float32Arrays where each is an individual audio buffer from 
	 * the mic; lasting around 20ms 
	 */

	let tmp_buffer = this.tmp_buffer;

	//The threshold is met if all audio_buffers in the tmp buffer
	//have mean_abs intensity above the threshold 
	let threshold_met = fp.all_true( tmp_buffer.map( (d:Float32Array)=> {
	    return (dsp.mean_abs(d) > this.threshold) 
	}))
	

	//There are two main states; either recording an event or waiting for an event
	
	if (this.recording_event) {

	    //if an event is recording but the threshold is met then we continue recording
	    //and update the var:
	    if (threshold_met) {
		this.time_of_last_detection = performance.now() ;
		return ; 
	    }
	    
	    //If an event is recording but threshold is not met we check to see if it is now quiet 
	    let quiet_met = fp.all_true( tmp_buffer.map( (d:Float32Array)=> {
		return (dsp.mean_abs(d) < this.threshold) 
	    }))

	    let time_since_last_detection = (performance.now() - this.time_of_last_detection)
	    let time_met = (time_since_last_detection > this.margin ) 
	    
	    if (quiet_met && time_met) {
		this.log(`Detected quiet while recording event...`)
		//if it is quiet then we should stop recording 
		this.recording_event = false;
		this.media_recorder.stop() ; 
		this.log(`Stopped recording`); 
	    } 
	    
	    
	} else {
	    //If an event is not being recorded we need to check if there is now sound 
	    
	    if (threshold_met) {
		//start recording
		let ref = this ; 
		this.media_recorder.ondataavailable = function(e:any){
		    //console.log("Data available")
		    //console.log(e) 
		    //debug.add('data', e) 
		    let blob = e.data ; 
		    //then fire an event with the data
		    let evt = new window.CustomEvent("sound_event_ended", {
			detail : blob, 
		    }) ;
		    
		    ref.dispatchEvent(evt) ;
		}
		this.media_recorder.start() ;
		this.log(`Detected event start`) ;
		this.time_since_last_detection = performance.now() ; 
		let evt = new window.Event("sound_event_started");
		(this as any).dispatchEvent(evt) ; 
		this.recording_event = true;
		this.event_start_time = util.unix_timestamp_ms() ; 
	    } 
	    
	}
	
	
    } 
    
    samples_to_ms(n_samples :number) {
	return 1000 * n_samples / this.sampling_rate 
    }

    ms_to_samples(ms : number) {
	return  ms * this.sampling_rate / 1000  
    }

    /*
     * Determines the number of buffers that are needed to span the margin timespan 
     */
    num_buffers_to_cover_margin() {
	let margin_n_samples = this.ms_to_samples(this.margin) ;
	return Math.ceil( margin_n_samples / this.audio_buffer_size ) ; 
    } 
    
} 

export async function plot_data(data : any , el : string) {

    await bokeh.load_bokeh_scripts() ; 
    
    // create some data and a ColumnDataSource
    const x = fp.range(0,data.length) 
    const y = Array.from(data)
    const source = new Bokeh.ColumnDataSource({ data: { x: x, y: y } });

    let ops = {width: 300, height : 100}
    const plot = new Bokeh.Plot(ops); 

    // add axes to the plot
    const xaxis = new Bokeh.LinearAxis({ axis_line_color: null });
    const yaxis = new Bokeh.LinearAxis({ axis_line_color: null });
    plot.add_layout(xaxis, "below");
    plot.add_layout(yaxis, "left");

    // add grids to the plot
    const xgrid = new Bokeh.Grid({ ticker: xaxis.ticker, dimension: 0 });
    const ygrid = new Bokeh.Grid({ ticker: yaxis.ticker, dimension: 1 });
    plot.add_layout(xgrid);
    plot.add_layout(ygrid);

    // add a Line glyph
    const line = new Bokeh.Line({
	x: { field: "x" },
	y: { field: "y" },
	line_color: "#666699",
	line_width: 2
    });
    plot.add_glyph(line, source);


    Bokeh.Plotting.show(plot,document.getElementById(el)) ; 
    

}
