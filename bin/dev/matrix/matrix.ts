/**
 * Matrix - Knowledge Graph with LLM-based extraction and vector search
 *
 * Matrix is a knowledge graph built on SurrealDB that uses LLMs to automatically
 * extract entities and relations from text, then stores them with vector embeddings
 * for semantic search and graph traversal.
 *
 * @example Basic Usage
 * ```typescript
 * import { matrix } from "tidyscripts/bin/dev";
 *
 * // Initialize Matrix
 * const kg = new matrix.Matrix({
 *   name: 'my_knowledge_graph',
 *   connectionOps: {
 *     url: 'ws://localhost:8000/rpc',
 *     namespace: 'test',
 *     database: 'knowledge'
 *   },
 *   completionOps: {
 *     model: 'gpt-4o'
 *   }
 * });
 *
 * // Connect and setup
 * await kg.connect();
 * await kg.setup();
 *
 * // Add knowledge from text
 * const update = await kg.add_knowledge(
 *   "Albert Einstein developed the theory of relativity.",
 *   { source: 'wikipedia', topic: 'physics' }
 * );
 *
 * // Search for knowledge
 * const results = await kg.search_for_knowledge(
 *   "Who developed relativity?",
 *   { limit: 10, graphDepth: 2 }
 * );
 *
 * console.log(results.entities);  // Matching entities
 * console.log(results.relations); // Matching relations
 * console.log(results.graph);     // Expanded graph neighborhood
 * ```
 *
 * @example With Event Listeners
 * ```typescript
 * kg.on('knowledge_added', (graphUpdate) => {
 *   console.log(`Added ${graphUpdate.entityUpdate.added.length} entities`);
 *   console.log(`Added ${graphUpdate.relationUpdate.added.length} relations`);
 * });
 *
 * await kg.add_knowledge("The sun is a star.", { source: 'textbook' });
 * ```
 *
 * @example Extract Entities and Relations Separately
 * ```typescript
 * const text = "Marie Curie won the Nobel Prize in Physics.";
 *
 * // Extract entities
 * const entities = await kg.extract_entities(text);
 * console.log(entities); // [{ id: 'marie_curie', ... }, { id: 'nobel_prize', ... }]
 *
 * // Extract relations between entities
 * const relations = await kg.extract_relations(text, entities);
 * console.log(relations); // [{ name: 'won', source: 'marie_curie', target: 'nobel_prize', ... }]
 * ```
 */

import { EventEmitter } from 'events';
import { zodResponseFormat } from 'openai/helpers/zod';
import { Surreal } from 'surrealdb';
import * as helpers from "./matrix_helpers"
import * as templates from "./matrix_surreal_query_templates"
import * as prompts from "./matrix_prompt_templates"

import common from "../../../packages/ts_common/dist/index";

const debug = common.util.debug ;

/*
   debug.add("var_name", var) ; // can be used for inspecting objects later 
*/


/*
   Schema is as follows: 
   
   tables: 
     - Entity (stores records for entities in the KG)   
     - EntityUpdate 
     - RelationUpdate
     - GraphUpdate  (see below)  
   relations: various relations (unlimited, but deduplicated)  

 */

type Entity = {
    id : string, //the name of the entity (cannot be duplicated)  
    embedding : number[] , //the vector embedding of the id
    created? : any , //optional date created (will be autopopulated by db)
    updateId : string, //id of the update that added this record 
}

type Relation = {
    name : string, //the name of the relation (i.e. -- "has" ), equivalent to the table name
    id : string, //the id (not duplicated), which is "${source.id} ${name} ${target.id}"
    embedding : number[] , //vector embedding of the id
    source : Entity ,
    target : Entity ,
    created? : any , //optional date created (will be autopopulated by db)
    updateId : string, //id of the update that added this record
}

type ConnectionOps = {
    url : string ,
    namespace? : string ,
    database? : string ,
    username? : string ,
    password? : string
}

type MatrixOps =  {
    name : string ,
    connectionOps : ConnectionOps ,
    completionOps : any 
}

