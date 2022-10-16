import {
    createHmac,
    scrypt,
    randomFill,
    createCipheriv,
    createDecipheriv ,   
    randomBytes    ,
    createHash
} from 'crypto' ;

import util from "util" ;

import * as io from "./io" 

import fs from 'fs' ; 

export type HmacParams = {
    'algorithm' : string,
    'secret' :  any,
    'data' : string,
    'digest' : string
}

/**
 * Computes hmac 
 * ```typescript
 * let hex = hmac({algorithm: "sha256", secret : 'my secret', data : 'my data', digest : 'hex'}) 
 * ```
 */
export function hmac(params : HmacParams) {
    let {
	algorithm, secret, data , digest
    } = params
    const hmac = createHmac(algorithm, secret);
    hmac.update(data) ;
    return hmac.digest(digest as any) ; 
}

/**
 * Async scrypt function for computing encryption key.
 * This is a wrapper around the builtin scrypt function using util.promisify 
 * @param password - the password 
 * @param salt  - the salt 
 * @param legnth - the length of the encryption key 
 */
export async function async_scrypt(password : string, salt : string, length : number) {
    let f =  util.promisify(scrypt) ;
    return await f( password, salt, length)
}


/**
 * Performs in memory AES-192 encryption on a message given the supplied password. 
 * Generates a random initialization vector (iv) for the encryption, and returns 
 * both the cipher text and the iv. 
 * @param password - encryption password 
 * @param message - Message to encrypt, which is usually a String or a Buffer 
 */
export async function aes_192_encrypt_message(password : string, message : (string | Buffer)) {

    const algorithm = 'aes-192-cbc';

    //Generate key. For aes192 use 24 byte key (192 bits) - see (https://nodejs.org/api/crypto.html#class-cipher) 
    let key = await async_scrypt(password , "salt" , 24) ;

    //Generate initialization vector
    let iv = await randomBytes(16) 

    //Create the cipher 
    const cipher = createCipheriv(algorithm, key as any, iv);

    //By default, chunks will appear as buffers, which are decoded from the input which is assumed to be utf8 string 
    let chunks : any  = []
    cipher.on('data', function(chunk) {
	chunks.push(chunk) ;
    }); 
    cipher.on('end', () => null);
    cipher.write(message); //because message is a string - it is transformed to Buffer assuming utf8  
    cipher.end();    

    //Collect the chunks into a buffer and return everything 
    return {
	iv ,
	cipher : Buffer.concat(chunks), 
    }
    
} 


/**
 * Performs in memory AES-192 decryption on a buffer given the supplied password and initialization vector 
 * Returns the decrypted buffer.  
 */
export async function aes_192_decrypt_buffer(password : string, cipher : Buffer , iv : Buffer) {

    const algorithm = 'aes-192-cbc';

    //Generate key. For aes192 use 24 byte key (192 bits) - see (https://nodejs.org/api/crypto.html#class-cipher) 
    let key = await async_scrypt(password , "salt" , 24) ;

    //Prep the decipher object 
    const decipher = createDecipheriv(algorithm, key as any, iv);
    let decrypted_chunks : any = [ ]; 
    decipher.on('readable', () => {
	var chunk ; 
	while (null !== (chunk = decipher.read())) {
	    decrypted_chunks.push(chunk)
	}
    });
    decipher.on('end', () => null )
        
    //Write the cipher and trigger the end  
    decipher.write(cipher) 
    decipher.end();

    //Return concatted decrypted chunks 
    return Buffer.concat(decrypted_chunks)    
    
} 


/**
 * Performs in memory AES-192 encryption of a file given the supplied password. 
 * The encrypted output cipher is prepended with the randomly generated 16 byte initialization vector (iv) prior to writing to disk. 
 * See aes_192_decrypt_file for more information on decryption. 
 * @param password - Password to use for encryption 
 * @param input_file - File to encrypt 
 * @param output_file  - Path (including extension) to write the encrypted file to 
 */
export async function aes_192_encrypt_file(password : string, input_file : string,  output_file : string ) : Promise<void> {

    //first read the input file into memory 
    let input_buffer = io.read_buffer_from_file(input_file) ;

    //next we encrypt the buffer using the password 
    let {
	iv, cipher 
    }  = await aes_192_encrypt_message(password , input_buffer )

    //then we concat the iv and the cipher and write them to the output_file
    io.write_file(output_file, Buffer.concat([iv,cipher]) )
    
} 


/**
 * Performs in memory AES-192 decryption of a file given the supplied password. 
 * Assumes that the first 16 bytes of the file are the plaintext initial vector (see aes_192_encrypt_file). 
 * Returns a decrypted buffer (which can then be converted to a string for text files) 
 * @param password - Password to use for decryption 
 * @param filename - File to decrypt
 */
export async function aes_192_decrypt_file(password : string, filename : string ) { 
    
    //get fd 
    let fd = await  fs.promises.open(filename,'r')

    //allocate 16 bytes for the iv 
    let iv = Buffer.alloc(16)
    // see https://nodejs.org/dist/latest-v10.x/docs/api/fs.html#fs_filehandle_readfile_options
    // to understand the below ops
    // Note that the last option specifies the position in the file to START reading from
    // -- interestingly, if it is an integer (0) then the internal file position is NOT updated
    // -- if it is null then the file position IS updated after the read
    // -- this is important because the later readFile call STARTS at the last file position 
    await fd.read(iv,0,16,null) 

    //read the rest of the file
    //https://nodejs.org/dist/latest-v10.x/docs/api/fs.html#fs_filehandle_readfile_options
    let cipher = await fd.readFile()   ;

    fd.close() ; 

    //decrypt the file
    let decrypted_buffer = await aes_192_decrypt_buffer(password, cipher, iv) ;

    return decrypted_buffer 
    
} 



/**
 * Computes the hash (checksum) of a file 
 * @param fname - Name of the file 
 * @param hash_type  - Type of hash to compute 
 */
export function file_checksum(fname : string, hash_type : string) {
    let hash = createHash(hash_type) ;
    const input = fs.readFileSync(fname) ; 
    hash.update(input)
    let result = hash.digest("hex")
    return result 
} 
