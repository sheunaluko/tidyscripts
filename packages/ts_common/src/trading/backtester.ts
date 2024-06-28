
/* 
   File for running backtests usings a portfolio balancer 
*/

import * as pbl from "./portfolio_balancer_lib"  ;


export type Portfolio = {
    base_balance : number,
    quote_balance : number,
    value? : number,
    t?     : string,
    p?     : number, 
} 

export type BacktestData  = {t:string , p : number}[]

    
export interface BacktestBalancerParams extends  pbl.BalanceParams {
    data : BacktestData ,
    initial_portfolio : Portfolio ,
    slippage : number,
    fee : number, 

} 

/**
 * Class for running a backtest. See below for usage example. 
 * @example 
 * ```
 * // 1. First create the backtester options 
 * let ops = { 
 *    base_asset : "ETH",
 *    quote_asset : "BUSD",
 *    data : [ {p :1450 , t : "ISO_DATE" }...], 
 *    initial_portfolio : { 
 *      base_balance : 20 , 
 *      quote_balance : 0 , 
 *    } , 
 *   logger_id : "ETHUSDC" , 
 *   fee : 0.001 , 
 *   slippage : 0.01,
 *   target_precision  : 0.05,
 *   target_ratio : 0.6,
 * } 
 * 
 * // 2. Then create the backtester 
 * let backtester = new BacktestBalancer(ops) ;
 * 
 * // 3. Then run the backtest 
 * await backtester.backtest() ; 
 * 
 * // 4. Then extract the backtest metrics and use them in a graph, analysis, etc... 
 * let  {
 *  hodl_porfolio_series, 
 *  balance_portfolio_series, 
 *  rebalances 
 * } = backtester  ; 
 * ```
 * 
 */
export class BacktestBalancer extends pbl.PortfolioBalancer {
    
    data : BacktestData ; 
    current_index : number  ;
    rebalances : any[] ; 
    portfolio : Portfolio ; 
    initial_portfolio  : Portfolio ;
    balance_portfolio_series : Portfolio[] ;
    hodl_portfolio_series :    Portfolio[] ;     
    ratio_series: number[] ;
    slippage : number ;
    fee : number ;
    transactions_costs : any ; 


    constructor(p : BacktestBalancerParams) {
	super(p);
	this.data = p.data ; 
	this.current_index = -1 ;
	this.portfolio = Object.assign( {} , p.initial_portfolio );
	this.initial_portfolio = Object.assign( {} , p.initial_portfolio ) ; 
	this.rebalances = [] ;
	this.slippage = p.slippage;
	this.fee = p.fee;
	this.transactions_costs = {
	    fees : {
		base : 0 ,
		quote : 0 ,
	    } ,
	    slippage : {
		base : 0,
		quote : 0 , 
	    } 
	}
	
	this.balance_portfolio_series  = [] ;
	this.hodl_portfolio_series  = [] ;
	this.ratio_series = [] ; 
    }