type EntityUpdate = {
    existed : string[] ,  // entity IDs that already existed
    added : string[] ,    // entity IDs that were added
    removed : string[],   // entity IDs that were removed
    id : string , //id of the update
}

type RelationUpdate = {
    existed : string[] ,  // relation IDs that already existed
    added : string[] ,    // relation IDs that were added
    removed : string[],   // relation IDs that were removed
    id : string , //id of the update
}

type GraphUpdate = {
    entityUpdate? : EntityUpdate,
    relationUpdate? : RelationUpdate
    id : string, //
    metadata? : any ,
    text? : string,  //some graph updates are based on provded text
    embedding? : number[]  , //the embedding of the provided text
    
}


/*
   
   Implementation guidance: 

   1) place all helper functions inside matrix_helpers.ts 
   2) include a structured completion helper function, with pattern similar to use in cortex.ts  
   3) structured_completion helper is used for entity and relation extraction, prompt templates are 
      stored inside matrix_prompt_templates.ts  
   4) AI model for structured completion is passed inisde of completionOps (part of MatrixOps) 
   5) this.log is used for debugging, as well as debug function itself: 
        debug.add("var_name", var) ; // can be used for inspecting objects later 

   6) the database is surrealql! 
   7) do not duplicate objects , instead RE_USE references using surrealql syntax 
   8) complete all incomplete functions 
   9) look at ~/dev/tidyscripts/packages/ts_node/src/tom.ts for potential guidance on surreal query 
      construction, but realize that architecture and types are a bit different 

   10) create a file matrix_surreal_query_templates.ts to store the various query templates used in 
       the functions 
*/



export class Matrix extends EventEmitter {

    name : string;
    db   : Surreal | null = null; //ref to surrealdb instance
    connectionOps : ConnectionOps ;
    completionOps : any ;
    log : any ;

    constructor(ops : MatrixOps)  {
	super();

	let { name, connectionOps, completionOps } = ops;

	this.name  = name ;
	this.connectionOps  = connectionOps ;
	this.completionOps = completionOps ;
	this.log = common.logger.get_logger({'id': name })

    }

    /**
     * Connect to SurrealDB
     */
    async connect(): Promise<void> {
	this.log(`Connecting to SurrealDB at ${this.connectionOps.url}`);

	const db = new Surreal();
	await db.connect(this.connectionOps.url);

	// Use namespace and database if provided
	const ns = this.connectionOps.namespace || 'matrix';
	const dbName = this.connectionOps.database || 'matrix';
	await db.use({ namespace: ns, database: dbName });

	// Authenticate if credentials provided
	if (this.connectionOps.username && this.connectionOps.password) {
	    await db.signin({
		username: this.connectionOps.username,
		password: this.connectionOps.password,
	    });
	}

	this.db = db;
	this.log(`Connected to SurrealDB`);
    }

    /**
     * Setup database indexes for vector search
     * Call after connect(), before any add/search operations
     */
    async setup(): Promise<void> {
	if (!this.db) {
	    throw new Error('Database not connected. Call connect() first.');
	}

	this.log(`Setting up HNSW indexes...`);

	// Create indexes for vector search (will be ignored if they already exist)
	try {
	    await this.db.query(templates.CREATE_ENTITY_EMBEDDING_INDEX);
	    this.log(`Entity embedding index created`);
	} catch (e) {
	    this.log(`Entity embedding index may already exist`);
	}

	try {
	    await this.db.query(templates.CREATE_RELATION_EMBEDDING_INDEX);
	    this.log(`Relation embedding index created`);
	} catch (e) {
	    this.log(`Relation embedding index may already exist`);
	}

	try {
	    await this.db.query(templates.CREATE_GRAPH_UPDATE_EMBEDDING_INDEX);
	    this.log(`GraphUpdate embedding index created`);
	} catch (e) {
	    this.log(`GraphUpdate embedding index may already exist`);
	}

	this.log(`Setup complete`);
    }

