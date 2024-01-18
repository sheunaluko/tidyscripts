import * as tsw from 'tidyscripts_web'
// - 
import sus_data from "./sg_sus_data.json" ;
import dics  from "./sg_dics.json" ; 
// - 
let fp = tsw.common.fp ;
let R = tsw.common.R  ;

const data_dir = "."

const  activity_levels  =  [
    "preferred" ,
    "resistant" ,
    "susceptible" ,
    "variable" ,
] 

export  const _bugs =  R.keys(sus_data) as string[] ;
export const _abx = R.values(dics.med_dic).flat() as string[] ; 

export {
  sus_data, dics 
}

/* 
 Sanford Guide   
 */
let organisms = [ 
    [ ["Aerobic", "Gram Positive", "Cocci" ],
      ["E. faecalis", "E. faecium", "VRE faecalis", "VRE faecium", "S. aureus MSSA", "S. aureus HA-MRSA", "S. aureus CA-MRSA", "Staph coag-neg (S)" , "Staph coag-neg (R)" , "S.lugdunensis", "S. saprophyticus", "Strep. anginosus gp" , "Strep. gp A,B,C,F,G", "Strep pneumoniae" , "Viridans Strep."]], 
    [ ["Aerobic", "Gram Positive", "Bacilli"],
      ["Arcanobacter. sp" , "C. diptheriae", "C. jeikeium" , "L. monocytogenes" , "Nocardia sp." ]],
    [ ["Aerobic", "Gram Negative" , "Bacilli", "Enterobacteriaceae" ] , 
      ["Aeromonas sp." , "C. jejuni", "Citrobacter sp."  , "Enterobacter sp." , "E. coli", "E. coli, Klebs ESBL", "E. coli, Klebs KPC", "Klebsiella sp.", "Morganella sp.", "P. mirabilis", "P. vulgaris", "Providencia sp." , "Salmonella sp." , "Serratia sp.", "Shigella sp." , "Y. enterocolitica" ] ] , 
    [ ["Aerobic", "Gram Negative" , "Bacilli", "Miscellaneous" ] , 
      ["Bartonella sp." , "B. pertussis", "B. burgdorferi", "Brucella sp.", "Capnocytophaga", "C. burneti", "Ehrlichia, Anaplas", "Eikenella sp", "F. tularensis", "H. ducreyi", "H. influenzae", "Kingella sp.", "K. granulomatis", "Legionella sp.", "Leptospira", " M. catarrhalis", "N. gonorrhoeae", "N. meningitidis", "P. multocida", "R. rickettsii", "T. pallidum" , "U. urealyticum", "V. cholera", "V. parahaemolyticus" , " V. vulnificus", "Y. pestis" ]],
    [ ["Aerobic", "Gram Negative" , "Bacilli", "Selected non-fermentative GNB (NF-GNB)" ] ,
      ["Acinetobacter sp.", "B. cepacia", "P. aeruginosa", "S. maltophilia"]],
    [ ["Aerobic", "cell wall deficient"] , 
      ["C. trachomatis", "Chlamydophila sp." , "M. genitalium", "M. pneumoniae"] ],
    [ ["Anaerobic", "Gram Negative"], 
      ["B. fragilis" , "F. necrophorum", "P melaninogenica"] ],
    [ ["Anaerobic", "Gram Positive"], 
      ["Actinomyces sp." , "C. difficile", "Clostridium sp." , "P. acnes", "Peptostreptococci"]] 
]

