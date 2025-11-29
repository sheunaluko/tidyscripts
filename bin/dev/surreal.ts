import common from "../../packages/ts_common/dist/index" ;
import node   from "../../packages/ts_node/dist/index" ;

import {Surreal} from "surrealdb"

const log = common.logger.get_logger({id:'surreal_dev'});
const debug = common.util.debug ; 
const url = process.env.SURREAL_TIDYSCRIPTS_BACKEND_URL as string
const surreal_https_url = process.env.SURREAL_TIDYSCRIPTS_BACKEND_HTTPS_URL as string

/*
   Todo

   Consider function for summarizing file (with function names + doc strings) 
     - this can be used for follow up agentic query 
   
   Consider ability to extract source code for node 

*/

export var INTROSPECTION_DB : any = null ; 

export async function main_test(){
    /*
    let d = await get_introspection_db() ;
    let n = await get_node_from_id(d,4495) ;
    return {
	d,
	n
    }
    */
    return await get_matching_nodes_with_vector_search("keys", 3) ; 
}

export async function init(){
       log(`initialized`);
}


export async function get_db(){
    let db = new Surreal();
    await db.connect(url, {namespace:"production", database :"main"}) ;
    
    let token = await db.signin({namespace:"production", database :"main", access : 'user',  variables : {email : "foo@gmail.com", user_id :"1234"}}) ;
    
    log(`Connected as foo@gmail.com and got token: ${token}`)

    return {db,token} 
}

export async function get_db_2(){
    let db = new Surreal();
    await db.connect(url, {namespace:"production", database :"main"}) ;
    
    let token = await db.signin({namespace:"production", database :"main", access : 'user',  variables : {email : "fee@gmail.com", user_id :"12345"}}) ;
    
    log(`Connected and got token: ${token}`)

    return {db,token} 
}

export async function embedding_test()  {
    let db = await get_introspection_db()  ;
    let e  = await get_embedding("openai") ;
    let search_result = await vector_search(db,e,5) ;
    return {
	db,e,search_result
    }
}

export async function vector_search(db : any , v  :any , limit : number) {
    let query = `
select id, contentHash, vector::distance::knn() as dist from embedding_cache where embedding  <|${limit},40|> $e order by dist asc` ;  //fyi the 2nd param in the <|a,b|> structure MUST be a number to force using the HNSW index!

    log(`Doing vector search with query:`)
    log(query)
    debug.add("vector_query" , query) ;
    
    return (await db.query(query, {e : v}))[0] ; 

}

export async function get_nodes_with_hash(db : any, h : string) {
    return await db.query("select * from function_node, module_node where embeddingHash = $ch", {ch : h} ) ; 
}

export async function get_embedding( txt : string) {
    return await node.introspection.embeddings.generateEmbedding(txt)
}


export async function get_nodes_from_eids(db : any , eids : any[]) {
    let r = await db.query("select in.* from EMAP where out in $eids", {eids}) as any ; 
    return r[0].map( (y:any)=>y.in) ;   
}

/**
 * Formats a single node for LLM context
 * Preserves docstring, name, file path, function signature, and distance
 */
