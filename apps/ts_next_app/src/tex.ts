/**
 * TEX: A powerful library for managing vector stores in the browser, built on top of TypeScript.

 * **Key Features:**
 * - **Source Space Management:** Efficiently stores and retrieves source information, including text content, embedding IDs, descriptions, and source URLs.
 * - **Embedding Space Integration:** Seamlessly integrates with embedding generation processes, allowing you to create and manage high-quality embeddings.
 * - **Firebase Backend Integration:** Leverages the Firebase backend to store and retrieve source and embedding data reliably.
 * - **Flexible Configuration:** Customizable configuration options to tailor TEX to your specific needs.

 * **Core Function:**
 * - **`create_source(source_info)`:**
 *   - Checks for existing sources based on the provided `eid`.
 *   - Stores the source information in the `tex.source_space` collection in Firestore.
 *   - Triggers embedding generation and storage processes (implementation details not shown).

 * **Usage:**
 * ```typescript
 * import { create_source } from 'tex';

 * const sourceInfo = {
 *   data: 'This is a sample text document.',
 *   eid: 'doc123',
 *   description: 'A descriptive text document',
 *   source: '[invalid URL removed]'
 * };

 * create_source(sourceInfo)
 *   .then(() => console.log('Source created successfully'))
 *   .catch(error => console.error('Error creating source:', error));
 * ```

 * **Configuration:**
 * - **`tex_config.json`:**
 *   - `chunk_size`: The maximum number of tokens in a single input sequence.
 *   - `vector_size`: The dimensionality of the output embedding vectors.

 * By leveraging TEX, you can efficiently manage and utilize embeddings for a wide range of applications, including semantic search, document summarization, and recommendation systems.
 */


'use client'; 

import * as fu from './firebase_utils';
import * as tsw from "tidyscripts_web";

import * as tdf from "./text_definitions" 


/* create logger and debugger */ 
const log    = tsw.common.logger.get_logger({id : 'tex'})  ; 
const debug  = tsw.common.util.debug
const oai    = tsw.common.apis.oai   

/* params */ 
const app_id = 'tidyscripts';



export const test_sources: { data: string; eid: string; description: string; source: string; }[] = [
  {
    data: tdf.test_text_1 , 
    eid: "source1",
    description: "Test data for a red fox",
    source: "http://www.example.com/fox1",
  },
  {
    data: "This is another test document about a sly fox.",
    eid: "source2",
    description: "Test data for a sly fox",
    source: "http://www.example.com/fox2",
  },
  {
    data: "We can describe the habitat of a fox in this text.",
    eid: "source3",
    description: "Test data for fox habitat",
    source: "http://www.example.com/fox3",
  },
  {
    data: "The quick brown fox jumps over the lazy dog. (Classic pangram)",
    eid: "source4",
    description: "Test data with a pangram",
    source: "http://www.example.com/pangram",
  },
  {
    data: "This test explores the social behavior of foxes.",
    eid: "source5",
    description: "Test data for fox behavior",
    source: "http://www.example.com/fox4",
  },
  {
    data: "Here's an example of a longer test document about foxes.",
    eid: "source6",
    description: "Longer test data with fox information",
    source: "http://www.example.com/fox5",
  },
  {
    data: "We can also include information about different fox species.",
    eid: "source7",
    description: "Test data for fox species",
    source: "http://www.example.com/fox6",
  },
  {
    data: "This test focuses on the hunting techniques of foxes.",
    eid: "source8",
    description: "Test data for fox hunting",
    source: "http://www.example.com/fox7",
  },
  {
    data: "Let's explore the cultural significance of foxes in different societies.",
    eid: "source9",
    description: "Test data for fox cultural significance",
    source: "http://www.example.com/fox8",
  },
  {
    data: "The final test document provides a brief overview of fox biology.",
    eid: "source10",
    description: "Test data for fox biology",
    source: "http://www.example.com/fox9",
  },
];

interface SourceInfo {
  data: string;
  eid: string;
  description: string;
  source: string;
}


