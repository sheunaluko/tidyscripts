import common from "../../packages/ts_common/dist/index" ;
import node   from "../../packages/ts_node/dist/index" ;

import {Surreal} from "surrealdb"

const log = common.logger.get_logger({id:'surreal_dev'});
const url = process.env.SURREAL_TIDYSCRIPTS_BACKEND_URL as string
const surreal_https_url = process.env.SURREAL_TIDYSCRIPTS_BACKEND_HTTPS_URL as string


/*
   TODO 
     - x = await embedding_test() ; //works well  
     - however -- need to think about the embedding schema and how embeddings are linked to and retrievable from the nodes and vice versa  


*/


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
select id, contentHash, vector::distance::knn() as dist from embedding_cache where embedding  <|${limit},COSINE|> $e order by dist asc` ; 
    
    return await db.query(query, {e : v}) ; 

}

export async function get_nodes_with_hash(db : any, h : string) {
    return await db.query("select * from function_node, module_node where embeddingHash = $ch", {ch : h} ) ; 
}

export async function get_embedding( txt : string) {
    return await node.introspection.embeddings.generateEmbedding(txt)
}


export async function get_matching_nodes_with_vector_search(txt :string) {
    let db = await get_introspection_db() ; 
    let e = await get_embedding(txt) ;
    let search_results = await vector_search(db, e, 5) ;
    return {
	db,
	e,
	search_results
    }  ; 
}

export async function get_introspection_db(){
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