export async function convert_node_for_context(result : any, db :any) {
    const { dist, node: nodeData } = result;

    if (!nodeData) return "No node data available";

    const { kind, name, docstring, filePath, path, signature, exports, nodeId } = nodeData;
    const NodeKind = node.introspection.NodeKind;

    let output = [];

    // Add similarity score
    output.push(`Similarity: ${(1 - dist).toFixed(4)} (distance: ${dist.toFixed(4)})`);

    // Determine node type using NodeKind mapping
    let nodeType = 'Unknown';
    for (const [kindName, kindValue] of Object.entries(NodeKind)) {
        if (kindValue === kind) {
            nodeType = kindName;
            break;
        }
    }
    output.push(`Type: ${nodeType}`);

    // Add name
    output.push(`Name: ${name}`);

    // Add nodeId for reference
    if (nodeId !== undefined) {
        output.push(`NodeId: ${nodeId}`);
    }

    // Add file path (use filePath for functions, path for modules)
    const location = filePath || path || 'Unknown';
    output.push(`File: ${location}`);

    // Add docstring if present
    if (docstring) {
        output.push(`Description: ${docstring}`);
    } else if (signature?.comment?.summary) {
        // Extract docstring from signature comment if available
        const summaryText = signature.comment.summary
            .map((s: any) => s.text || '')
            .join('');
        if (summaryText) {
            output.push(`Description: ${summaryText}`);
        }
    }

    // For functions, add signature information
    if (kind === NodeKind.Function && signature?.parameters) {
        const params = signature.parameters
            .map((p: any) => {
                const paramName = p.name;
                const paramType = p.type?.name || 'unknown';
                return `${paramName}: ${paramType}`;
            })
            .join(', ');
        output.push(`Parameters: ${params || 'none'}`);

        // Add return type if available
        if (signature.type?.name) {
            output.push(`Returns: ${signature.type.name}`);
        }
    }

    // For modules, add exports
    if (kind === NodeKind.Module && exports && exports.length > 0) {
        output.push(`Exports: ${exports.join(', ')}`);
    }

    // import paths
    /*
       [ ] there is a recursive implmentation bug (i.e. because of import cycles [i think] this function hangs -- so I will disable it for now
       until this is fixed (TODO - todo ) 
     */
    if (db && false ) {
	let import_info = await get_node_paths_for_context(db,nodeId)
	output.push(`Imported by:: \n ${import_info}`)
    }


    return output.join('\n');
}

/**
 * Formats all search results for LLM context
 * Takes the search_results array and formats each node with similarity scores
 */
export async function convert_search_results_for_context(results: any[],db :any) {
    if (!results || results.length === 0) {
        return 'No search results found.';
    }

    let output = [`Found ${results.length} matching code elements:\n`];

    for ( var [index,result] of results.entries() ) {
	output.push(`\n--- Result ${index + 1} ---`);
        output.push(await convert_node_for_context(result,db));
    }
    
    return output.join('\n');
}

export async function get_node_from_id(db:any, node_id: number) {
    try {
	let tmp = await db.query(`select * from module_node,function_node where string::split(<string>id,":")[1] = $node_id`, {node_id : String(node_id) })
	return tmp[0][0]
    } catch (error: any ) {
	log(`error:`);log(error);
	return null 
    }
}

export async function get_node_ancestor_paths(db:any,node:any) {
    log(`Processing paths for node: id=${node.id}`);
    try {
	let tmp = await db.query(`select * from $node_id.{..+path}(<-?<-?).{name,id}`, {node_id : node}) ;
	debug.add("node_ancestor_query_result", tmp) ; 
	return tmp[0]
	
    } catch (error : any) {
	log("error"); log(error); 
	return null 
    }
}

export function convert_path_for_context(path : any, i : number) {
    log(i);log(path);
    let header = `Path ${i}:: `; 

    return header + path.map( (p:any)=> {
	console.log(p)
	return `${p.name}|type=${p.id.tb}|id=${p.id.id}`
	//will reverse it 
    }).reverse().join(" -> ") 
}

export function convert_paths_for_context(paths : any) {
    return paths.map((path:any,i:number)=>convert_path_for_context(path,i)).join("\n")
}

export async function get_node_paths_for_context(db : any, _n : any)  {
    let n = (typeof _n == "object") ? _n : (await get_node_from_id(db,_n)) ;
    debug.add("n" , n) 
    let paths = await get_node_ancestor_paths(db,n)
    debug.add("paths" , paths)     
    //for each path we prepend the queried node
    for (var p of paths) {
	p = ([n]).concat(p)
    }
    return await convert_paths_for_context(paths) 
}

export async function path_test() {
    let d = await get_introspection_db() ;
    let n = await get_node_from_id(d,4550) ;
    let paths = await get_node_ancestor_paths(d,n) ;
    let ctx = await convert_paths_for_context(paths) ;
    let r   = await get_node_paths_for_context(d,n)
    return {
	d,n, paths, ctx , r 
    }
}

export async function get_node_info_for_query(txt:string,limit:number) {
    let x = await get_matching_nodes_with_vector_search(txt,limit) ;
    return x.context ; 
}

