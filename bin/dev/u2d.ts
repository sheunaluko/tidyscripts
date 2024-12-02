import node from "../../packages/ts_node/dist/index";
import common from "../../packages/ts_common/dist/index";

const log = common.logger.get_logger({id : "u2d"}) ;

declare var global : any ;

const ax = common.asnc ; 
const debug = common.util.debug; 

/*
   
   Notes - 
   Pausing work here; there is rate limiting that occurs when not logged in as well as when logged in
 */ 

log(`Init u2d`)

type Page = any ; 

export const P = node.puppeteer ;
export const pause_delay = 10000   ;
export const u2d_data_dir = "/home/oluwa/data/u2d/"
export const u2d_ID_dir = "/home/oluwa/data/u2d_subsets/infectious_disease/"
export const u2d_out_dir = "/home/oluwa/data/u2d_article_data" 


export async function init() {
    log(`Running u2d`)

    let p = await P.new_page({}) ;

    await goto_toc(p) ; 

    return p ; 
}

export async function pause(p : Page) {
    log(`Pausing`) 
    await ax.wait(pause_delay)
} 

export async function main(p : Page) {

    log(`Running main function`)
    
    // assumes we are logged in on the TOC page
    let topic_info = await get_topics_or_sub_topics(p)  ;

    // -- 
    log(`Got topics`)
    debug.add('topic_info' , topic_info) 

    // for each of the topics
    for (var i =0 ; i < topic_info.length ; i ++ ) {
	let {topic, link} = topic_info[i];
	log(`Processing topic=${topic}, so going to page: ${link}`)
	await p.goto(link); await pause(p)  ;
	
	// now we loop through the subtopics
	log(`Getting subtopics`) 
	let subtopic_info = await get_topics_or_sub_topics(p)
	debug.add('subtopic_info' , subtopic_info) 	

	for (var x =0 ; x < subtopic_info.length ; x ++ ) {
	    let sti = subtopic_info[x]
	    let subtopic = sti.topic ;
	    let subtopic_link = sti.link ;


	    //check if we have already create this filepath
	    let fpath = fpath_from_args({ topic, subtopic }) ;	    
	    if (! node.io.exists(fpath)) {
		// --- 
		log(`Processing subtopic=${subtopic}, so going to page: ${subtopic_link}`)
		await p.goto(subtopic_link); await pause(p)  ;

		log(`Retrieving article data`)
		let article_data = await get_articles_from_sub_topic(p) ;
		debug.add('article_data', article_data)  ;

		//now we can update the file directory with the information
		await write_to_disk( {topic,
				      topic_link : link ,
				      subtopic ,
				      subtopic_link ,
				      article_data })
		
	    } else {
		//we have already written this one so no need
		log(`Skipping ${fpath}, (already wrote to disk)`) ; 
	    }

	}
    }


}

export async function write_to_disk(args : any) {

    let path = node.io.path ;
    
    let fpath = fpath_from_args(args)
    
    let data = args ;
    debug.add("fpath" , fpath)  

    //write the data now
    write_json_subfile({fpath, data}) ;

    //and log result
    log(`Finished writing json data to ${fpath}`) 
    
}

