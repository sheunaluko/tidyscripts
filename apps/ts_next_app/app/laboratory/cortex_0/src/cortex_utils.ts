import * as common from "tidyscripts_common"  ;

const log  = common.logger.get_logger({id:"cortex_util"}) ; 
const sc = common.external.string_comparison ; 


let clean_string = function(s : string) {
    return s.toLowerCase().replace(/[.,!?]/g, '');
}

export var example_template = {
       name : 'store_exercise_log' ,
       parameters : { text : 'string' } ,
       function_name : 'access_database_with_surreal_ql' ,
       function_args :  [ "query" , "insert into logs { message : &text , type : 'exercise' } "  ]
}

export var stringified_template = JSON.stringify(example_template) ; 

export function resolve_single_arg_with_dic(arg: any, arg_dic: any): any {
    // Handle different argument types

    // If arg is a string, do placeholder replacement
    if (typeof arg === 'string') {
        let new_arg = arg;
        for (const [k, v] of Object.entries(arg_dic)) {
            // Try three patterns in order:
            // 1. Single-quoted placeholder: '&var'
            // 2. Double-quoted placeholder: "&var"
            // 3. Bare placeholder: &var

            // Pattern 1: '&var' (with single quotes) - replace including the quotes
            const singleQuotedPattern = new RegExp(`'&${k}'`, "g");
            if (new_arg.match(singleQuotedPattern)) {
                const replacement = typeof v === 'string'
                    ? `'${v}'`  // Keep single quotes around strings
                    : JSON.stringify(v);  // Serialize non-strings
                new_arg = new_arg.replace(singleQuotedPattern, replacement);
                continue;  // Don't try other patterns
            }

            // Pattern 2: "&var" (with double quotes) - replace including the quotes
            const doubleQuotedPattern = new RegExp(`"&${k}"`, "g");
            if (new_arg.match(doubleQuotedPattern)) {
                const replacement = typeof v === 'string'
                    ? `"${v}"`  // Keep double quotes around strings
                    : JSON.stringify(v);  // Serialize non-strings
                new_arg = new_arg.replace(doubleQuotedPattern, replacement);
                continue;  // Don't try other patterns
            }

            // Pattern 3: &var (bare, no quotes) - use JSON.stringify for proper quoting
            const barePattern = new RegExp(`&${k}`, "g");
            const replacement = JSON.stringify(v);
            new_arg = new_arg.replace(barePattern, replacement);
        }
        return new_arg;
    }

    // If arg is an array, recursively process each element
    if (Array.isArray(arg)) {
        return arg.map(element => resolve_single_arg_with_dic(element, arg_dic));
    }

    // If arg is an object, recursively process each value
    if (typeof arg === 'object' && arg !== null) {
        const new_obj: any = {};
        for (const [key, value] of Object.entries(arg)) {
            new_obj[key] = resolve_single_arg_with_dic(value, arg_dic);
        }
        return new_obj;
    }

    // For primitives (numbers, booleans, null), return as-is
    return arg;
}

export function resolve_function_args_array( function_args : any[] , arg_dic : any ) {

    let new_arg_arr = [ ]  ; 
    for (var i = 0; i < function_args.length ; i ++ ) {
	let arg = function_args[i] ;
	new_arg_arr.push( resolve_single_arg_with_dic(arg,arg_dic) ) ; 
    }

    return new_arg_arr 

}

export async function run_function_template( template : any , template_args : any[], collect_fn : any) {
    let {
	name, parameters, function_name, function_args
    }  = template ;

    let arg_dic = collect_fn(template_args) ;
    let resolved_function_args_array = resolve_function_args_array(function_args,arg_dic) ;

    return {
	arg_dic,
	resolved_function_args_array
    }
}


export function test(COR : any) {
    let template_args = ["text" , "I did some exercise"]
    return run_function_template( example_template, template_args, COR.collect_args.bind(COR) )
}

export async function test_pipeline(COR : any ) {

    let r = await COR.handle_function_call(
	{
	    name : "run_function_template" ,
	    parameters : {
		template_name : "doesn't matter",
		template_args : ["text" , "this is some text"]
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
