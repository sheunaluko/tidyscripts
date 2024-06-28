const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');


const serviceAccount = require(process.env['TIDYSCRIPTS_FIREBASE_KEY_LOC']);

initializeApp({
    credential: cert(serviceAccount) 
});

export var db = getFirestore();

var data = {a : 20}

await db.collection('users').doc('alice').set(data) ; 
