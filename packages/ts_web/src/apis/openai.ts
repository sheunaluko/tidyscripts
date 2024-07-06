import * as common from "tidyscripts_common"
let { get_json_from_url } = common ; 
let {OpenAI} = common.apis ; 

var openai : any = null ;
declare var localStorage : any ;
declare var window : any ;
declare var Audio : any ;
declare var URL  : any ; 

const log = common.logger.get_logger({id : 'open_ai_web'})

/**
 * Retrieves the API Key from localStorage under 'OAAK' ; returns alert if missing 
 * If successful returns the OpenAI javascript libarary 
 */
export function get_openai() {
    if (openai ) {
	log(`OpenAI already initialized`) ; 
	return openai
    } else {
	log(`Initializing open api in browser`)
	let api_key  = localStorage['OAAK'] ;
	if (!api_key) {
	    let msg = 'Unable to find API key; please make sure api key is under "OAAK" in local storage'
	    log(msg)
	    window.alert(msg);
	    return 1 
	} else {
	    openai = new OpenAI({apiKey : api_key , dangerouslyAllowBrowser : true })
	    log(`Complete`) 
	    return openai

	} 
    } 
} 

/**
 * TTS. Uses openai api to generate speech; loads it into an audio element and starts the speech. 
 * Returns the audio element which can be paused, etc ; as well as the blob which can be evaluated 
 * for raw audio waveform 
 */
export async function speak(input : string) {
    log(`Request to speak ${input}`) ; 
    let audio = await text_to_audio(input) ;
    log(`Retrieved audio data from openai`) ;
    log(`Playing audio and returning data`) ; 
    audio.audio_element.play();
    return audio 
}


/**
 * Converts input text into a blob and corresponding audio element which are both returned. 
 * The blob can be used for the raw audio data 
 * The audio element can play the audio using Element.play() and Element.pause() 
 */
export async function text_to_audio(input : string) {
    let response = await get_openai_tts_response(input) ;
    //convert response to blob
    let blob = await response.blob() 
    //get blob url
    let url = URL.createObjectURL(blob) 
    //create audio element
    let audio_element = (new Audio(url))  ; 
    return  { audio_element , blob } 
} 

/**
 * Returns the openai TTS response 
 */
export async function get_openai_tts_response(input : string) {
    let openai = get_openai() ;
    let response = await openai.audio.speech.create({
	model: "tts-1",
	voice: "alloy",
	input  
    })
    return response 
} 

/**
 * DEPRECATED 
 * Uses the tidyscripts openai davinci api to answer a text based prompt 
 */
export async function openai_davinci_prompt(prompt : string, max_tokens  : number ) {
  return await get_json_from_url("https://www.tidyscripts.com/api/openai_davinci" , {prompt , max_tokens})
}

