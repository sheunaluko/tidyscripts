

declare var document : any ; 



/**
 * Assigns 'value' to document.getElementById(id).value 
 */
export function set_value_by_id(id : string,value : string) {
  (document.getElementById(id) as any).value = value  ; 
} 
