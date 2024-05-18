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

