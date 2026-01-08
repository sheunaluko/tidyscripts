/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onCall, CallableRequest} from "firebase-functions/v2/https";
import * as tsc from "tidyscripts_common";
import https from "https";

import {Surreal} from "surrealdb";
import fetch from "node-fetch";

import {
  Firestore,
  FieldValue,
} from "@google-cloud/firestore";


import * as logger from "firebase-functions/logger";
const log = logger.info;

// --------------------------------------------------
//  Initialize Firebase Admin SDK

const db = new Firestore();
const surreal_https_url = process.env["SURREAL_TIDYSCRIPTS_BACKEND_HTTPS_URL"] as string;
let SURREAL : any = null;

// define the https agent for keep alive connection
const https_agent = new https.Agent({keepAlive: true});

// define the user token map
// (this is an interesting optimization, with certain security considerations)

/*
   It enables quick http based scoped user queries
*/

const UID_TOKEN_MAP : any = { };
function get_uid_token( uid : string) {
  return UID_TOKEN_MAP[uid];
}
function set_uid_token( uid : string, token : string ) {
  UID_TOKEN_MAP[uid] = token;
}

// --------------------------------------------------


interface HTTP_OPS {
    token : string,
    query : string,
    url : string,
    namespace : string,
    database : string,
    metadata : any,
    variables? : any
}


async function surreal_https_query(ops : HTTP_OPS) {
  const {
    token, query, url, namespace, database, metadata, variables,
  } = ops;

  logger.info("Received surreal http request:  ", ops);
  logger.info("Query= ", ops.query);
  logger.info("Variables= ", variables);

  try {
    if ( ! query) {
	    const error = "Missing query parameter!";
	    logger.info(error);
	    return {
        success: false,
        error,
	    };
    }

    if ( ! (token && url && namespace && database ) ) {
	    const error = "Missing one of these!: token,url,naespace,database";
	    logger.info(error);
	    return {
        success: false,
        error,
	    };
    }

    // Prepare JSON-RPC 2.0 request body
    const params = variables ? [query, variables] : [query];
    const rpcBody = {
	    id: "1",
	    method: "query",
	    params: params,
    };

    const result = await fetch(url, {

	    method: "POST",
	    headers: {
        "Authorization": `Bearer ${token}`,
        "Surreal-NS": namespace,
        "Surreal-DB": database,
        "Accept": "application/json",
        "Content-Type": "application/json",
	    },
	    body: JSON.stringify(rpcBody),

    }).then((r) => r.json());

    logger.info("Query result:", result );

    return {
	      success: true,
	    result,
	    metadata,
    };
  } catch (error : any) {
	  return {
	      success: false,
	      error,
	      metadata,
	  };
  }
}