let abx = [
    [ [ "Penicillins" ] , [ "Penicillin G", "Penicillin VK", "Nafcillin", "Oxacillin" ,"Cloxacillin", "Flucloxacillin", "Dicloxacillin", "Ampicillin", "Amoxicillin", "Amoxicillin-Clavulanate", "Ampicillin-Sulbactam", "Piperacillin-Tazobactam"] ], 
    [ ["Carbapenems" ] , ["Doripenem" , "Ertapenem", "Imipenem" , "Meropenem" ] ] , 
    [ ["Aztreonam" ] , ["Aztreonam" ] ] ,     
    [ ["Fluoroquinolones" ] , ["Ciprofloxacin", "Ofloxacin", "Levofloxacin", "Moxifloxacin", "Gemifloxacin", "Gatifloxacin" ] ] ,         
    [ ["Parenteral Cephalosporins" ] , ["Cefazolin", "Cefotetan", "Cefoxitin", "Cefuroxime", "Cefotaxime", "Ceftriaxone" , "Ceftazidime", "Cefepime", "Ceftazidime-Avibactam", "Ceftaroline","Ceftolozane-Tazobactam"] ] ,            
    [ ["Oral Cephalosporins"] ,["Cefadroxil", "Cephalexin", "Cefaclor", "Cefprozil", "Cefurox-Axe", "Cefixime", "Ceftibuten", "Cefpodoxime", "Cefdinir", "Cefditoren"] ], 
    [ ["Aminoglycosides"] ,["Gentamicin", "Tobramycin", "Amikacin"] ] , 
    [ ["Lincosamides"] ,["Clindamycin"] ] ,     
    [ ["Chloramphenicol"] ,["Chloramphenicol"] ] ,         
    [ ["Macrolides"] ,["Erythromycin" , "Azithromycin", "Clarithromycin", "Telithromycin"] ] ,         
    [ ["Tetracycline"] ,["Doxycycline", "Minocycline", "Tigecycline"] ] ,             
    [ ["Glyco/Lipo"] ,["Daptomycin" , "Vancomycin" , "Teicoplanin", "Telavancin", "Oritavancin", "Dalbavancin"] ] ,                 
    [ ["Ox-lid"] ,["Linezolid", "Tedizolid"] ] ,                 
    [ ["Miscellaneous"] ,["Fusidic Acid", "Rifampin", "Trimethoprim-Sulfamethoxazole", "Nitrofurantoin", "Fosfomycin", "Metronidazole", "Quinu-Dalfo", "Polymixin B","Colistin"] ], 

]




export var info = { organisms, abx }  


//parse the info 

/*
  need to fix this! need to filter the abx and drugs separately? 
 */
export var abx_parsed : any = {}  ; 
export var orgs_parsed : any = {}  ; 

function parse_it(thang : any, parsed  : any) { 
    for ( var o of thang ) {  
	let [ categories, items ] = o ; 
	
	for (var c of categories ) { 
	    
	    if (parsed[c]) { 
		for (var  i of items) { 
		    parsed[c].push(i)
		} 
	    } else { 
		parsed[c]  = fp.clone_array(items) 
	    } 
	} 
    }  
} 

parse_it(organisms, orgs_parsed) ; parse_it(abx, abx_parsed); 

export var all_abx  = abx.map(x=>x[1]).flat()
export var all_orgs = organisms.map(x=>x[1]).flat()    
export var abx_classes = fp.keys(abx_parsed)   
export var orgs_classes = fp.keys(orgs_parsed)   

export function compute_it(parsed : any, class_list : string[] , mode : string , to_filter : string[] ) { 
    
    console.log(`Mode is ${mode}`) 
    console.log(mode) 
    mode = mode.toLowerCase(); 
    
    if (mode == "or" ) { 
	console.log("Computing union")
	let all_items = class_list.map( cl => fp.clone_array( parsed[cl] ) ).flat()
	return to_filter.filter( a => all_items.includes(a) )
    }
    
    if (mode == "and") {
	let candidates = to_filter ; 
	console.log("Computing intersection")
	console.log(`Starting with ${fp.len(candidates)} items`)
	for (var cls of class_list ) { 
	    //iterative 
	    let next_items = parsed[cls] 
	    //check if they are same class 
	    if  ( all_abx.includes( next_items[0]) == all_abx.includes(candidates[0]) )  {
		//yes (the candidates and next items are both abx, or are both drugs)
		console.log("Intersection: " + cls)
		candidates = candidates.filter( c => next_items.includes(c))
		console.log(`Now have ${fp.len(candidates)} items`)			    
	    } else { 
		//no so dont filter 
	    } 
	    
	} 
	return candidates 
    }
} 
export function get_abx_list(class_list : string[], mode : string) { 
    return compute_it(abx_parsed, class_list, mode, all_abx)
} 

export function get_org_list(class_list : string[], mode : string) { 
    return compute_it(orgs_parsed, class_list, mode, all_orgs)
} 


//------ 


export function ABX_BUG_TO_ID(abx : string, bug : string) {
  return `${abx}_${bug}` ;     
}

export function convert_sus_data_to_id_pairs(sus_data : any) {

  let  data : any  = {} ; 
  for (var bug of _bugs ) {
    for (var ab of _abx ) {
      let id = ABX_BUG_TO_ID(ab,bug)
      data[id] = sus_data[bug][ab]
    } 
  } 

  return data 
  
} 


export async function populate_antibiogram(abd : any) {
    //abd -> antibiogram database
    let id_pairs  = convert_sus_data_to_id_pairs(sus_data)  ;
    return (await abd.set("block_states", id_pairs) ) ; 
} 
