

import {MongoClient } from 'mongodb' ;


/**
 * Returns a local mongo client object that is connected to the database named `db_name`
 */
export async function get_local_client_by_db_name(db_name : string){
  // Connection URL
  const url = 'mongodb://localhost:27017';
  const client = new MongoClient(url);
  // Use connect method to connect to the server
  await client.connect();
  const db = client.db(db_name);
  //const collection = db.collection('documents');
  return db ; 
}
