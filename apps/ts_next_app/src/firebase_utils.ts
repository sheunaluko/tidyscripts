'use client'; 
import * as tsw from "tidyscripts_web";

import { initializeApp } from 'firebase/app';
//import { getFirestore, collection, getDocs, setDoc, doc } from 'firebase/firestore/lite';
import { getFirestore, collection, getDocs, setDoc, doc, addDoc , getDoc } from 'firebase/firestore';
import {getAuth , onAuthStateChanged } from "firebase/auth"


export {getAuth} ; 

/* temporary placeholder for Auth type */ 
type Auth = any ;
type Firestore = any ; 


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


/* create logger */ 
const log = tsw.common.logger.get_logger({id : 'firebase_util'})  ; 


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

log(`Created firebase app and db references :)`) 

/*
export async function getCities() {
  const citiesCol = collection(db, 'cities');
  const citySnapshot = await getDocs(citiesCol);
  const cityList = citySnapshot.docs.map(doc => doc.data());
  return cityList;
}



export async function store() {

    const citiesRef = collection(db, "cities");
    
    await setDoc(doc(citiesRef, "SF"), {
	name: "San Francisco", state: "CA", country: "USA",
	capital: false, population: 860000,
	regions: ["west_coast", "norcal"] });
    await setDoc(doc(citiesRef, "LA"), {
	name: "Los Angeles", state: "CA", country: "USA",
	capital: false, population: 3900000,
	regions: ["west_coast", "socal"] });
    await setDoc(doc(citiesRef, "DC"), {
	name: "Washington, D.C.", state: null, country: "USA",
	capital: true, population: 680000,
	regions: ["east_coast"] });
    await setDoc(doc(citiesRef, "TOK"), {
	name: "Tokyo", state: null, country: "Japan",
	capital: true, population: 9000000,
	regions: ["kanto", "honshu"] });
    await setDoc(doc(citiesRef, "BJ"), {
	name: "Beijing", state: null, country: "China",
	capital: true, population: 21500000,
	regions: ["jingjinji", "hebei"] }) ; 

}

*/

type UserData  = { [k:string] : any} 
interface FirebaseDataStoreOps {
    app_id : string ,
    path : string [] ,
    data : UserData 
} 

interface FirebaseDataGetOps {
    app_id : string ,
    path : string [] ,
} 



/*
   LOGGED IN UTILITIES 
 */



/**
 * Main function for adding a new document with a specified ID at a specified path
 * The last string in the path is assumed to be the docId (and length of path MUST be odd) 
 *
 * @returns A promise that resolves when the document is successfully written.
 */
export async function store_user_doc(args : FirebaseDataStoreOps) {

    let {app_id , path , data  } = args ;
    var user_id : any  = null  ;
    log(`Request to user_doc_store: appid=${app_id}, path =${path}, data=${JSON.stringify(data)}`)

    const auth = getAuth()
    
    user_id = auth.currentUser?.uid;
    log(`Detected user id: ${user_id}`) 
    if (!user_id) {
	throw new Error('User is not authenticated.');
    }
    
    let full_path = [ "users" , user_id , app_id, ...path]  ;

    log("full_path")
    log(full_path)

    // @ts-ignore
    var docRef = doc(db, ...full_path)
    log(`Obtained document reference`) 

    try { 
	await setDoc(docRef, data) 
	log(`Wrote document`)
    } catch (error : any) {
	log(`Error writing document: ${error}`)
	
    } 
}


export async function test_store_user_doc() {
    let args = {
	app_id : "test",
	path :  ["data1" ] ,
	data : {msg : "hey boi"  } 
    }
    return await store_user_doc(args); 
} 


/**
 * Main function for adding a new document with a specified ID at a specified path
 * The last string in the path is assumed to be the docId (and length of path MUST be odd) 
 *
 * @returns A promise that resolves when the document is successfully written.
 */
export async function get_user_doc(args : FirebaseDataGetOps) {

    let {app_id , path   } = args ;
    var user_id : any  = null  ;
    log(`Request user_doc_get: appid=${app_id}, path =${path}`)

    const auth = getAuth()
    
    user_id = auth.currentUser?.uid;
    log(`Detected user id: ${user_id}`) 
    if (!user_id) {
	throw new Error('User is not authenticated.');
    }
    
    let full_path = [ "users" , user_id , app_id, ...path]  ;

    log("full_path")
    log(full_path)

    // @ts-ignore    
    var docRef = doc(db, ...full_path)
    log(`Obtained document reference`) 

    try { 
	let docSnap = await getDoc(docRef) 
	log(`Retrieved document`)

	if (docSnap.exists()) {
	    return docSnap.data() ; 
	} else {
	    log("Document does not exist");
	    return null
	}


    } catch (error : any) {
	throw new Error(`Error retrieving document: ${error}`)
    } 
}


