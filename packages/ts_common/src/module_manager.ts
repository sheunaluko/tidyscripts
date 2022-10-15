

function log (msg : any){
    console.log(msg)
}


var hash_num = 1 ; 

var the_registry : any  = {} ;

export function register( fpath : string , name : string) {
    the_registry[name] = fpath ; 
}

export async function reload( name : string) {
    let import_path = `${the_registry[name]}#${hash_num++}`
    let new_mod = await import(import_path)
    return new_mod 
} 



export {
    the_registry 
}
