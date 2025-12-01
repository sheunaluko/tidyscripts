import * as common from "tidyscripts_common"  ;

const log  = common.logger.get_logger({id:"cortex_util"}) ; 
const sc = common.external.string_comparison ; 


let clean_string = function(s : string) {
    return s.toLowerCase().replace(/[.,!?]/g, '');
}

export var example_procedure = {
       name : 'store_exercise_log' ,
       parameters : { text : 'string' } ,
       function_name : 'access_database_with_surreal_ql' ,
       function_args :  [ "query" , "insert into logs { message : &text , type : 'exercise' } "  ] 
}

export var stringified_procedure = JSON.stringify(example_procedure) ; 

export function resolve_single_arg_with_dic(arg : any, arg_dic : any)  {
    //
    let new_arg = common.fp.clone(arg) ; 
    for ( var [k,v] of Object.entries(arg_dic) ) {
	new_arg = new_arg.replace( new RegExp(`&${k}`,"g"), JSON.stringify(v) )	
    }
    return new_arg
}

export function resolve_function_args_array( function_args : any[] , arg_dic : any ) {

    let new_arg_arr = [ ]  ; 
    for (var i = 0; i < function_args.length ; i ++ ) {
	let arg = function_args[i] ;
	new_arg_arr.push( resolve_single_arg_with_dic(arg,arg_dic) ) ; 
    }

    return new_arg_arr 

}

export async function run_stored_procedure( sp : any , procedure_args : any[], collect_fn : any) {
    let {
	name, parameters, function_name, function_args 
    }  = sp ;

    let arg_dic = collect_fn(procedure_args) ;
    let resolved_function_args_array = resolve_function_args_array(function_args,arg_dic) ;

    return {
	arg_dic,
	resolved_function_args_array 
    }
}


export function test(COR : any) {
    let procedure_args = ["text" , "I did some exercise"] 
    return run_stored_procedure( example_procedure, procedure_args, COR.collect_args.bind(COR) ) 
}

export async function test_pipeline(COR : any ) {
    
    let r = await COR.handle_function_call(
	{
	    name : "run_stored_procedure" ,
	    parameters : {
		procedure_name : "doesn't matter",
		procedure_args : ["text" , "this is some text"]
	    }
	}
    );
    return r 
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
