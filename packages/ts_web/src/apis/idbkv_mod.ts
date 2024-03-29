
import * as common from "tidyscripts_common" 
const log = common.logger.get_logger({id:"idbmod" }) 

export class Store {
    
  readonly _dbp: Promise<IDBDatabase>;
   _db : any  = null ; 

  constructor(dbName = 'keyval-store', readonly storeName = 'keyval') {
      
      // -- 
      this._dbp = new Promise((resolve, reject) => {
	  
	  //ref 
	  let that = this //because of callback contexts 
	  
	  const openreq = indexedDB.open(dbName, 1);
	  openreq.onerror = () => reject(openreq.error);
	  
	  openreq.onsuccess = function() { 
	      resolve(openreq.result);	    
	      that._db  = openreq.result ; 
	  } 

	  // First time setup: create an empty object store
	  openreq.onupgradeneeded = () => {
	      log(`creating store: ${dbName},  ${storeName}`) 
              openreq.result.createObjectStore(storeName);
	  };
	  
      });
      
  }

  _withIDBStore(type: IDBTransactionMode, callback: ((store: IDBObjectStore) => void)): Promise<void> {
    return this._dbp.then(db => new Promise<void>((resolve, reject) => {
	
	//debug 
	//console.log("The store name is: " + this.storeName) 
	//console.log(this) 
      const transaction = db.transaction(this.storeName, type);
      transaction.oncomplete = () => resolve();
      transaction.onabort = transaction.onerror = () => reject(transaction.error);
      callback(transaction.objectStore(this.storeName));
    }));
  }
    
  get_db() { 
      return this._db
  } 

    
    
}

let store: Store;

function getDefaultStore() {
  if (!store) store = new Store();
  return store;
}

export function get<Type>(key: IDBValidKey, store = getDefaultStore()): Promise<Type> {
  let req: IDBRequest;
  return store._withIDBStore('readonly', store => {
    req = store.get(key);
  }).then(() => req.result);
}

export function set(key: IDBValidKey, value: any, store = getDefaultStore()): Promise<void> {
  return store._withIDBStore('readwrite', store => {
    store.put(value, key);
  });
}

export function del(key: IDBValidKey, store = getDefaultStore()): Promise<void> {
  return store._withIDBStore('readwrite', store => {
    store.delete(key);
  });
}

export function clear(store = getDefaultStore()): Promise<void> {
  return store._withIDBStore('readwrite', store => {
    store.clear();
  });
}

export function keys(store = getDefaultStore()): Promise<IDBValidKey[]> {
  const keys: IDBValidKey[] = [];

  return store._withIDBStore('readonly', store => {
    // This would be store.getAllKeys(), but it isn't supported by Edge or Safari.
    // And openKeyCursor isn't supported by Safari.
    (store.openKeyCursor || store.openCursor).call(store).onsuccess = function() {
      if (!this.result) return;
      keys.push(this.result.key);
      this.result.continue()
    };
  }).then(() => keys);
}