function is_token_valid(token : string, skew_seconds = 60) {
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


async function get_surreal() {
  /*
       This is a DB ROOT user!
     */

  const username = process.env["SURREAL_TIDYSCRIPTS_BACKEND_USER"] as string;
  const password = process.env["SURREAL_TIDYSCRIPTS_BACKEND_PASSWORD"] as string;
  const url = process.env["SURREAL_TIDYSCRIPTS_BACKEND_URL"] as string;

  if (SURREAL) {
    logger.info("Surreal db connection already present, will re-use");
    return SURREAL;
  } else {
    logger.info("Surreal db connection NOT present, will create");
    const db = new Surreal();
    	const connection_config: any = {
      namespace: "production",
      database: "main",
	    auth: {
        username,
        password,
	    },
    };
    logger.info("Using connection config:", connection_config);
    logger.info("Using connection url:", url);

    await db.connect(url, connection_config);

    SURREAL = db;

    logger.info("Done");
    return SURREAL;
  }
}


const template_user_table = `

DEFINE TABLE @TABLE_NAME SCHEMALESS
  PERMISSIONS
    -- Allow creation iff the caller is authenticated (has $auth.id)
    FOR create WHERE $auth.id != NONE
    -- Once rows exist, all ops are gated by ownership
    FOR select, update, delete WHERE owner = $auth.id;

-- Server-stamped owner (clients cannot supply/modify it)
DEFINE FIELD owner ON TABLE @TABLE_NAME
  TYPE record<user>
  VALUE $before OR $auth.id   -- or this? 
  DEFAULT $auth.id;  -- this default appears to be necessary! 

-- Helpful system fields
DEFINE FIELD created_at ON TABLE @TABLE_NAME
  TYPE datetime
  VALUE time::now()
  READONLY;

DEFINE FIELD updated_at ON TABLE @TABLE_NAME
  TYPE datetime
  VALUE time::now();            -- auto-updates on create and update

-- App fields (example)
-- DEFINE FIELD title ON TABLE logs TYPE string;
-- DEFINE FIELD body  ON TABLE logs TYPE string | null;

-- Indexes
DEFINE INDEX @TABLE_NAME_owner            ON TABLE @TABLE_NAME FIELDS owner;
DEFINE INDEX @TABLE_NAME_owner_created_at ON TABLE @TABLE_NAME FIELDS owner, created_at;
`;

async function user_exists(user_id : string, email : string) {
  const db = await get_surreal();
  const query = "select * from user where user_id = $user_id and email = $email";
  const vars = {user_id, email};
  logger.info(`Checking for user with : userid,email = ${vars.user_id},${vars.email}`);
  const result : any = await db.query(query, vars);
  // the result should be array with one element
  if (result[0].length == 1 && result[0][0].user_id == vars.user_id ) {
    // great
    logger.info("User check passed");
    return true;
  } else {
    logger.info("The user check failed with the following result", result);
    return false;
  }
}


interface SIGN_IN_UP_OPS {
    namespace : string,
    database : string,
    sign_up : boolean,
    email : string,
    user_id : string,
}

async function sign_in_up_user(ops : SIGN_IN_UP_OPS) {
  const {
    namespace, database, sign_up, email, user_id,
  } = ops;

  let url = "";

  log(`Got sign in/up request: ${JSON.stringify(ops)}`);

  if (sign_up) {
    url = `${surreal_https_url}/signup`;
    log(`Using sign UP url: ${url}`);
  } else {
    url = `${surreal_https_url}/signin`;
    log(`Using sign IN url: ${url}`);
  }

  const result = await fetch(url, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      NS: namespace,
      DB: database,
      AC: "user",
      email,
      user_id,
    }),

  }).then((r) => r.json());

  log("got result:");
  log(result);

  const {
    code, details, token,
  } = result;

  if (String(code).trim() === "200" ) {
    return {
	    success: true,
	    token,
    };
  } else {
    return {
	    success: false,
	    error: details,
    };
  }
}


/**
 * Surreal query
 * Returns the auth object if user is authenticated
 */