export async function get_matching_nodes_with_vector_search(txt :string,limit:number) {
    let db = await get_introspection_db() ;
    let e = await get_embedding(txt) ;
    log(`got e`)
    let search_results = await vector_search(db, e, (limit ||  5) )  
    log(`got sr`)    
    let eids = search_results.map( (o:any)  => o.id ) ;
    log(`got eids`)    

    //now we use those ids to get the original nodes
    log(`getting nodes`)        
    let nodes = await get_nodes_from_eids(db,eids) ;


    debug.add("tmp" , {
	db,e,search_results,eids,nodes 
    });

    log(`matching nodes`)            
    // combine the node with the proper embedding
    for (var sr of search_results ) {
	let {contentHash, dist} = sr;
	let [node] = nodes.filter( (n:any)=> n.embeddingHash == contentHash) ;
	if (node) {
	    sr['node'] = node ; 
	}
    }

    log(`Prepping context`) ; 
    let context = await convert_search_results_for_context(search_results,db) ; 
    
    //and return everything 
    return {
	db,
	e,
	search_results,
	eids,
	nodes ,
	context 
    }  ; 
}

export async function get_introspection_db(){
    if (INTROSPECTION_DB){
	log("Got cached db");
	return INTROSPECTION_DB
    }
    
    let db = new Surreal();


    let tmp = node.introspection.loadConfig()
    let cfg = tmp.surreal //the surreal config; 

    log(`using cfg to connect to db`); log(cfg); 
    
    await db.connect(url, {
	namespace: cfg.namespace,
	database : cfg.database,
	auth : {
	    username : cfg.user,
	    password : cfg.password 
	}
    }) ;
    
    log(`Connected to db`)

    debug.add("db", db) ; 

    INTROSPECTION_DB = db ;     
    return db 
}



export function is_token_valid(token : string, skew_seconds = 60) {
  if (!token) return false;
  try {
    const [, payload_b64] = token.split(".");
    const payload_json = Buffer.from(payload_b64, "base64").toString("utf8");
    const payload = JSON.parse(payload_json);
    const now = Math.floor(Date.now() / 1000);
    return payload.exp && payload.exp - skew_seconds > now;
  } catch {
    return false; // malformed token
  }
}


export function parse_token(token : string) {
    if (!token) return false;
    try {
	const [, payload_b64] = token.split(".");
	const payload_json = Buffer.from(payload_b64, "base64").toString("utf8");
	const payload = JSON.parse(payload_json);
	return payload 
    } catch {
	return false; // malformed token
    }
}


interface SIGN_IN_UP_OPS {
    namespace : string,
    database : string,
    sign_up : boolean ,
    email  : string,
    user_id : string,
}

async function sign_in_up_user(ops : SIGN_IN_UP_OPS) {

    let {
        namespace, database, sign_up , email, user_id
    } = ops ;

    var url = null

    log(`Got sign in/up request: ${JSON.stringify(ops)}`) ; 

    if (sign_up) {
        url = `${surreal_https_url}/signup` ; 
        log(`Using sign UP url: ${url}`)
    } else {
        url = `${surreal_https_url}/signin` ; 
        log(`Using sign IN url: ${url}`)
    }

    let result = await fetch(url, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            NS: namespace,
            DB: database,
            AC: "user",
            email ,
            user_id
        }),

    }).then(r => r.json())

    log("got result:") ;
    log(result)  ;

    let {
	code, details, token
    } = result ; 

    return result

}

export async function test_sign_in_1() {
    let namespace = "production";
    let database  = "main" ;
    let email = "foo@gmail.com" ;
    let user_id = "1234" ;
    
    let ops = {
	namespace, database, email, user_id , sign_up : false 
    }

    return await sign_in_up_user(ops) ; 
}

export async function test_sign_in(user_id : string, email : string) {
    let namespace = "production";
    let database  = "main" ;

    let ops = {
	namespace, database, email, user_id , sign_up : false 
    }

    return await sign_in_up_user(ops) ; 
}

export async function test_sign_up(user_id :string, email : string) {
    let namespace = "production";
    let database  = "main" ;
    let ops = {
	namespace, database, email, user_id , sign_up : true
    }

    return await sign_in_up_user(ops) ; 
}
