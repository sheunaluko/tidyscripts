/*
   Note:  this API is currently non functional.
   It is unclear why, however the json key is not resulting in succesful authentication to the server
   Sat May 18 05:40:40 PM CDT 2024
*/

import {initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import {getFirestore, Timestamp, FieldValue, Filter } from 'firebase-admin/firestore';
import {read_json} from "../io"


export function init_from_keyfile(loc : string) {
    // - 
    var serviceAccount = read_json(loc) ;
    // - 
    var app =  initializeApp({
	credential: cert(serviceAccount)
    })
    // - 
    var db : any = null ;
    db = getFirestore();
    // -
    return {
	app,
	db 
    } 
}