    async get_quote_balance(qa:string)  {
	return this.portfolio.quote_balance  ; 
    } 
    async get_base_balance(ba:string)  {
	return this.portfolio.base_balance ; 
    } 
    async get_base_price(ba:string,qa:string) {
	return (this.data[this.current_index]).p
    }
    async do_market_trade(trade_type : pbl.MarketTradeType, base_amt : number) {
	/* 
	   The following assumptions are made: 
	   1) A fee of this.fee is incurred and manifested as a reduction in the amount of the 
	   purchased asset by this.fee. For example, if 1 ETH is market bought, only 0.999 ETH 
	   will be credited (assuming this.fee = 0.001) 

	   2) A slippage of this.slippage is incurred with each trade. Assume that X units of 
	   base asset are being bought. This means Y units of quote asset should be  consumed.
	   Slippage manifests as Y*(1+this.slippage) being consumed for the trade. 
	   This is actually slightly different depending on market sell or buy - so I will need
	   to look more into this and adjust the code. 

	   3) The price at which the trade occurs is given by the 'p' field in the data object. 
	*/


	//first a sanity check 
	let base_price = await this.get_base_price("","") ;
	let current_data = this.data[this.current_index]  ;
	if (base_price != current_data.p) {
	    this.log("Sanity check failed! - there is a problem with price indexing") ;
	    process.exit(1) ; 
	}

	//then the trade mechanics --> 
	let { p , t  } = current_data ; 
	var new_base : number ;
	var new_quote : number ;
	//- 
	switch (trade_type ) {
	    case pbl.MarketTradeType.BUY :
		//market BUY the base token
		new_base = base_amt*(1-this.fee) ;
		new_quote = -(base_amt*p)*(1+this.slippage)
		//update the transactions cost object
		this.transactions_costs.fees.base += base_amt*this.fee
		this.transactions_costs.slippage.quote += (base_amt*p)*(this.slippage)
		
		break
	    case pbl.MarketTradeType.SELL :
		//market SELL the base token		
		new_base = -base_amt ; 
		new_quote = (base_amt*p)*(1-this.fee)*(1-this.slippage)
		//update the transactions cost object
		this.transactions_costs.fees.quote += (base_amt*p)*(this.fee)
		this.transactions_costs.slippage.quote += (base_amt*p)*(this.slippage)		
		break
	}
	//- 
	let new_base_amt  = this.portfolio.base_balance  += new_base  ; 
	let new_quote_amt = this.portfolio.quote_balance += new_quote ; 

	//first we update the portfolio object
	this.portfolio = {
	    base_balance : new_base_amt ,
	    quote_balance : new_quote_amt 
	}

	//now we update the rebalances array 
	this.rebalances.push({
	    index : this.current_index ,
	    p, t, 
	    trade_type ,
	    base_amt ,
	    quote_amt : (base_amt*p ),
	    portfolio  : this.get_portfolio_value_and_time(this.portfolio, p, t ),  //note we updated the portfolio before this step  
	    hodl_portfolio : this.get_portfolio_value_and_time(this.initial_portfolio, p,t),
	    cummulative_transactions_costs : {
		raw : Object.assign({}, this.transactions_costs ) , //keep track of transactions costs up until this time
		values : this.get_transactions_costs_values(this.transactions_costs,p)
	    } ,
	})


	return { error : false, info : null } 
	//fin 
	
    }
    
    symbol_generator(ba:string, qa :string) { return "BACKTESTER"  } 

    async process_data() {
	this.current_index += 1 ;
	await this.balance_portfolio()
	/*
	  pretty elegant, huh?
	  A portfolio balance may or may not have happened. 
	  Either way, for post-analysis we will keep track of the portfolio series overtime 
	*/
	let { p,t } = this.data[this.current_index] ;
	this.hodl_portfolio_series.push(this.get_portfolio_value_and_time(this.initial_portfolio, p,t)) 
	this.balance_portfolio_series.push(this.get_portfolio_value_and_time(this.portfolio, p,t ))
	this.ratio_series.push(this.Params.target_ratio) ; 
    }

    get_portfolio_value_and_time(portfolio: Portfolio, p : number, t : string) {
	let value = portfolio.base_balance*p + portfolio.quote_balance
	return { 
	    base_balance : portfolio.base_balance ,
	    quote_balance : portfolio.quote_balance,
	    value ,
	    p,
	    t
	} 
    }

    get_transactions_costs_values(tc : any , p : number ) {
	let {fees, slippage } = tc ;
	let fee_cost = fees.base*p + fees.quote ;
	let slippage_cost = slippage.base*p + slippage.quote ;
	let total = fee_cost + slippage_cost ;
	return {
	    fee_cost,
	    slippage_cost,
	    total 
	} 
    } 

   
    async backtest() {
	this.log("Starting backtest...")
	let len  = this.data.length  ; 
	for (var x = 0; x < len; x ++) {
	    await this.process_data()
	    if ( (x % 100) == 0 ) { this.log(`Progress = ${x}/${len}`)  } 
	}
	this.log("Done") 
    } 

} 
