
// tests for the dates module in common 
// new Date(year, monthIndex [, day [, hours [, minutes [, seconds [, milliseconds]]]]])

import * as util from "../util"  

let log = util.common.Logger("date-test") 

var {shift_date, 
     round_date, 
     dates_eq} = util.common.Date  ; 




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
	util.assertEquals([true,true,true,true,true,true,true],results) ; 

  },
});

Deno.test({
  name: "date shift backward",
    fn() {
	let results = check_date_shifts_with_num(-3) 
	util.assertEquals([true,true,true,true,true,true,true],results) ; 
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
	util.assertEquals(util.common.fp.repeat(true,7),results) 
    } 
})
