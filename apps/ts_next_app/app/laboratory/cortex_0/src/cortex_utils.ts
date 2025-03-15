import * as common from "tidyscripts_common"  ;

const log  = common.logger.get_logger({id:"cortex_util"}) ; 
const sc = common.external.string_comparison ; 


let clean_string = function(s : string) {
    return s.toLowerCase().replace(/[.,!?]/g, '');
}

/**
 * String similarity 
 *
 */
export function string_similarity(s1: string, s2 : string ): number {
    
    const jaroWinkler = sc.jaroWinkler;

    if (s1 == "" || s2 == "") {
	log("empty string") ; return 0 ; 
    }

    s1 = clean_string(s1);
    s2 = clean_string(s2);

    log(`Comparing: \n\n ${s1} \n\n WITH \n\n ${s2}`)

    var similarity = 0 ;
    
    if (s1.includes(s2) || s2.includes(s1) ) {
	log(`Overriding metric given exact substring match`)
	similarity = 1 
    } else {
	log(`Calculating`)	
	similarity = jaroWinkler.similarity(s1, s2); // Or levenshtein.similarity
    }

    log(`Got similarity ${similarity}`)
    return similarity
    
}
