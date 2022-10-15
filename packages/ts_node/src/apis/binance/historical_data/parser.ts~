import {common, node} from "../../../../index"

//get array of fullpaths to sorted csv files in directory dir 
export function get_csvs(dir : string) {
    let csvs = node.io.read_dir(dir).filter(
	(x:string)=>x.match(".csv")
    ).sort().map(
	(x:string)=>node.io.path.join(dir,x)
    )
    return csvs 
} 

/**
 * Given a directory 'dir' that containes kline csv files, 
 * this function sorts and parses those csv files and returns 
 * a concatenated array of all the data, in the form of dictionary
 * objects (k,v pairs). The data can then ben analyzed or parsed. 
 */
export function parse_kline_csv_files(dir : string) {
    let csvs = get_csvs(dir) ;
    return csvs.map( read_kline_csv ).flat() 
}

const kline_columns = [
    //see https://github.com/binance/binance-public-data
    "open_time" ,
    "open" ,
    "high" ,
    "low" ,
    "close" ,
    "volume" ,
    "close_time" ,
    "quote_asset_volume" ,
    "number_of_trades" ,
    "taker_buy_base_asset_volume" ,
    "taker_buy_quote_asset_volume" ,
    "ignore" 
] 

export function read_kline_csv(fp : string) {
    //read single csv file
    let raw_string = node.io.read_file(fp).trim() 
    let parsed = raw_string.split("\n").map(
	(t : string) => {
	    let tokens = t.split(",").map(Number)
	    let kv_pairs = common.fp.concat_accross_index( [ kline_columns, tokens ] )
	    return Object.fromEntries(kv_pairs)
	} 
    )
    return parsed 
} 