    /**
     * Run structured completion using the pattern from cortex.ts
     */
    private async run_structured_completion<T>(options: {
	schema: any,
	schema_name: string,
	messages: { role: 'system' | 'user' | 'assistant', content: string }[]
    }): Promise<T> {
	const { schema, schema_name, messages } = options;
	const model = this.completionOps?.model || 'gpt-4o';

	this.log(`Running structured completion: ${schema_name}`);

	const response_format = zodResponseFormat(schema, schema_name);

	const result = await fetch(`https://www.tidyscripts.com/api/openai_structured_completion`, {
	    method: 'POST',
	    headers: { 'Content-Type': 'application/json' },
	    body: JSON.stringify({
		messages,
		model,
		response_format
	    })
	});

	const jsonData = await result.json();

	if (jsonData.error) {
	    this.log(`Structured completion error: ${JSON.stringify(jsonData.error)}`);
	    throw new Error(`Structured completion failed: ${jsonData.error.message || jsonData.error}`);
	}

	const parsed = jsonData.choices[0].message.parsed;
	debug.add(`matrix_${schema_name}`, parsed);

	return parsed;
    }

    /**
     * Extract entities from text using structured completion
     */
    async extract_entities(text: string): Promise<Entity[]> {
	this.log(`Extracting entities from text`);

	const messages = prompts.build_entity_extraction_messages(text);

	const response = await this.run_structured_completion<{
	    entities: prompts.ExtractedEntity[]
	}>({
	    schema: prompts.EntityExtractionResponseSchema,
	    schema_name: 'EntityExtraction',
	    messages
	});

	// Generate a temporary updateId for entity creation
	const tempUpdateId = await helpers.generate_update_id(text, { type: 'extraction' });

	// Convert extracted entities to Entity type with embeddings
	const entities: Entity[] = await Promise.all(
	    response.entities.map(async (e) => {
		const entity = await helpers.create_entity(e.name, tempUpdateId);
		return entity as Entity;
	    })
	);

	// Deduplicate by ID
	const deduplicated = helpers.deduplicate_entities(entities);

	this.log(`Extracted ${deduplicated.length} unique entities`);
	debug.add('extracted_entities', deduplicated);

	return deduplicated;
    }

    /**
     * Add entities to the matrix database
     */
    async add_entities(ea: Entity[], updateId: string): Promise<EntityUpdate> {
	if (!this.db) {
	    throw new Error('Database not connected. Call connect() first.');
	}

	this.log(`Adding ${ea.length} entities to matrix`);

	const existed: string[] = [];
	const added: string[] = [];

	for (const entity of ea) {
	    // Check if entity exists
	    const checkResult = await this.db.query(
		templates.CHECK_ENTITY_EXISTS,
		{ id: entity.id }
	    ) as any ; 

	    const exists = checkResult[0].length > 0;

	    if (exists) {
		existed.push(entity.id);
		this.log(`Entity ${entity.id} already exists`);
	    } else {
		// Insert new entity
		const entityData = {
		    id: entity.id,
		    embedding: entity.embedding,
		    updateId: updateId,
		    created: new Date().toISOString()
		};

		await this.db.query(templates.INSERT_ENTITY, { entity: entityData });
		added.push(entity.id);
		this.log(`Added entity ${entity.id}`);
	    }
	}

	const entityUpdate: EntityUpdate = {
	    existed,
	    added,
	    removed: [],
	    id: updateId
	};

	// Store the update record
	await this.db.query(templates.STORE_ENTITY_UPDATE, {
	    id: updateId,
	    existed: existed,
	    added: added,
	    removed: []
	});

	this.log(`EntityUpdate complete: ${added.length} added, ${existed.length} existed`);
	debug.add('entity_update', entityUpdate);

	return entityUpdate;
    }