export const surrealQuery = onCall(
  async (request: CallableRequest<any>) => {
    // Check if user is authenticated
    if (!request.auth) {
	  const error = "Unauthenticated request. User must be logged in.";
	  return {
	      success: false,
	      error,
	  };
    }

    logger.info("\n\nSurreal Query Request", {uid: request.auth.uid, request_data: request.data});

    // --
    const uid = request.auth.uid;
    const email = request.auth.token.email as string;

    // --
    let REQUEST_TOKEN = "";
    let REQUEST_SUMMARY = "";

    // check if there is a user token cached already
    const token = get_uid_token(uid);
    if (token) {
	  logger.info("Found token, checking validity ");
	  if (is_token_valid(token)) {
	      logger.info("Token is valid!");

	      // set the request token
	      REQUEST_TOKEN = token;
	      REQUEST_SUMMARY = "User token already existed and was valid";
	  } else {
	      // user token existed however has presumably expired
	      // need to - re-sign in the user using their uid and email to get a new token
	      logger.info("Token INVALID - requesting new one for email,user_id = ", email, uid);

	      const ops = {
		  namespace: "production",
		  database: "main",
		  sign_up: false, // sign in
		  email,
		  user_id: uid,
	      };

	      // - USER SIGN IN
	      const result = await sign_in_up_user(ops);
	      if (!result.success ) {
		  // -- unable to sign in the user for some reason
		  return {
		      success: false,
		      error: `Error with signing in user: ${result.error}`,
		  };
	      }
	      // -- we were able to sign in
	      REQUEST_TOKEN = result.token;

	      logger.info(`Retrieved new token: ${REQUEST_TOKEN}`);
	      // set the new token in the cache
	      set_uid_token(uid, REQUEST_TOKEN);
	      REQUEST_SUMMARY = "User token existed but was INVALID, so new token retrieved";
	  }
    } else {
	  // in the case there is no token at all there are two possibilities:

	  /* 1) the user exists but has made no prior request during the current function instance session */

	  logger.info("\n\nUser exists but no token is cached");

	  const the_user_exists = await user_exists(uid, email);
	  if (the_user_exists) {
	      // the user exists so we just need to sign in as well

	      const ops = {
		  namespace: "production",
		  database: "main",
		  sign_up: false, // sign in
		  email,
		  user_id: uid,
	      };

	      // - USER SIGN IN
	      const result = await sign_in_up_user(ops);
	      if (!result.success ) {
		  // -- unable to sign in the user for some reason
		  return {
		      success: false,
		      error: `Error with signing in user: ${result.error}`,
		  };
	      }
	      // -- we were able to sign in
	      REQUEST_TOKEN = result.token;

	      logger.info(`Retrieved new token: ${REQUEST_TOKEN}`);
	      // set the new token in the cache
	      set_uid_token(uid, REQUEST_TOKEN);
	      REQUEST_SUMMARY = "Pre-existing user had no cached token, so new token retrieved";

	  /* 2) the user is not signed up at all (i.e. does not exist) */
	  } else {
	      // the user does not exist so we need to sign up the user!
	      logger.info("the user does not exist so we need to sign up the user!");

	      const ops = {
		  namespace: "production",
		  database: "main",
		  sign_up: true,
		  email,
		  user_id: uid,
	      };

	      // - USER SIGN IN
	      const result = await sign_in_up_user(ops);
	      if (!result.success ) {
		  // -- unable to sign up the user for some reason
		  return {
		      success: false,
		      error: `Error with signing up user: ${result.error}`,
		  };
	      }
	      // -- we were able to sign in
	      REQUEST_TOKEN = result.token;

	      logger.info(`Retrieved new token: ${REQUEST_TOKEN}`);
	      // set the new token in the cache
	      set_uid_token(uid, REQUEST_TOKEN);
	      REQUEST_SUMMARY = "NON existent user, so SIGNUP performed and new token retrieved";
	  }
    }

    // REQUEST TOKEN AND REQUEST SUMMARY ARE NOW DEFINED


    // ------------------------------------------
    // after getting the token, dont forget to make https query to rpc endpoint
    logger.info("Now running user query" );


    // run the query now on behalf of the user
    const query = request.data.query;
    const variables = request.data.variables; // optional

    const https_query_ops = {
	  token: REQUEST_TOKEN,
	  query,
	  url: `${surreal_https_url}/rpc`,
	  namespace: "production",
	  database: "main",
	  metadata: {
	      REQUEST_SUMMARY,
	  },
	  variables,
    };

    return (await surreal_https_query(https_query_ops) ); // handles the errors
  }
);


