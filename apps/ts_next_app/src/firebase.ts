'use client';

import * as tsw from "tidyscripts_web";

/* create logger */ 
const log = tsw.common.logger.get_logger({id : 'firebase_instance'})  ; 

/* load the firebase web client from tidyscripts  */
const firebase = tsw.apis.firebase

/* define the  Firebase config object  */ 
const firebaseConfig = {
  apiKey: "AIzaSyByjw-kqCpeYXQpApAeUU3GAnh1WfSQd7I",
  authDomain: "tidyscripts.firebaseapp.com",
  projectId: "tidyscripts",
  storageBucket: "tidyscripts.appspot.com",
  messagingSenderId: "292052354057",
  appId: "1:292052354057:web:77fa4743a205deb40764d8",
  measurementId: "G-4SJGBBQWW2"
};

export var app  : any = null ;
export var auth : any = null ;
export var db   : any = null ;

export function get_auth() { return auth }
export function get_app() { return app } 
export function get_db() { return db } 
    

export function initialized() {
    return ( (app && auth && db) !== null ) 
} 

/* Function to Load the app, auth, and db objects */
export function initialize() {
    if (initialized())  { log(`Already initialized`) }
    else {
	log(`Initializing`)
	let tmp = firebase.initialize_firebase_auth_firestore(firebaseConfig) ;
	app = tmp.app ;
	auth = tmp.auth ;
	db = tmp.db 
    } 
} 

initialize(); 


