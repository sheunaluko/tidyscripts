import {
  Firestore,
  FieldValue,
  VectorQuery,
  VectorQuerySnapshot,
} from "@google-cloud/firestore";

import node from "../../packages/ts_node/dist/index"

const {common} = node ;
const log = common.logger.get_logger({'id' : 'tex'}) ; 
const {oai}    = common.apis ; 

const db = new Firestore();
const col = "/users/E9drnNZa3SdsVsHNrLFsU6pcml32/tex/tests/embedding_space"
const coll = db.collection(col);


export const topics = [
  "The cat loves chasing red laser dots. The cat enjoys napping in sunny spots. The cat frequently climbs the tallest furniture in the house.",
  "A scientist discovers a new species of butterfly. A scientist analyzes the behavior of ants. A scientist studies the migration patterns of birds.",
  "An artist paints vibrant landscapes full of color. An artist sketches portraits of famous personalities. An artist creates sculptures that captivate the audience.",
  "The robot cleans the house with precision. The robot organizes the bookshelf alphabetically. The robot vacuums the floors without missing a spot.",
  "A chef experiments with exotic spices to create new dishes. A chef perfects a soufflé with delicate techniques. A chef invents desserts that surprise everyone.",
  "A musician practices piano for hours every day. A musician composes melodies inspired by nature. A musician performs concerts to standing ovations.",
  "A traveler hikes through dense forests to find hidden waterfalls. A traveler explores ancient ruins in faraway lands. A traveler discovers local cultures while tasting traditional foods.",
  "The athlete trains tirelessly to improve their endurance. The athlete competes in marathons across the world. The athlete wins medals by breaking personal records.",
  "A programmer writes code to automate mundane tasks. A programmer debugs errors to improve software efficiency. A programmer develops apps to simplify daily life.",
  "The inventor creates a device to recycle plastic efficiently. The inventor designs machines to harness renewable energy. The inventor builds gadgets to improve accessibility for people with disabilities."
];

export async function load_tests() {
    topics.map( async (t:string) => {
	log(t) 
	let e = await oai.get_embedding(t,512) ;
	log(`Got embedding`) 
	let doc = {
	    text : t , 
	    embedding : FieldValue.vector(e) 
	}
	await coll.add(doc)
	log(`addded doc`)
    })
} 


export async function main(t : string) {
    let e = await oai.get_embedding(t, 512) ;
    log(`Got embedding of ${t}`) 

    // Requires a single-field vector index
    const vectorQuery: VectorQuery = coll.findNearest({
	vectorField: 'embedding',
	queryVector: e , 
	limit: 3,
	distanceMeasure: 'COSINE'
    }) ; 

    const vectorQuerySnapshot: VectorQuerySnapshot = await vectorQuery.get();
    log(`Got snapshot`) 
    return vectorQuerySnapshot; 
} 