export const newUserTable = onCall(
  async (request: CallableRequest<any>) => {
    // Check if user is authenticated
    if (!request.auth) {
	  const error = "Unauthenticated request. User must be logged in.";
	  return {
	      success: false,
	      error,
	  };
    }

    logger.info("User Table Request", {request_data: request.data});
    logger.info("Getting db connection" );


    try {
	  const new_name = request.data.name.replace(/\s/g, "_");
	  logger.info(`replacing name with ${new_name}`);


	  const db = await get_surreal();
	  const query = template_user_table.replace(/@TABLE_NAME/g, new_name);
	  logger.info("Using query: \n\n", query);

	  const result = await db.query(query);

	  return {
	      success: true,
	      result,
	  };
    } catch (error :any) {
	  logger.info("Error!", error);

	  return {
	      success: false,
	      error: error.toString(),
	  };
    }
  }
);


// Define interface for embedding data
interface EmbeddingData {
  start: number;
  end: number;
  embedding: number[];
  metadata: { sid: string; [key: string]: any };
}


/**
 * Cloud Function to store an embedding
 */
export const storeEmbedding = onCall(
  async (request: CallableRequest<EmbeddingData>) => {
    // Access auth information directly from request.auth
    if (!request.auth) {
      throw new Error("Unauthenticated request. User must be logged in.");
    }

    const userId = request.auth.uid;
    const {start, end, embedding, metadata} = request.data;

    if (!metadata.sid) {
      throw new Error("Metadata must include an SID.");
    }

    const eid = await tsc.apis.cryptography.object_sha256(request.data) as string;
    const userPath = `/users/${userId}/tex/spaces/embedding_space`;

    try {
      const docRef = db.collection(userPath).doc(eid);
      const doc = await docRef.get();

      if (doc.exists) {
        throw new Error("Embedding with the same EID already exists.");
      }

      await docRef.set({
        start,
        end,
        embedding: FieldValue.vector(embedding),
        metadata,
      });

      logger.info("Embedding stored successfully", {eid, userId});
      return {success: true, message: "Embedding stored successfully."};
    } catch (error) {
      const errorMessage = (error as Error).message || "Failed to store embedding.";
      logger.error(errorMessage, {error});
      throw new Error(errorMessage);
    }
  }
);

/**
 * Cloud Function to retrieve embeddings
 * Note: CORS is disabled by default for callable functions.
 */
export const retrieveEmbedding = onCall(
  async (request: CallableRequest<{ queryVector: number[]; limit: number }>) => {
    // Access auth information directly from request.auth
    if (!request.auth) {
      throw new Error("Unauthenticated request. User must be logged in.");
    }

    const userId = request.auth.uid;
    const {queryVector, limit} = request.data;

    if (!queryVector || !Array.isArray(queryVector) || queryVector.some(isNaN)) {
      throw new Error("Invalid query vector format. Must be an array of numbers.");
    }

    if (!limit || typeof limit !== "number" || limit <= 0 || limit > 100) {
      throw new Error("Limit must be a positive number less than or equal to 100.");
    }

    const userPath = `/users/${userId}/tex/spaces/embedding_space`;

    try {
      const coll = db.collection(userPath);
      const vectorQuery = coll.findNearest({
        vectorField: "embedding",
        queryVector,
        limit,
        distanceMeasure: "COSINE",
      });

      const vectorQuerySnapshot = await vectorQuery.get();

      if (vectorQuerySnapshot.empty) {
        throw new Error("No matching embeddings found.");
      }

      const results = vectorQuerySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      logger.info("Embeddings retrieved successfully", {userId, count: results.length});
      return {success: true, results};
    } catch (error) {
      const errorMessage = (error as Error).message || "Failed to retrieve embeddings.";
      logger.error(errorMessage, {error});
      throw new Error(errorMessage);
    }
  }
);


/**
 * Cloud Function to test authentication
 * Returns the auth object if user is authenticated
 */
export const testAuth = onCall(
  async (request: CallableRequest<any>) => {
    // Check if user is authenticated
    if (!request.auth) {
      throw new Error("Unauthenticated request. User must be logged in.");
    }

    logger.info("Authentication test successful", {uid: request.auth.uid});

    // Return the auth object
    return {
      success: true,
      auth: request.auth,
    };
  }
);


