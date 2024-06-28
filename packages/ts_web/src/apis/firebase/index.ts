/** 
 * Interface to firebase client  
 * 
 * 
 * @packageDocumentation 
 */ 

import { logger } from 'tidyscripts_common';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithRedirect, signOut, Auth } from "firebase/auth";
import { getFirestore, addDoc, setDoc, doc, collection , getDoc } from "firebase/firestore";
import { GoogleAuthProvider, GithubAuthProvider, FacebookAuthProvider } from "firebase/auth";
// - 
const log = logger.get_logger({ id: 'firebase' });

/** 
 * Initialize the firebase app using the config 
 */
export function initialize_app(config : any)  {
    let app = initializeApp(config)
    return app  
}

/** 
 * Get the firebase auth instance using the app instance  
 */
export function get_auth(app : any) {
    return getAuth(app)
}

/** 
 * Get the firestore db instance using the app instance  
 */
export function get_firestore_db(app : any) { 
    let db =  getFirestore(app)
    return db ; 
} 

/** 
 * Initialize firebase app, auth, and firestore db at once 
 */
export function initialize_firebase_auth_firestore(config : any) {
    let app  = initialize_app(config);
    let auth = get_auth(app) ;
    let db   = get_firestore_db(app) ;
    return {
	app, auth, db 
    } 
} 







/* Providers */

export {
    GoogleAuthProvider,
    FacebookAuthProvider,
    GithubAuthProvider,
    signInWithRedirect 
} 



/** 
 * Log out of firebase 
 */
export function log_out(auth : any) {
  signOut(auth).then(() => {
    // Sign-out successful.
    log("User signed out")
  }).catch((error) => {
    // An error happened.
    log("Signout error")
  });
}

export {
    getFirestore,
    doc, 
    addDoc,
    setDoc,
    getDoc , 
    collection  ,
    Auth, 
} 
