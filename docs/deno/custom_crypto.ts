import { Aes } from "https://deno.land/x/crypto@v0.10.0/aes";
import { Cbc, Padding } from "https://deno.land/x/crypto@v0.10.0/block-modes";

const te = new TextEncoder();
const td = new TextDecoder();

/* 

*/
function aes_encrypt(data : any , pw : string) {
    let k = te.encode(pw) ;
    let iv = new Uint8Array(16);
    let cipher = new Cbc(Aes,k,iv, Padding.PKCS7) ;
    let encrypted = cipher.encrypt(data) ;
    return encrypted 
}

function aes_decrypt(data : any, pw : string) {
    let decipher = new Cbc(Aes,te.encode(pw),new Uint8Array(16),Padding.PKCS7)
    return decipher.decrypt(data) 
}




export {
    aes_encrypt,
    aes_decrypt, 
} 