export async function test_get_user_doc() {
    let args = {
	app_id : "test",
	path : ["data1" ] 
    }
    return await get_user_doc(args) 
} 




/**
 * Stores a document for a user in a specified subcollection path within the "users" collection, with an autogenerated document ID.
 *
 * @param auth - The Firebase Auth instance.
 * @param db - The Firestore instance.
 * @param app_id - ID of the APP that is storing data 
 * @param path - An array of strings representing the subcollection path.
 * @param user_data - The data to be stored in the document.
 * @returns A promise that resolves when the document is successfully written.
 */
export var  store_user_data = async (auth: Auth, db: Firestore, app_id : string, path: string[], user_data: UserData): Promise<void> => {
  try {
    const user_id = auth.currentUser?.uid;
    if (!user_id) {
      throw new Error('User is not authenticated.');
    }

      const full_path = ['users', user_id, app_id, ...path];
      // @ts-expect-error
      const collection_ref = collection(db, ...full_path);
      await addDoc(collection_ref, user_data);
    console.log(`User document for ${user_id} at path ${full_path.join('/')} has been added successfully.`);
  } catch (error) {
    console.error('Error adding user document:', error);
  }
};

/**
 * Retrieves a document for a user from a specified subcollection path within the "users" collection.
 *
 * @param auth - The Firebase Auth instance.
 * @param db - The Firestore instance.
 * @param path - An array of strings representing the subcollection path.
 * @param doc_id - The ID of the document to retrieve.
 * @returns A promise that resolves with the document data if found, otherwise null.
 */
const get_user_data = async (auth: Auth, db: Firestore, path: string[], doc_id: string): Promise<UserData | null> => {
  try {
    const user_id = auth.currentUser?.uid;
    if (!user_id) {
      throw new Error('User is not authenticated.');
    }

      const full_path = ['users', user_id, ...path];

    const doc_ref = doc(db, ...full_path, doc_id);
    const doc_snapshot = await getDoc(doc_ref);

    if (doc_snapshot.exists()) {
      console.log(`Document data for ${user_id} at path ${full_path.join('/')} retrieved successfully.`);
      return doc_snapshot.data() as UserData;
    } else {
      console.log(`No document found for ${user_id} at path ${full_path.join('/')}.`);
      return null;
    }
  } catch (error) {
    console.error('Error retrieving user document:', error);
    return null;
  }
};




/**
 * Main function for adding a new document into a collection. Creates an autogenerated document ID 
 * The last string in the path is assumed to be a collection (and length of path MUST be even) 
 *
 * @returns A promise that resolves when the document is successfully written.
 */
export async function store_user_collection(args : FirebaseDataStoreOps) {

    let {app_id , path , data  } = args ;
    
    let auth = getAuth() ; 
    log(`Request to store in user collection: appid=${app_id}, path =${path}, data=${JSON.stringify(data)}`) 
    return await store_user_data( auth , db, app_id , path, data)
}


export async function test_store_user_collection() {
    let args = {
	app_id : "test" ,
	path : [ "collections" , "settings" ] ,
	data : { setting_1 : 10 } 
    }
    return await store_user_collection(args) 
} 



/**
 * Main function for retrieving a collection 
 * The last string in the path is assumed to be a collection (and length of path MUST be even) 
 *
 * @returns the collection array 
 */
export async function get_user_collection(args : FirebaseDataGetOps) {

    let {app_id , path  } = args ;

    var user_id : any  = null  ;
    let auth = getAuth() 

    try { 
	user_id = auth.currentUser?.uid;
	log(`Detected user id: ${user_id}`)
    } catch (error :any) {
	throw new Error('User is not authenticated.');
	return 
    } 
    
    let full_path = [ "users" , user_id , app_id, ...path]  ;
    
    log(`Request to get user collection: appid=${app_id}, path =${path}`)
    log(`Using full path: ${full_path}`) 
    
    // Get a reference to the collection
    // @ts-expect-error
    const collectionRef = collection(db, ...full_path);

    // Get all documents in the collection
    const snapshot = await getDocs(collectionRef);

    // Create an array to hold the document data
    const documents: any[] = [];

    // Loop through each document in the snapshot
    snapshot.forEach((doc) => {
	// Add the document data to the array
	documents.push({ id: doc.id, ...doc.data() });
    });

    return documents;
}


export async function test_get_user_collection() {
    return get_user_collection({
	app_id : "test" ,
	path : [ "collections" , "settings" ] ,
    })
} 





/*
   Non logged in UTILITIES 
 */


/**
 * Stores a document at a specified collection path, with an autogenerated document ID.
 *
 * @param path - An array of strings representing the collection path.
 * @param data - The data to be stored in the document.
 * @returns A promise that resolves when the document is successfully written.
 */
