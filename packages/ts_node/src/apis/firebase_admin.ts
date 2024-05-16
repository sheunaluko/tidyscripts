

import admin from "firebase-admin"
import {read_json} from "../io"

import { getFirestore, Timestamp, FieldValue, Filter } from "firebase-admin/firestore"


export function get_app_from_keyfile(loc : string) {
    let serviceAccount = read_json(loc) ;
    return admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
    })
} 

export {
    admin,
    getFirestore 
} 
