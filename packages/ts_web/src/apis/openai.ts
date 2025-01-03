import * as common from "tidyscripts_common"
let { get_json_from_url } = common ; 
let {OpenAI} = common.apis ; 

var openai : any = null ;
declare var localStorage : any ;
declare var window : any ;
declare var Audio : any ;
declare var URL  : any ; 

const log = common.logger.get_logger({id : 'open_ai_web'})
const debug = common.util.debug ; 

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
export async function text_to_audio(args : any) {
    let response = await tts_response(args) ;
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
 * Returns the openai TTS response , allows params
 */
export async function tts_response(args: any) {
    let openai = get_openai() ;
    let response = await openai.audio.speech.create(args) 
    return response 
} 


/**
 * DEPRECATED 
 * Uses the tidyscripts openai davinci api to answer a text based prompt 
 */
export async function openai_davinci_prompt(prompt : string, max_tokens  : number ) {
  return await get_json_from_url("https://www.tidyscripts.com/api/openai_davinci" , {prompt , max_tokens})
}


/**
 * This function takes arguments for an openai llm chat completion (either structured or unstructured) and 
 * and passes them to the Tidyscripts openai endpoints for completion 
 * If response_format is included in the arugments then the structured_completion beta endpoint is used
 * Otherwise the standard chat endpoint is used 
 * @param args - Args to pass to openai chat endpoint 
 */
export async function proxied_chat_completion(args : any) {

    /*
       Take the args and pass it to the vercel function instead 
     */

    let url = "/api/open_ai_chat_2"

    //if the args contain the response_format field then we need to make a call to the structured endpoint instead
    if (args.response_format) {
	log(`Detected request for structured completion`)
	url = "/api/openai_structured_completion"
	log(`Switching URL to ${url}`)
	debug.add('chat_completion_args' , args ) 
    } 

    
    let fetch_response = await fetch(url, {
	method : 'POST' ,
	headers: {   'Content-Type': 'application/json'   },
	body : JSON.stringify(args)
    });
    
    debug.add("fetch_response" , fetch_response) ;
    let response = await fetch_response.json() ;
    debug.add("response" , response) ;

    return response 
    

}




export async function sendAudioBlobToOpenAI(blob: Blob) {

    let oai = get_openai() ; 
    let api_key  = localStorage['OAAK'] ;
    
    // Step 1: Prepare the FormData object with the audio file
    const formData = new FormData();
    
    // Append the Blob as a file with a suitable name and type
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');  // The model we are using

    try {
        // Step 2: Send the FormData to the OpenAI API
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${api_key}`
            },
            body: formData
        });

        // Step 3: Handle the API response
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        // Parse the JSON response
        const transcription = await response.json();
        log(`Transcription: ${transcription.text}`);
        return transcription.text;  // Return the transcribed text
    } catch (error) {
        console.error("Error while sending audio to OpenAI:", error);
    }
}