const to_path = (t:string) => (t.trim().replace(/ /g, "_").replace(/\//g,"|").replace(/"/g,"").replace(/'/g,"").trim() ) 


export  function fpath_from_args(args : any) {
    //de-structure the arguments 
    let {topic,
	 subtopic} = args ; 
    //now we want to write to the correct location on disk 
    let fpath = node.io.path.join(u2d_data_dir, to_path(topic), to_path(subtopic) )
    return node.io.ensure_extension(fpath ,'json') 
}

/*
 * Writes a json file given a json object and a file path
 *
 */
export function write_json_subfile(args : any) {
    let {fpath , data } = args
    let fs = node.io.fs ; let path = node.io.path ;
    fpath = node.io.ensure_extension(fpath, 'json') ; 
    //first make sure parent dir exists
    fs.mkdirSync(path.dirname(fpath), {recursive: true} ) ;
    //then stringify the data to save 
    let jdata = JSON.stringify(data)
    //then save the data
    fs.writeFileSync(fpath , jdata)
    log(`Wrote json data to ${fpath}`) 
} 



export async function goto_toc(p:any) {
    await p.goto("https://www-uptodate-com.beckerproxy.wustl.edu/contents/table-of-contents") ;
} 

/*
 * Will return either the topics under the TOC or the subtopics for each topic page, returns []{topic, link}
 */
export async function get_topics_or_sub_topics(p : Page) {
    
    const s1  = `#toc-list ul li:not([style="display: none;"])` ; 
    const s2  = `a[href]` ; 

    return p.evaluate( (ss:any) => {
	let elements = Array.from(document.querySelectorAll(ss[0]) ); 

	let topics = elements.map( (element:any) => {
	    let tmp = element.querySelector(ss[1])
	    return { topic : tmp.innerText , link : tmp.href } 
	})

	return topics 
	
    }, [s1,s2]) ; 
    
}

/*
 * Returns all articles in a subtopic, organized by the 'category' 
 */
export async function get_articles_from_sub_topic(p : Page) {
    const s1  = ".wk-accordion-item"
    const s2  = ".toc-result-item" 

    return p.evaluate( (ss:any) => {
	let elements = Array.from(document.querySelectorAll(ss[0])) ;

	if ( elements.length > 0  ) {
	    //the subtopic is organized by dropdown categories 

	    let info = elements.map( (element:any) => {

		let category = element.querySelector('button').innerText
		let article_elements = Array.from(element.querySelectorAll(ss[1]))

		let articles = article_elements.map( (a:any)=> {
		    return { title : a.innerText , link  : a.querySelector('a').href }
		})

	    return { category , articles  } 

	    })

	    return info   // this will be of type {category,articles}[]

	} else {
	    
	    //it is not (which means likely it is a direct list of articles )
	    let article_elements = Array.from(document.querySelectorAll(ss[1]))

	    if ( article_elements.length > 0 ) { 
	    
		let articles = article_elements.map( (a:any)=> {
		    return { title : a.innerText , link  : a.querySelector('a').href }
		})

		return  [{ category : null , articles }]

	    } else {

		//if we are here then the assume the page is an article itself
		let el = document.querySelector("#topic-title") as any 
		//let title = el.innerText
		let title = el.innerText 
		let link  = document.location.href
		return   [ {category : null , articles : [{title, link}] } ] 
		
	    } 
	    
	} 

    }, [s1,s2]) ;
} 












/**
 * Recursively navigates through subdirectories of the specified root directory to find all JSON files.
 * Produces a nested object reflecting the directory structure with parsed JSON data at the leaves.
 * 
 * @param root_dir - The root directory to start the search from.
 * @returns A nested object where parsed JSON data is at the leaves.
 */
export function parse_json_files_in_directory(root_dir: string): Record<string, any> {

    let fs = node.io.fs ;
    let path = node.io.path ; 
    
    const result: Record<string, any> = {};

    function traverse_directory(current_dir: string, current_obj: Record<string, any>) {
        const items = fs.readdirSync(current_dir, { withFileTypes: true });

        for (const item of items) {
            const item_path = path.join(current_dir, item.name);
            if (item.isDirectory()) {
                // If the item is a directory, create a nested object and recurse
                current_obj[item.name] = {};
                traverse_directory(item_path, current_obj[item.name]);
            } else if (item.isFile() && item.name.endsWith('.json')) {
                // If the item is a JSON file, read and parse its contents
                try {
                    const file_content = fs.readFileSync(item_path, 'utf-8');
                    current_obj[path.basename(item.name, '.json')] = JSON.parse(file_content);
                } catch (error) {
                    console.error(`Failed to parse JSON file at ${item_path}:`, error);
                }
            }
        }
    }

    traverse_directory(root_dir, result);
    return result;
}

export function count_articles(d :string) {

    let to_return : any = {}

    let num_articles = 0 ;
    let alist = [ ]
    
    let data = parse_json_files_in_directory(d)  ;
    let topics = Object.keys(data) ;

    for (var i =0 ;i < topics.length ; i ++) {

	let topic = topics[i]

	log(`Topic=${topic}`)
	
	let subtopics = Object.keys(data[topic]) ;

	for (var x=0; x < subtopics.length; x ++) {

	    let subtopic = subtopics[x]


	    let file_data = data[topic][subtopic]
	    let article_data = file_data.article_data 

	    let all_articles = article_data.map( (x1:any)=>x1.articles).flat()

	    log(`Subtopic=${subtopic} (${all_articles.length})`)
	    num_articles += all_articles.length 
	} 
	
    }

    log(`Total num articles=${num_articles}`) 
    
}


export async  function download_articles(p : Page, d :string, o : string) {

    log( new Date() )
    
    let data = parse_json_files_in_directory(d)  ;
    let topics = Object.keys(data) ;

    for (var i =0 ;i < topics.length ; i ++) {

	let topic = topics[i]

	log(`Topic=${topic}`)
	
	let subtopics = Object.keys(data[topic]) ;

	for (var x=0; x < subtopics.length; x ++) {

	    let subtopic = subtopics[x]


	    let file_data = data[topic][subtopic]
	    let article_data = file_data.article_data 

	    let all_articles = article_data.map( (x1:any)=>x1.articles).flat()

	    //this is where we download the artcles
	    for (var a =0 ; a < all_articles.length ; a ++ ) {
		let art = all_articles[a] ;
		let t = to_path(art.title) ;

		//build fpath 
		let fpath = node.io.path.join(o, to_path(topic), to_path(subtopic), t)
		
		log(`Processing article= ${t}`)
		log(`Checking path=${fpath}`) 
		
		//check if the article exists
		if (node.io.exists(fpath)) {

		    log(`Skipping article= ${t}`)		    
		    log(`Skipping ${fpath}, already exists`) ;

		}  else {

		    log(`${fpath} does not exist`) 

		    log(`Going to article: ${t}`)
		    await p.goto(art.link) 
		    //log(`Pausing`) 
		    await pause(p) ;
		    //now we extract the text of the article
		    let article_text = null ;
		    try {
			article_text = await p.evaluate( ()=> {
			    return (document.querySelector("#topicContent") as any).innerText 
			})
			log(`extracted text`)
		    } catch (e : any) {
			log(`error extracting text:`)
			console.log(e) 
		    }

		    //and save to disk
		    log(`writing ${fpath}`)
		    let data = article_text ; 
		    write_json_subfile({fpath, data}) ;
		    
		}
		

	    } 
	    

	} 
	
    }

    log( new Date() )
} 


//Fri Nov 29 07:47:24 CST 2024 <= Start time 

/*
   What happened --> Made me sign in again 
   TODO: 
   Adapt code to look at articles already downloaded -> skip  those  
   Increase the time out to 10 seconds  

   Re run
   
   Adapt 
*/ 
