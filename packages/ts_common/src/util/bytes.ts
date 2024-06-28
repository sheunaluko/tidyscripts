


/*
 -- 
*/


export function timestampToByteArray(timestamp : number) {
    let buffer = new ArrayBuffer(8);  // create an array buffer of 8 bytes
    let view = new DataView(buffer);  // create a data view for the buffer
    view.setBigUint64(0, BigInt(timestamp), false);  // set the 64-bit unsigned integer
    return new Uint8Array(buffer);  // create a uint8array from the buffer
}


export function prepend_timestamp_as_bytes(existingUint8Array : Uint8Array) {
    let timestamp = (Date.now() as any ) ;
    let byteArrayTimestamp = timestampToByteArray(timestamp);
    // Create a new Uint8Array with size of timestamp byteArray and existingUint8Array
    let resultUint8Array = new Uint8Array(byteArrayTimestamp.length + existingUint8Array.length);
    // Set the timestamp and existing Uint8Array into the new resultUint8Array
    resultUint8Array.set(byteArrayTimestamp);
    resultUint8Array.set(existingUint8Array, byteArrayTimestamp.length);  // Offset by the length of the timestamp
    return resultUint8Array ; 
} 


