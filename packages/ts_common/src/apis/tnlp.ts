import nlp from 'compromise' ;


export function parse(t : string) {
    let doc = nlp(t) ;
    return doc.json() ; 
} 

/**
 * Splits the input text into sentences and returns an array of sentences 
 *
 */ 

export function get_sentences(t : string) {
    return nlp(t).fullSentences().out("array")
} 
    
export {nlp } 
