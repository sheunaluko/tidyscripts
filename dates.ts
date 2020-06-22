//working with dates

import * as butil from "./base_util.ts"

let log = butil.Logger("dates") 

export function to_ms(d : Date) { return Number(d) }

export function dates_eq(d1 : Date , d2 : Date ) {
    return (d1.getTime() == d2.getTime()) 
} 

export function copy_date(d:Date) { return new Date(d.getTime()) } 

export function round_date(in_date : Date , t : string ) : Date {

    let d = copy_date(in_date) // dont modify it
    
    switch (t) {

        case 'year'  :
	    d.setMonth(0) 
	    
	case 'month' :
	    d.setDate(1) 

	case 'day' :
	    d.setHours(0) 

	case 'hour' :
	    d.setMinutes(0) 

	case 'minute' :
	    d.setSeconds(0) 
	    
	case 'second' :
	    d.setMilliseconds(0) 

	case 'millisecond' :
	    //no need 
	    break;
	    
	default  :
	    return d 
    }

    return d 
} 


export function shift_date(in_date : Date , amt : number, t : string ) : Date {

    let d = copy_date(in_date)
    
    switch (t) {

        case 'year'  :
	    d.setFullYear(d.getFullYear() + amt )
	    break 
	    
	case 'month' :
	    d.setMonth(d.getMonth() + amt )
	    break 

	case 'day' :
	    d.setDate(d.getDate() + amt )
	    break 

	case 'hour' :
	    d.setHours(d.getHours() + amt )
	    break 

	case 'minute' :
	    d.setMinutes(d.getMinutes() + amt )
	    break 

	case 'second' :
	    d.setSeconds(d.getSeconds() + amt )
	    break 

	case 'millisecond' :
	    d.setMilliseconds(d.getMilliseconds() + amt ) 
	    break 
	    
	default  :
	    return d 
    }

    return d 
} 



// tests for this dates module
// new Date(year, monthIndex [, day [, hours [, minutes [, seconds [, milliseconds]]]]])


export interface DateCreationOps {
    [k:string] : number, 
    year :number,
    month:number,
    day:number,
    hour :number,
    minute: number,
    second:number,
    millisecond:number 
} 

function date_defaults() : DateCreationOps {
    return {year: 2020,
	    month:6,
	    day:6,
	    hour:12,
	    minute:30,
	    second:30,
	    millisecond:500} 
}

function make_test_date(ops? : DateCreationOps) {
    let info = ops || date_defaults() ; 
    let {year,
	 month,
	 day,
	 hour,
	 minute,
	 second,
	 millisecond} = info;
    return new Date(year,month,day,hour,minute,second,millisecond) 
}


var date_options = ["year","month","day","hour","minute","second","millisecond"] ;


function check_date_shifts_with_num(shift_num : number) : boolean[]{
    var dte = make_test_date() ;
    var results : boolean[]  = [] ; 
    for (var op of date_options) {
	var new_dte_guess = shift_date(dte,shift_num,op)
	var calc_ops = date_defaults();
	calc_ops[op] = (calc_ops[op] + shift_num );
	var new_dte_calc = make_test_date(calc_ops);

	var are_equal = dates_eq(new_dte_guess,new_dte_calc)

	if (false) { 
	    log(calc_ops)
	    log(op)
	    log(new_dte_guess)
	    log(new_dte_calc)
	    log("--")
	} 
	results.push(are_equal) 
    }

    return results 

} 

Deno.test({
  name: "date shift forward",
    fn() {
	let results = check_date_shifts_with_num(2) 
	butil.assertEquals([true,true,true,true,true,true,true],results) ; 

  },
});

Deno.test({
  name: "date shift backward",
    fn() {
	let results = check_date_shifts_with_num(-3) 
	butil.assertEquals([true,true,true,true,true,true,true],results) ; 
  },
});

Deno.test({
    name : "round date" ,
    fn () {
	let tests : [string,Date,Date][] = [
	    ["year"        ,  new Date(2020,1,23,1,1,1,1) , new Date(2020,0) ] ,
	    ["month"       ,  new Date(2020,1,23,1,1,1,1) , new Date(2020,1) ] ,
	    ["day"         ,  new Date(2020,1,23,1,1,1,1) , new Date(2020,1,23) ] ,
	    ["hour"        ,  new Date(2020,1,23,1,1,1,1) , new Date(2020,1,23,1) ] ,
	    ["minute"      ,  new Date(2020,1,23,1,1,1,1) , new Date(2020,1,23,1,1) ] ,
	    ["second"      ,  new Date(2020,1,23,1,1,1,1) , new Date(2020,1,23,1,1,1) ] ,
	    ["millisecond" ,  new Date(2020,1,23,1,1,1,1) , new Date(2020,1,23,1,1,1,1) ] ,
	]

	let results = tests.map( ([op,d1,d2]) => {
	    var rounded = round_date(d1,op)
	    //log(rounded) ; log(d2) 
	    return dates_eq(rounded,d2)
	})
	
	//log(results) 
	butil.assertEquals(butil.repeat(true,7),results) 
    } 
})