const store_data = async (path: string[], data: Record<string, any>): Promise<void> => {
  try {
      // Construct the collection reference using the path array
      log(`Request to store data at path: ${path}`)

      // @ts-expect-error      
      const collection_ref = collection(db, ...path);

      await addDoc(collection_ref, data);
      log(`Document at path ${path.join('/')} has been added successfully.`);
  } catch (error) {
    console.error('Error adding document:', error);
  }
};


/*  STORING COLLECTIONS  */ 
export async function store_collection(args : FirebaseDataStoreOps) {
    let {app_id , path , data  } = args ;
    log(`Request to store in collection: appid=${app_id}, path =${path}, data=${JSON.stringify(data)}`)
    let full_path = [ app_id , ...path ] 
    return await store_data( full_path,  data)
}


export async function test_store_collection() {
    let args = {
	app_id : "test" ,
	path : [ "collections" , "settings" ] ,
	data : { setting_1 : 10 } 
    }
    return await store_collection(args) 
} 


/*  GETTING COLLECTIONS  */ 
export async function get_collection(args : FirebaseDataGetOps) {

    let {app_id , path  } = args ;

    let full_path = [ app_id, ...path]  ;
    
    log(`Request to get collection: appid=${app_id}, path =${path}`)
    log(`Using full path: ${full_path}`) 
    
    // Get a reference to the collection
    // @ts-expect-error
    const collectionRef = collection(db, ...full_path);

    // Get all documents in the collection
    const snapshot = await getDocs(collectionRef);

    // Create an array to hold the document data
    const documents: any[] = [];

    // Loop through each document in the snapshot
    snapshot.forEach((doc) => {
	// Add the document data to the array
	documents.push({ id: doc.id, ...doc.data() });
    });

    return documents;
}


export async function test_get_collection() {
    return get_collection({
	app_id : "test" ,
	path : [ "collections" , "settings" ] ,
    })
} 


export async function store_doc(args : FirebaseDataStoreOps) {

    let {app_id , path , data  } = args ;
    
    let full_path = [ app_id, ...path]  ;

    log("full_path")
    log(full_path)

    // @ts-ignore    
    var docRef = doc(db, ...full_path)
    log(`Obtained document reference`) 

    try { 
	await setDoc(docRef, data) 
	log(`Wrote document`)
    } catch (error : any) {
	log(`Error writing document: ${error}`)
	
    } 
}


export async function test_store_doc() {
    let args = {
	app_id : "test",
	path :  ["data1" ] ,
	data : {msg : "hey boi"  } 
    }
    return await store_doc(args); 
} 

export async function get_doc(args : FirebaseDataGetOps) {

    let {app_id , path   } = args ;

    let full_path = [ app_id, ...path]  ;

    log("full_path")
    log(full_path)

    // @ts-ignore    
    var docRef = doc(db, ...full_path)
    log(`Obtained document reference`) 

    try { 
	let docSnap = await getDoc(docRef) 
	log(`Retrieved document`)

	if (docSnap.exists()) {
	    return docSnap.data() ; 
	} else {
	    log("Document does not exist");
	    return null
	}


    } catch (error : any) {
	throw new Error(`Error retrieving document: ${error}`)
    } 
}


export async function test_get_doc() {
    let args = {
	app_id : "test",
	path : ["data1" ] 
    }
    return await get_doc(args) 
} 




export async function logged_in_tests() {
    log(`Logged IN tests`)

    log(`Testing store_user_doc`)
    await test_store_user_doc()

    log(`Testing get_user_doc`)
    let result :any  = await test_get_user_doc()
    log(result) 
    
    
    log(`Testing store_user_collection`)
    await test_store_user_collection()

    log(`Testing get_user_collection`)
    result = await test_get_user_collection()
    log(result)

    log(`DONE`) 
    
} 

export async function logged_out_tests() {
    log(`Logged OUT tests`)

    log(`Testing store_doc`)
    await test_store_doc()

    log(`Testing get_doc`)
    let result : any = await test_get_doc()
    log(result) 
    
    log(`Testing store_collection`)
    await test_store_collection()

    log(`Testing get_collection`)
    result = await test_get_collection()
    log(result)

    log(`DONE`) 
    
} 


export async function test_suite() {

    log(`FIREBASE TEST SUITE`) 

    const auth = getAuth()
    if (auth.currentUser ){
	let uid = auth.currentUser?.uid
	let name = auth.currentUser?.displayName  
	log(`User=${name} is logged in, with id=${uid}`)

	await logged_in_tests()
	await logged_out_tests()
	
    } else {
	log(`No user is logged in`)

	await logged_out_tests()	
    }

    log(`FIREBASE TEST SUITE FINISHED`) 

    
}