export async function create_source(source_info: SourceInfo) {
  const { eid } = source_info;

  // Check if the source already exists
  const existingSource = await fu.get_user_doc({
    app_id,
    path: ['tex', 'source_space', eid]
  });

  if (existingSource) {
    log(`Source with ID ${eid} already exists.`);
    return;
  }

  // Store the source information in a Firestore document
  await fu.store_user_doc({
    app_id,
    path: ['tex', 'source_space', eid],
    data: source_info,
  });

}



interface EmbeddingInfo {
    eid: string, 
    start : number,
    end : number ,
    embedding : number[] 
}


export async function upload_embedding(embedding_info: EmbeddingInfo) {
  const { eid } = embedding_info ;

  // Store the embedding information in a Firestore document
  await fu.store_user_collection({
    app_id,
    path: ['tex', 'embedding_space'],
    data: embedding_info,
  });

}





interface TexConfig {
    chunk_size : number ,
    embedding_size : number , 
} 

export async function set_tex_config(data : TexConfig ) {
    log(`Setting new config object: ${JSON.stringify(data)}`)
    // - 
    let path = 	['tex', 'settings'  , 'active_config'];
    // - 
    log(`Path: ${path}`)
    // - 
    await fu.store_user_doc({ app_id, path , data  }) ;
    // - 
    log(`Done`) 
} 

export async function get_tex_config() {

    if (storage.config ) {
	return storage.config ; 
    } 
    // - 
    let path = 	['tex', 'settings'  , 'active_config'];
    // -
    let config =  await fu.get_user_doc({ app_id, path }) ;
    
    log(`setting local storage.config`) ;
    storage.config = config ;
    
    return config 
} 


export async function set_default_tex_config(){
    let chunk_size = 1024;
    let embedding_size = 512; 
    let config = await set_tex_config({chunk_size, embedding_size}) ;
}



type EmbeddingFunction = (text: string) => Promise<number[]>;

interface EmbedParams {
    chunk_size: number;
    input_text: string;
    embedding_function: EmbeddingFunction;
}

/** 
 *  Function for embedding source text 
 *
 **/
export async function embed_src(params: EmbedParams)  {
    /*
       WARNING! Input text is trimmed ; so when going from embedding back to source location  
       will have to trim the input text before indexing 
     */ 
    var { chunk_size, input_text, embedding_function } = params;

    input_text = input_text.trim() ;
    
    // Split the input text into chunks of specified size
    const data = [ ]
    
    for (let i = 0; i < input_text.length; i += chunk_size) {
	let start = i ;
	let end = i + chunk_size  ; 
        let chunk = input_text.slice(start , end) ; 
	let embedding = await embedding_function(chunk) ; 
	data.push( {start,end, embedding} )  
    }

    return data 
    
}



export var storage : any  = { } ; 

export async function test_embed()  {
    
    return await embed_text_with_default_params(tdf.test_text_1) ;
    
}

export async function embed_text_with_default_params(input_text : string)  {
    
    let { embedding_size, chunk_size } = await get_tex_config() ;
    
    let embedding_function = async (text : string) => {
	return await oai.get_embedding(text, embedding_size)
    }

    let data = await embed_src({chunk_size,input_text,embedding_function})

    return data ; 

    
} 


export async function create_and_embed_src(source_info : SourceInfo) {
    
    source_info.data = source_info.data.trim() ;
    await create_source(source_info) ;
    //now we get emedding data
    let embedding_data = await embed_text_with_default_params(source_info.data)

    for (var ed of embedding_data) {
	
	let {start,end, embedding} = ed ; 
	let einfo = {
	    eid : source_info.eid ,
	    start , 
	    end ,
	    embedding
	}

	await upload_embedding(einfo) ; 
	
    } 

}

/*
   Todo: 
     - create index on the "embedding" field 

     - create script for generating JSON array of SourceInfo objects "i.e. sources" 
        - for example using scraper to generate json file on disk, then upload json file into source 
        - code of web app 
     - call sources.map( source => create_and_embed_src(source) ) 
     - consider change to  eid = hash  ( SourceInfo) format  

   - calculate cost of embedding (build into oai lib) 
 */




export { tdf }  
