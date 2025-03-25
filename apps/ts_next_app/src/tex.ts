/**
 * TEX: A powerful library for managing vector stores in the browser, built on top of TypeScript.
 */ 


'use client'; 

import * as fu from './firebase_utils';
import * as tsw from "tidyscripts_web";

import * as tdf from "./text_definitions" 

import sources from "./text_sources"


/* create logger and debugger */ 
const log    = tsw.common.logger.get_logger({id : 'tex'})  ; 
const debug  = tsw.common.util.debug
const oai    = tsw.common.apis.oai
const fp    = tsw.common.fp
const tnlp    = tsw.common.apis.tnlp    

/* params */ 
const app_id = 'tex';
const DEFAULT_CHUNK_SIZE = 1024;
const DEFAULT_EMBEDDING_SIZE = 1024;


/*
   Notes:
   - to test, upload a source document and get its sid
   let sid = await create_source(source_info)
   - then, compute the embeddings
   let error = await compute_and_upload_embeddings_for_sid(sid) 

   - create index on the "embedding" field    
 */

export async function test_1(i : number) {
    // - to test, upload a source document and get its sid
    let sid = await create_source(sources[i]); 
    //- then, compute the embeddings
    let error = await compute_and_upload_embeddings_for_sid(sid) 
} 

interface SourceInfo {
    content : string;
    metadata : any  
}


export async function get_sid(si : SourceInfo ) {
    return await tsw.common.apis.cryptography.object_sha256(si) 
} 

export async function create_source(source_info: SourceInfo) {

    let sid = await get_sid(source_info) 
    log(`computed sid: ${sid}`) 

    // Check if the source already exists
    let existingSource = await retrieve_source(sid) as SourceInfo
    
    if (existingSource) {
	throw new Error(`Source with ID ${sid} already exists.`);
    }

    // Store the source information in a Firestore document
    await fu.store_user_doc({
	app_id,
	path: ['spaces', 'source_space', sid],
	data: source_info 
    })

    log(`Source with sid=${sid} successfully created`);    

    return sid 

}

export async function retrieve_source(sid : string) {
    return await fu.get_user_doc({
	app_id,
	path: ['spaces', 'source_space',sid]
    });
}


interface EmbeddingInfo {
    metadata : any , 
    start : number,
    end : number ,
    embedding : number[] 
}


export async function upload_embedding(embedding_info: EmbeddingInfo) {

    // Store the embedding information in a Firestore document
    try { 
	await fu.store_embedding_function(embedding_info) ;
	let { metadata, start, end } = embedding_info ; 
	log(`Uploaded embedding for sid=${metadata.sid}, chars=${start}-${end}`)
	return false
    } catch (e : any) {
	log(`Error storing embedding: ${e}`)
	return true 
    } 

    
}

export async function vector_search(query_vector : number[] , limit : number ) {

    // Retrieve vectors that are similar 
    try { 
	return await fu.retrieve_embedding_function({query_vector, limit}) ; 
	log(`Retrieved embedding`) 
    } catch (e : any) {
	log(`Error retrieving embedding: ${e}`)
	return null 
    } 


    
} 


interface TexConfig {
    chunk_size : number ,
    embedding_size : number , 
} 

export async function set_tex_config(data : TexConfig ) {
    log(`Setting new config object: ${JSON.stringify(data)}`)
    // - 
    let path = 	['active_config'];
    // - 
    log(`Path: ${path}`)
    // - 
    await fu.store_user_doc({ app_id, path , data  }) ;
    // - 
    log(`Done`) 
} 

export async function get_tex_config() {

    // - 
    let path = 	['active_config'];
    // -
    let config = await fu.get_user_doc({ app_id, path }) ;
    if (!config)  {
	log(`No active config, will set it now`) 
	await set_default_tex_config()
	return get_default_tex_config() 
    } else {
	log(`Retrieved active config, will use it`) 	
	return config 
    } 
    
} 

//https://cloud.google.com/blog/products/databases/get-started-with-firestore-vector-similarity-search

export function get_default_tex_config(){
    return {chunk_size : DEFAULT_CHUNK_SIZE, embedding_size : DEFAULT_EMBEDDING_SIZE}    

}

export async function set_default_tex_config() {
    await set_tex_config(get_default_tex_config()) ;
}


export async function validate_sid(sid: string, si : SourceInfo) {
    let _sid = await get_sid(si) ;
    if (_sid != sid ) {
	throw new Error(`Computed sid=${_sid} does not match provided=${sid}`)
    } else {
	log(`sid=${sid} is valid`) 
    } 
} 

