

//  - - https://github.com/flexdinesh/browser-or-node/blob/master/src/index.js

/**
 * Returns true if the code is executing in the browser 
 */
export function is_browser() {

    return ( typeof window !== "undefined" && typeof window.document !== "undefined" ) 
} 

/**
 * Returns true if the code is executing in node  
 */
export function is_node() {
    return ( typeof process !== "undefined" &&  process.versions != null &&   process.versions.node != null ) 
} 


/**
 * Performs fetch request and then converts the result to json
 */
export async function get_json(url : string){
    let res =  await fetch( url )  ;
    return await res.json() ;
}


/**
 * Calls a serverless API endpoint with smart URL resolution
 * - In browser: uses window.origin/api/...
 * - In Node.js: uses https://www.tidyscripts.com/api/...
 *
 * @param endpoint - API endpoint path (e.g., '/api/openai_embedding' or 'openai_embedding')
 * @param body - Request body object (will be JSON stringified)
 * @param options - Additional fetch options
 * @returns Parsed JSON response
 */
export async function serverless_query(
    endpoint: string,
    body: any,
    options: RequestInit = {}
): Promise<any> {
    // Ensure endpoint starts with /api/
    const normalizedEndpoint = endpoint.startsWith('/api/')
        ? endpoint
        : endpoint.startsWith('api/')
            ? `/${endpoint}`
            : `/api/${endpoint}`;

    let url = "";
    if (is_browser()) {
        // Running in browser, use relative URL
        url = `${window.origin}${normalizedEndpoint}`;
    } else {
        // Running in Node.js, use production URL
        url = `https://www.tidyscripts.com${normalizedEndpoint}`;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        body: JSON.stringify(body),
        ...options
    });

    if (!response.ok) {
        throw new Error(`Serverless query failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}


