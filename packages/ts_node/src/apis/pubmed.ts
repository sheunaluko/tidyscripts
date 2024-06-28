/** 
 * API for managing pubmed resources. 
 * 
 * ```
 * let articles = get_parsed_articles("./path/to/pubmed22n0001.xml") ; 
 * let {pmid, title, date, authors, mesh_headings} =  articles[0] ; 
 * ```
 * see {@link get_parsed_articles} more detail 
 * 
 * @packageDocumentation
 */

import {fp,logger} from "tidyscripts_common" ; 
import {read_text, path , exists} from "../io" ; 
import {
    parse_xml, 
    dom_path_by_child_name, 
    dom_path_sub_nodes, 
    dom_children,
    dom_sub_nodes,
    async_exec
} from "../utils" ; 
import * as domutils from "domutils"  ; 
import * as http from "../http" ;
import * as pubmed_mongo from "./pubmed_mongo" ; 


const log = logger.get_logger({id: "pubmed"}) ; 

 /** 
  * Parses a pubmed baseline file  
  * @param bf - the path to the bf stored on disk 
  * ```
  * //for example 
  * let fp  = "./resources/pubmed22n0001.xml" ; 
  * let xml = parse_pubmed_baseline_file(fp)  ; 
  * ```
  */
 export function parse_pubmed_baseline_file(bf : string) { 
     return parse_xml(bf)
 }

 /** 
  * Returns article with index ```num``` from the xml objected returned from {@link parse_pubmed_baseline_file}
  * ```
  * //for example 
  * let fp  = "./resources/pubmed22n0001.xml" ; 
  * let xml = parse_pubmed_baseline_file(fp)  ; 
  * let article1 = get_article(xml,0) ; 
  * ```
  */
 export function get_article(xml: any, num : number){
     return xml.children[4].children[num*2 + 1] ;
 }

/**
 * Extracts the ```pubmedarticleset``` object from the article xml and returns all ```pubmedarticle``` objects
 */
export function get_articles(xml : any){
    let article_set = domutils.findOne( (c:any)=> (c.name == 'pubmedarticleset'), xml.children )  as any;    
    return domutils.findAll( (c:any) => (c.name == 'pubmedarticle' ) , article_set.children ) ; 
}

/**
 * Get number of articles in the xml object 
 */
 export function num_articles(xml : any){
    return Math.floor(xml.children[4].children.length/2) ; 
}



type Article = any ;

 /** 
  * Extracts the pmid from the article object
  */
 export function get_pmid(article : Article){ return dom_path_sub_nodes(["medlinecitation", "pmid"], article) }
/** 
  * Extracts the title from the article object
  */
 export function get_title(article : Article){ return dom_path_sub_nodes(["medlinecitation", "articletitle"], article) }

/** 
  * Extracts the date from the article object
  * Returns a date object 
  */
 export function get_date(article : Article){ 
   let dte =  dom_path_by_child_name(["medlinecitation", "datecompleted"], article) ; 
   let year = Number(dom_path_sub_nodes(["year"],dte) ) ; 
   let month = Number(dom_path_sub_nodes(["month"], dte));
   let day = Number(dom_path_sub_nodes(["day"],dte) ) ; 
   return new Date( year, month -1, day  ) ; 
 }


 /**
  * Parses an author element into lastname, forename, and initials 
  */
 export function parse_author_element(author : any){
    let lastname = dom_path_sub_nodes(['lastname'], author )
    let forename = dom_path_sub_nodes(['forename'], author )
    let initials = dom_path_sub_nodes(['initials'], author )
    return { lastname, forename, initials }
 }
/**
 * Extracts the authors from an article object 
 */
export function get_authors(article : Article){
    let authors = dom_children(dom_path_by_child_name(["article", "authorlist"],article)) ; 
    return authors.map(parse_author_element) ; 
}

/**
 * Parses a mesh qualifier object 
 */
 export function parse_qualifier(q: any){
    // - 
    let majortopic = domutils.getAttributeValue(q,'majortopicyn'); 
    let ui = domutils.getAttributeValue(q,'ui') ; 
    let name = dom_sub_nodes(q) ; 
    // - 
    return {  majortopic , ui , name   }  
 }

/**
 * Parses a mesh heading object 
 */
export function parse_mesh_heading(mh: any){
    // - 
    let descriptor_name_el = dom_path_by_child_name(['descriptorname'],mh) ; 
    let majortopic = domutils.getAttributeValue(descriptor_name_el,'majortopicyn'); 
    let ui = domutils.getAttributeValue(descriptor_name_el,'ui') ; 
    // - 
    let descriptor_name = dom_sub_nodes(descriptor_name_el) ; 
    let qualifiers = domutils.findAll( (x:any)=>x.name == 'qualifiername' , mh.children ).map(parse_qualifier) ; 

    return { 
        ui , 
        majortopic , 
        qualifiers ,
        descriptor_name , 
    }


}

/**
 * Extracts the mesh headings from the article object 
 */
export function get_mesh_headings(a : Article){
    let mesh_headings = dom_children(dom_path_by_child_name(["medlinecitation" ,"meshheadinglist"],a)) ; 
    return mesh_headings.map(parse_mesh_heading)
}
  

