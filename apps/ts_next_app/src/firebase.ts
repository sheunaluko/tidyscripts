'use client';

import * as tsw from "tidyscripts_web";
import {getAuth } from "firebase/auth"

/* create logger */ 
const log = tsw.common.logger.get_logger({id : 'firebase'})  ; 


import * as util from "./firebase_utils"

export {util} 


/*
   The firebase interface for the APP 


   The util object exported from ./firebase_utils provides the core functionality, 
   including the following functions (see the Arugments types below) 

   //un-authenticated IO 
   util.store_doc(FirebaseDataStoreOps)
   util.get_doc(FirebaseDataGetOps)
   util.store_collection(FirebaseDataStoreOps)
   util.get_collection(FirebaseDataStoreOps)


   //authenticated IO 
   util.store_user_doc(FirebaseDataStoreOps)
   util.get_user_doc(FirebaseDataGetOps)
   util.store_user_collection(FirebaseDataStoreOps)
   util.get_user_collection(FirebaseDataStoreOps)


   ARUGMENT TYPES/INTERFACE => 

type UserData  = {[k:String] : any} 

interface FirebaseDataStoreOps {
    app_id : string ,
    path : string [] ,
    data : UserData 
} 

interface FirebaseDataGetOps {
    app_id : string ,
    path : string [] ,
} 

 */


export async function give_feedback(msg : string) {

    log(`Request to give user feedback: ${msg}`)
    const auth = getAuth()
    var uid : any = null ;
    
    if (auth.currentUser ){
	uid = auth.currentUser?.uid
	let name = auth.currentUser?.displayName  
	log(`User=${name} is logged in, with id=${uid}`)

    } else {
	log(`No user is logged in`)

    }


    let data = {
	t : tsw.common.util.unix_timestamp_ms() ,
	feedback : msg ,
	uid 
    }
    
    log(`Giving feedback using data: ${JSON.stringify(data)}`)

    let args = {
	app_id : "tidyscripts" ,
	path : ["collections" , "feedback" ] ,
	data  
    } 
    await util.store_collection(args)
} 

