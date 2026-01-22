

type resolver = any
type rejector = any
type promiseEntry = [resolver,rejector]

import * as logger from '../../logger'

export class Channel {

    value_que : any[]  ;
    promise_que : promiseEntry[] ;
    log : any ;
    name : string;
    forwarding_to : Channel[] ;
    receiving_from : Channel[] ;

    constructor(ops : any) {

	let {name } = ops

	this.forwarding_to = [] ;
	this.receiving_from = [] ;
	this.value_que = []
	this.promise_que = []
	this.name = name;
	this.log = logger.get_logger({'id' : `ch:${name}`})

    }


    read() : Promise<any> {

	if (this.value_que.length > 0 ) {

	    let value_que = this.value_que
	    let p = new Promise((resolve,rej)=> {
		setTimeout( ()=> resolve(value_que.shift())  , 0 ) //immediately resolve
	    })

	    return p

	} else {

	    //have to create a new promise
	    let p = new Promise((resolve,reject) => {
		this.promise_que.push([resolve,reject])  //but save the resolver
	    })

	    return p  //return the promise
	}

    }

    connect(forwarding_to  : Channel ) {
	/* need to finish this implementation */
	this.log(`Connecting to channel: ${forwarding_to.name}`);
	this.forwarding_to.push(forwarding_to) ;
	forwarding_to.receiving_from.push(this)  ;

    }

    write(data : any)  : void {

	if (this.promise_que.length > 0 ) {
	    //there is already a promise awaiting this result
	    let [resolve,reject] = (this.promise_que.shift()  as promiseEntry )
	    resolve(data)

	} else {
	    //no promise is waiting -- so we will instead push to the que
	    this.value_que.push(data)
	}

    }

    flush() : void {
	/*
	   need to finish this implementation
	   Technically this should not just send nulls but should clear the queue , etc..

	 */
	//will clear the channel queue by sending nulls


	//any values that have been written will be forgotten
	this.value_que = []

	//any promises that are waiting will get nulls
	for (var i =0 ; i < this.promise_que.length ; i ++ ){
	    let [resolve,reject] = (this.promise_que.shift() as promiseEntry )
	    resolve(null)
	}

	this.log("Flushed channel")
    }

    async log_data() {

	this.log("Chan read loop initiated")

	while (true ) {
	    let val = await this.read()
	    this.log("Got value:")
	    this.log(val)
	}
    }



}