/**
 * Gets the journal title from an article 
 */
export function get_journal(a : Article){
    let p = [ 'medlinecitation', 'medlinejournalinfo', 'medlineta' ] ; 
    let x = dom_path_by_child_name( p , a ) ; 
    return dom_sub_nodes(x) ; 
}
 

const article_extractors : any = { 
    'pmid' : get_pmid, 
    'title' : get_title,
    'date'  : get_date , 
    'authors' : get_authors, 
    'mesh_headings' : get_mesh_headings  , 
    'journal' : get_journal , 
}

/**
 * Parses one of the articles returned by {@link get_article}
 */
export function parse_article(a : Article){ return fp.apply_function_dictionary_to_object(article_extractors, a)  }

/**
 * Reads the xml baseline file and parses all of its articles, returning a large array.
 * Note, you may need to increase the RAM allocated to the node process in order to parse the entire xml file without streaming.
 * If you get a memory error, try increasing RAM by running ```export NODE_OPTIONS=--max_old_space_size=4096``` before launching the node process.
 * Below is example usage. 
 * ```
 * //for example 
 * let articles = get_parsed_articles("./path/to/pubmed22n0001.xml") ; 
 * let {pmid, title, date, authors, mesh_headings} =  articles[0] ; 
 * console.log(articles[29400]) ;
 * // outputs the following -> 
 * {
 * pmid: '30361',
 * title: '[Antipsychotic neuroplegic and neuroleptic agents. I - definition and classification].',
 * date: { year: '1978', month: '12', day: '20' },
 * authors: [
 *   { lastname: 'Deligné', forename: 'P', initials: 'P' },
 *   { lastname: 'Bunodi ère', forename: 'M', initials: 'M' }
 * ],
 * mesh_headings: [
 *   {
 *     ui: 'D014150',
 *     majortopic: 'N',
 *     qualifiers: [Array],
 *     descriptor_name: 'Antipsychotic Agents'
 *   }, .... 
 * ]
 * }
 * ```
 */
export function get_parsed_articles(fpath : string, xml : any): any{    
    log(`Parsing ${fpath}`) 
    xml = xml || parse_pubmed_baseline_file(fpath) ;    
    let num = num_articles(xml)  ; 
    let result : any = Array(num).fill(null) ;  
    for (var i = 0 ; i < num ; i++){ 
        let article = get_article(xml,i) ; 
        result[i] = parse_article(article) ; 
        if ( i % 1000 == 0 ) {
            log(`Progress: ${i}/${num}`) ; 
        }
    }
    return result 
}



export var default_data_dir : any  = "." ;
export var default_mongo_url : any  = null  ; 

/**
 * Returns the base name of a pubmed .gz file given a number 
 */
export function get_base_gz_name(num : string){ return `pubmed22n${num}.xml.gz` ; }


/**
 * Returns the base name of a pubmed xml file on disk given a number 
 */
export function get_base_xml_name(num : string){ return `pubmed22n${num}.xml` ; }



/**
 * Turns a number into a pubmed ftp url 
 */
export function get_ftp_url(num : string){ 
    return `https://ftp.ncbi.nlm.nih.gov/pubmed/baseline/${get_base_gz_name(num)}` ; 
}

/**
 * 
 */
export function set_default_data_dir(dir : string){
    default_data_dir = dir ; 
}
export function set_default_mongo_url(url: string){ 
    default_mongo_url = url ;  
}



/**
 * Downloads a pubmed xml file given the file numbe and optional directory 
 * to save the file too. If dir is unset then the `default_data_dir` is used 
 * which can be set by calling `set_default_data_dir` 
 * 
 * Note: this executes a shell command and assumes that "curl" is available
 * If it is not, the command will fail. 
 * 
 */
export async function download_pubmed_xml_file(num : number, dir : string){

  dir = dir || default_data_dir ; //--use default 
  
  // ---   If already exists 
  let fname = get_pubmed_file_path(num,dir) ; 
  if (exists(fname)) {  log(`${fname} exists`); return ;  }
  
  // ---  IF does not exist 
  let num_str = (num).toLocaleString('en-US', {minimumIntegerDigits: 4, useGrouping:false})
  dir = dir || default_data_dir ; 
  let url = get_ftp_url(num_str) ; 
  let fn = path.join(dir,get_base_gz_name(num_str)); 
  log(`Downloading web asset ${url} to local file: ${fn}`) ; 
  let cmd1 = `curl -o ${fn} "${url}"`
  log(`Using cmd: ${cmd1}`) ; 
  await async_exec(cmd1) ;
  //--
  let cmd2 = `gzip -d ${fn}` ; 
  log(`Decompressing gzip using command: ${cmd2}` ) ;  
  await async_exec(cmd2) ;
  // --- Note that the above command deletes the gzip file 
  log(`Done`) ; 
}



/**
 * 
 */
function get_pubmed_file_path(num : number, dir : string) {
    let num_str = (num).toLocaleString('en-US', {minimumIntegerDigits: 4, useGrouping:false})
    return path.join( dir , get_base_xml_name(num_str) ) ; 
} 


export {
  pubmed_mongo 
}