export async function compute_and_upload_embeddings_for_sid(sid : string, _source_info? : SourceInfo) {
    var source_info : SourceInfo ;
    if (_source_info) {
	log(`Source info provided`)
	await validate_sid(sid, _source_info)	
	source_info = _source_info ;
    } else {
	
	log(`Retrieving source info`)
	source_info  = await retrieve_source(sid)  as SourceInfo;
	if (!source_info) { throw new Error(`Unable to find source ${sid}`) }
	await validate_sid(sid, source_info)		
    }

    //now we have the source info, and the source id , and they are validated
    //so next step is to compute emeddings

    let {embedding_data,chunks} = await generate_embeddings_from_source_info(source_info) ;

    embedding_data.map( (ed : any) => {
	ed.metadata = {sid} 
    })

    await Promise.all(   embedding_data.map( (ei : EmbeddingInfo) => {
	return upload_embedding(ei) 
    }))

    log(`Done!`)

    return false
    
}

/*
   To optimize: 
   1) express embedding functions as strings so they can be hashed into the args 
   2) modify the code to allow for storing hashes with the embedding objects in embedding space 
       -- so that we can tell what paraemters were used to generate that embedding 
   
*/

export async function generate_embeddings_from_source_info(si : SourceInfo ) {
    let { embedding_size, chunk_size } = await get_tex_config() as TexConfig ;
    
    let embedding_function = async (text : string) => {
	return await oai.get_embedding(text, embedding_size)
    }

    let {content} = si; 
    let embed_params = {chunk_size,content,embedding_function}

    return await get_embedding_data(embed_params) ; 

}


type EmbeddingFunction = (text: string) => Promise<number[]>;

interface EmbedParams {
    chunk_size: number;
    content: string;
    embedding_function: EmbeddingFunction;
}

/** 
 *  Function for embedding source text 
 *
 **/
export async function get_embedding_data(params: EmbedParams)  {

    var { chunk_size, content, embedding_function } = params;

    var chunks = chunk_text_by_sentence(content, chunk_size) 
    var embedding_data : any = [ ] 
    
    for (let i = 0; i < chunks.length; i ++ ) {
	let {content, start, end } = chunks[i]
	log(`Embedding chunk: ${i}/${chunks.length}`)
	let embedding = await embedding_function(content) ; 
	embedding_data.push( {start,end, embedding} )  
    }

    return {chunks,embedding_data}
}





/*
   Other Todos : 
   - create script for generating JSON array of SourceInfo objects "i.e. sources" 
   - for example using scraper to generate json file on disk, then upload json file into source 
   - code of web app 
   - call sources.map( source => create_and_embed_src(source) ) 
   - consider change to  eid = hash  ( SourceInfo) format  
   - calculate cost of embedding (build into oai lib) 
 */




export { tdf , sources }  



/**
 * Splits text into chunks of approximately CHUNK_SIZE characters without splitting sentences.
 * This uses compromise to detect sentences, then build chunks with those sentences 
 * However it then extracts the chunk from the original text using the start/end sentences 
 * in order to preserve whitespace formatting
 *
 * @param text - The input text to be chunked.
 * @param chunk_size - The approximate size of each chunk in characters.
 * @returns An array of objects with {content, start, end} where start and end are character indexes 
 */
export function chunk_text_by_sentence(text: string, chunk_size: number)  {
    if (!chunk_size || (chunk_size <= 0) ) {
        throw new Error('chunk_size must be greater than 0.');
    }

    const sentences = tnlp.get_sentences(text) ; 
    const chunks: any[] = [];

    let current_chunk: string[] = [];
    let current_chunk_length = 0;

    let start = 0 ;
    let end   = null ;
    
    for (var i = 0; i < sentences.length ; i++) {

	let sentence = sentences[i]
        const sentence_length = sentence.length;

        // If adding the sentence exceeds chunk_size, finalize the current chunk
        if (current_chunk_length + sentence_length > chunk_size) {

	    let chunk_data = get_chunk_data(current_chunk, text) 

            chunks.push(chunk_data);
	    start = i ; 
            current_chunk = [];
            current_chunk_length = 0;
        }

        // Add the sentence to the current chunk
        current_chunk.push(sentence);
        current_chunk_length += sentence_length;
    }

    // Add any remaining sentences as the last chunk
    
    if (current_chunk.length > 0) {

	let chunk_data = get_chunk_data(current_chunk, text) 
        chunks.push(chunk_data) ; 
    }

    return chunks;
}


export function get_chunk_data(chunk_array : string[], txt : string) {

    let first_sentence = fp.first(chunk_array) ;
    let last_sentence  = fp.last(chunk_array);
    
    let start = txt.indexOf(first_sentence ) ;
    let end   = txt.indexOf(last_sentence) + last_sentence.length ;

    if ( start < 0 || end < 0 ) {
	throw new Error("sentence extraction failed!")
    }

    let content = txt.slice(start, end) ;
    return {
	content,
	start,
	end 
    } 
    
} 