    /**
     * Extract relations between entities from text
     */
    async extract_relations(text: string, entities: Entity[]): Promise<Relation[]> {
	this.log(`Extracting relations for ${entities.length} entities`);

	const messages = prompts.build_relation_extraction_messages(
	    text,
	    entities.map(e => ({ name: e.id }))
	);

	const response = await this.run_structured_completion<{
	    relations: prompts.ExtractedRelation[]
	}>({
	    schema: prompts.RelationExtractionResponseSchema,
	    schema_name: 'RelationExtraction',
	    messages
	});

	// Build entity lookup map
	const entityMap = new Map<string, Entity>();
	entities.forEach(e => {
	    entityMap.set(e.id, e);
	    entityMap.set(helpers.format_id(e.id), e);
	});

	const tempUpdateId = await helpers.generate_update_id(text, { type: 'relation_extraction' });

	// Convert to Relation type with embeddings
	const relations: Relation[] = [];

	for (const r of response.relations) {
	    const sourceId = helpers.format_id(r.source);
	    const targetId = helpers.format_id(r.target);

	    const source = entityMap.get(sourceId);
	    const target = entityMap.get(targetId);

	    if (!source || !target) {
		this.log(`Skipping relation: source or target not found (${r.source} -> ${r.target})`);
		continue;
	    }

	    const relation = await helpers.create_relation(
		r.name,
		source,
		target,
		tempUpdateId
	    );

	    relations.push(relation as Relation);
	}

	const deduplicated = helpers.deduplicate_relations(relations);

	this.log(`Extracted ${deduplicated.length} unique relations`);
	debug.add('extracted_relations', deduplicated);

	return deduplicated;
    }


    /**
     * Add relations to the matrix database
     */
    async add_relations(ra: Relation[], updateId: string): Promise<RelationUpdate> {
	if (!this.db) {
	    throw new Error('Database not connected. Call connect() first.');
	}

	this.log(`Adding ${ra.length} relations to matrix`);

	const existed: string[] = [];
	const added: string[] = [];

	for (const relation of ra) {
	    // Check if relation exists in metadata table
	    const checkResult = await this.db.query(
		templates.CHECK_RELATION_EXISTS,
		{ id: relation.id }
	    ) as any;

	    const exists = checkResult[0].length > 0;

	    if (exists) {
		existed.push(relation.id);
		this.log(`Relation ${relation.id} already exists`);
	    } else {
		// Create the graph relation using RELATE
		await this.db.query(templates.CREATE_RELATION, {
		    source_id: relation.source.id,
		    target_id: relation.target.id,
		    relation_name: relation.name,
		    relation_id: relation.id,
		    embedding: relation.embedding,
		    updateId: updateId
		});

		// Also store in metadata table for vector search
		await this.db.query(templates.INSERT_RELATION_METADATA, {
		    relation_id: relation.id,
		    relation_name: relation.name,
		    source_id: relation.source.id,
		    target_id: relation.target.id,
		    embedding: relation.embedding,
		    updateId: updateId
		});

		added.push(relation.id);
		this.log(`Added relation ${relation.id}`);
	    }
	}

	const relationUpdate: RelationUpdate = {
	    existed,
	    added,
	    removed: [],
	    id: updateId
	};

	// Store the update record
	await this.db.query(templates.STORE_RELATION_UPDATE, {
	    id: updateId,
	    existed: existed,
	    added: added,
	    removed: []
	});

	this.log(`RelationUpdate complete: ${added.length} added, ${existed.length} existed`);
	debug.add('relation_update', relationUpdate);

	return relationUpdate;
    }


    

    
    

