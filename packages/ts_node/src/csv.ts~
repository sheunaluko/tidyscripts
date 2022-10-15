/* 
   Utils for parsing csvs 
*/

import {common, node} from "../index"

interface Csv_parser {
    [ k :string ] : (x : any)=> any 
} 

/**
 * Reads csv files 
 * 
 */
export function read_csv_file(has_header : boolean , cols : string[] , parser : Csv_parser , fname : string ) {
    let raw_string = node.io.read_file(fname).trim()
    let rows = raw_string.split("\n").map( function(r:string) {
	return r.split(",").map( (t:string)=>t.trim())
    })
    
    if (has_header) { 
	//get cols from the first
	cols = rows[0] ; 
	rows = rows.splice(1) ;
    } 

    return rows.map( (r : any) => parse_row( r, cols, parser) ) 
}

export function parse_row( row: string[] , cols : string[] , parser : Csv_parser) {
    var  data : any  = {} 
    for ( var i = 0 ; i < cols.length ; i ++ ) {
	data[cols[i]] =  parser[cols[i]](row[i])
    }
    return data 
} 
