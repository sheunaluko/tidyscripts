import * as firestore from "@google-cloud/firestore"
import * as common from "tidyscripts_common"
import * as io from "../io"

const log = common.logger.get_logger({ id: "fire_u" })

// Firestore instance
const F = new firestore.Firestore()

/**
 * Fetches all documents from a specified Firestore collection path.
 *
 * @param collection_path - The path of the collection to fetch
 * @returns A Promise resolving to an array of objects with the shape { id, full_path, document }
 */
export async function get_collection_docs(
  collection_path: string
): Promise<Array<{ id: string; full_path: string; document: firestore.DocumentData }>> {

  log(`Starting download for collection: ${collection_path}`)

  try {
    const snapshot = await F.collection(collection_path).get()
    log(`Number of documents found: ${snapshot.size}`)

    const docs = snapshot.docs.map((doc) => {
      log(`Processing doc ID: ${doc.id}`)
      return {
        id: doc.id,
        full_path: io.path.join(collection_path, doc.id),
        document: doc.data()
      }
    })

    log(`Download completed for collection: ${collection_path}`)
    return docs
  } catch (error) {
    log(`Error downloading docs from collection: ${collection_path}`)
    throw error
  }
}

/**
 * Stores each document at its specified full Firestore path.
 *
 * @param db - A Firestore instance from @google-cloud/firestore (not used in the snippet, but included for structure)
 * @param docs - An array of objects containing { full_path, document }
 *   - `full_path` should be the full Firestore path to the document (including the document ID).
 *   - `document` is the data to store.
 *
 * @returns A Promise<void> that resolves when all documents have been written.
 */
export async function store_docs_at_paths(
  db: firestore.Firestore,
  docs: Array<{ full_path: string; document: firestore.DocumentData }>
): Promise<void> {

  log(`Storing ${docs.length} document(s).`)

  try {
    await Promise.all(
      docs.map(async (doc) => {
        log(`Storing document at path: ${doc.full_path}`)
        // Using the global Firestore instance (F) in this snippet
        await F.doc(doc.full_path).set(doc.document)
      })
    )

    log('All documents stored successfully.')
  } catch (error) {
    log('Error storing documents.')
    throw error
  }
}

/**
 * Retrieves all documents from the specified Firestore collection, applies a mapper
 * function to each document's data, and stores the updated documents back to Firestore.
 *
 * @param collection_path - The Firestore collection path to retrieve
 * @param mapper - A function that takes a single document object and returns the transformed document data
 *
 * @returns A Promise<void> that resolves once all documents have been updated.
 */
export async function map_function_on_collection(
  collection_path: string,
  mapper: (
    doc: { id: string; full_path: string; document: firestore.DocumentData }
  ) => firestore.DocumentData
): Promise<void> {
  log(`Starting map_function_on_collection on: ${collection_path}`)

  try {
    // 1. Retrieve all documents in the collection
    const docs = await get_collection_docs(collection_path)

    // 2. Apply the mapper function to transform each document’s data
    const updated_docs = docs.map((doc) => {
      const new_data = mapper(doc)
      return {
        full_path: doc.full_path,
        document: new_data
      }
    })

    // 3. Store the updated documents back to Firestore
    await store_docs_at_paths(F, updated_docs)

    log(`Mapping complete for collection: ${collection_path}`)
  } catch (error) {
    log(`Error in map_function_on_collection: ${error}`)
    throw error
  }
}

/**
 * Converts the firestore time field (time_created) into a human readable time string (time_string)  
 * for ALL documents in a collection 
 */
export async function convert_collection_doc_times_to_string(collection_path: string) {
    return await map_function_on_collection(collection_path,function(d){ d.document['time_string'] = d.document['time_created'].toDate().toString() ; return d} )
}

//todo -- I have converted the exercise log --
// need to do it on:

const logs_to_convert = [
    "cortex_enhancements",
    "daily_log",
    "dreamlog",
    "health_log", 
    "healthy_eating",
    "investing_log",
    "reminders",
    "to_do",
    "weight_log" 
]