    /**
     * Reconcile entities  
     *
     */
    async reconcile_entities( ea : Entity[]) {
	/*
	   Takes an array of entities that have been extracted, and compares them to the database. 
	   Creates a summary: 
	    - existing entities 
	    - non-existent entities 
	    - merge proposals 
	   
	   Am thinking about this -> on the one hand it is good to deduplicate before inserting  
	   ON the other hand there could be scalability benefits of simply inserting and 
	   Having a separate process that runs in background and prunes / manages the ontology 
	   As it grows.  

	   The latter architecture seems less complex and also more flexible - for example can generate an ontology in parallel and then merge it (via clustering methodology)  

	   Overall I will start by not overcomplicating things -- will let matrix build up naturally 
	   And then develop pruning / maintenance strategies as we go 
	   
	 */
	return null ;  //forget this for now 
	
    }
    
    
    /**
     * Add knowledge to the KG - main pipeline
     */
    async add_knowledge(text: string, metadata: any): Promise<GraphUpdate> {
	if (!this.db) {
	    throw new Error('Database not connected. Call connect() first.');
	}

	this.log(`Adding knowledge to matrix`);

	// Step 0: Generate shared updateId from hash of text+metadata
	const updateId = await helpers.generate_update_id(text, metadata);
	this.log(`Update ID: ${updateId}`);

	// Step 1: Extract entities
	const entities = await this.extract_entities(text);

	// Update entity updateIds to use shared updateId
	entities.forEach(e => e.updateId = updateId);

	// Step 2: Extract relations
	const relations = await this.extract_relations(text, entities);

	// Update relation updateIds to use shared updateId
	relations.forEach(r => r.updateId = updateId);

	// Step 3: Add entities to database (pass shared updateId)
	const entityUpdate = await this.add_entities(entities, updateId);

	// Step 4: Add relations to database (pass shared updateId)
	const relationUpdate = await this.add_relations(relations, updateId);

	// Step 5: Compute embedding for the input text
	const textEmbedding = await helpers.get_embedding(text);

	// Step 6: Create and store GraphUpdate
	const graphUpdate: GraphUpdate = {
	    entityUpdate,
	    relationUpdate,
	    id: updateId,
	    metadata,
	    text,
	    embedding: textEmbedding
	};

	await this.db.query(templates.STORE_GRAPH_UPDATE, {
	    id: updateId,
	    entityUpdateId: entityUpdate.id,
	    relationUpdateId: relationUpdate.id,
	    text,
	    embedding: textEmbedding,
	    metadata
	});

	this.log(`GraphUpdate complete: ${updateId}`);
	debug.add('graph_update', graphUpdate);

	this.emit('knowledge_added', graphUpdate);

	return graphUpdate;
    }

    /**
     * Search for knowledge using embedding similarity and graph traversal
     */
    async search_for_knowledge(text: string, ops: any): Promise<{
	query: string;
	entities: any[];
	relations: any[];
	graph: any[];
    }> {
	if (!this.db) {
	    throw new Error('Database not connected. Call connect() first.');
	}

	this.log(`Searching for knowledge: ${text}`);

	const limit = ops?.limit || 5;
	const effort = ops?.effort || 40;
	const graphDepth = ops?.graphDepth || 1;

	// Step 1: Get embedding for query text
	const queryEmbedding = await helpers.get_embedding(text);

	// Step 2: Vector search for similar entities
	const entityResults = await this.db.query(
	    templates.ENTITY_VECTOR_SEARCH.replace("$limit",limit).replace("$effort",effort),
	    { e: queryEmbedding  }
	) as any;

	const matchedEntities = entityResults[0] || [];
	this.log(`Found ${matchedEntities.length} matching entities`);

	// Step 3: Vector search for similar relations
	const relationResults = await this.db.query(
	    templates.RELATION_VECTOR_SEARCH.replace("$limit",limit).replace("$effort",effort),
	    { e: queryEmbedding}
	) as any;

	const matchedRelations = relationResults[0] || [];
	this.log(`Found ${matchedRelations.length} matching relations`);

	// Step 4: Expand graph from matched entities
	const graphData: any[] = [];

	for (const entity of matchedEntities) {
	    if (graphDepth > 0) {
		const neighborhood = await this.db.query(
		    templates.GET_ENTITY_ALL_RELATIONS,
		    { id: entity.id }
		);

		if (neighborhood?.[0]) {
		    graphData.push({
			entity: entity.id,
			distance: entity.distance,
			connections: neighborhood[0]
		    });
		}
	    }
	}

	const result = {
	    query: text,
	    entities: matchedEntities,
	    relations: matchedRelations,
	    graph: graphData
	};

	this.log(`Search complete`);
	debug.add('search_result', result);

	return result;
    }

    

    
}
