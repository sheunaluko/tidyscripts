import {ethers} from "ethers" ;
import * as pbl from "../trading/portfolio_balancer_lib" ; 
import * as UNISWAP from "@uniswap/sdk" ; 
import * as abis from  "./abis/index" ;
import {toEth} from "./utils" 
import {SmartWallet,
	BaseSmartSendOps,
	TxStatus, 
	TxType} from "./smart_wallet" ; 


export type GasOps = {
    low : ethers.BigNumber,
    medium : ethers.BigNumber,
    high : ethers.BigNumber ,
    usd_price : number, 
} 

export type GasEstimator = () => Promise<GasOps | null> ;

export interface EVMParams extends pbl.BalanceParams {
    smartWallet : SmartWallet  , 
}


/**
 * Creates an EVM balancer object 
 */
export abstract class EVMBalancer extends pbl.PortfolioBalancer {
    wallet : SmartWallet  ;
    
    constructor(params : EVMParams ) {
	super(params) ; 
	this.wallet = params.smartWallet ;  
    }
}

export type Token = {
    contract_address : string,
    decimals : number ,
    symbol : string,
    name : string, 

}  ;

export interface BaseAMMParams {
    router_address : string,
    pool_address : string, 
    chain_id : number,
    token0? : Token , 
    token1? : Token ,
    token0_is_base_asset : boolean ,
    max_slippage_percent : number  , 
}

export interface AMMParams extends EVMParams, BaseAMMParams  {} 

type TokensInfo = {
    base_token : UNISWAP.Token | null ,
    quote_token : UNISWAP.Token | null ,
    base_token_contract : ethers.Contract | null ,
    quote_token_contract : ethers.Contract | null ,
    base_token_decimals : number | null ,
    quote_token_decimals : number | null , 
}

export class UniV2Balancer extends EVMBalancer {

    /* 
       --- 
    */

    params : AMMParams ;
    routerContract : ethers.Contract | null ;
    poolContract : ethers.Contract | null  ;    
    token0 : UNISWAP.Token | null ;
    token1 : UNISWAP.Token | null ;
    token0Contract : ethers.Contract | null ;
    token1Contract : ethers.Contract | null ;
    tokens : TokensInfo | null ;
    gasLimitMultiple : number  ; 
    
    
    constructor(ammParams : AMMParams) {
	super(ammParams) ;
	this.params = ammParams ;
	this.routerContract = null;
	this.poolContract = null;
	this.token0 = null;
	this.token1 = null;
	this.token0Contract = null;
	this.token1Contract = null;
	this.tokens = null ;
	this.gasLimitMultiple = 1.2; 
    }

    async init() {

	this.log("Initializing")
	let { router_address,
	      pool_address,
	      chain_id,
	      token0 ,
	      token1 ,
	      token0_is_base_asset, 	      
	} = this.params ;
	let v2abi = abis.uni_v2 ;

	this.routerContract = new ethers.Contract(router_address,v2abi.router , this.wallet) ;
	this.poolContract = new ethers.Contract(pool_address, v2abi.pool , this.wallet) ;	
	/* 
	   Create the token objects if they exist 
	*/
	if (token0) {
	    let { contract_address, decimals, symbol, name } = token0 ; 
	    this.token0 = new UNISWAP.Token( chain_id, contract_address, decimals, symbol, name)
	    this.token0Contract = new ethers.Contract( contract_address, abis.erc20, this.wallet)	    
	} else {
	    this.token0 = null;
	    this.token0Contract = null;	    
	} 
	//  -- 
	if (token1) {
	    let { contract_address, decimals, symbol, name } = token1 ; 
	    this.token1 = new UNISWAP.Token( chain_id, contract_address, decimals, symbol, name)
	    this.token1Contract = new ethers.Contract( contract_address, abis.erc20, this.wallet)	    	    
	} else {
	    this.token1 = null;
	    this.token1Contract = null;	    	    
	}

	this.tokens = {
	    base_token : ( token0_is_base_asset ? this.token0 : this.token1 ) ,
	    quote_token : ( token0_is_base_asset ? this.token1 : this.token0 ) ,
	    base_token_contract : ( token0_is_base_asset ? this.token0Contract : this.token1Contract ) ,
	    quote_token_contract : ( token0_is_base_asset ? this.token1Contract : this.token0Contract ) ,
	    base_token_decimals : ( token0_is_base_asset ? (this.token0 as UNISWAP.Token).decimals : (this.token1 as UNISWAP.Token).decimals ) ,
	    quote_token_decimals : ( token0_is_base_asset ? (this.token1 as UNISWAP.Token).decimals : (this.token0 as UNISWAP.Token).decimals ) , 	    

	} 
	
	this.log("Initialization complete") 
	
    } 
    
    /*
         - The below functions use the provided
	    - this.token0Contract 
            - this.token1Contract 
	    - this.routerContract 
            - this.poolContract 
	 - Which are all connected to the wallet and the provider. 

	 //Helpful resources: 
	 //(1) ref https://github.com/BlockchainWithLeif/PancakeswapBot/blob/main/newbot.js
	 //(2) https://www.quicknode.com/guides/defi/how-to-swap-tokens-on-uniswap-with-ethers-js
	 
    */

    async get_base_balance(ba:string) : Promise<number> {
	let tokens = (this.tokens as TokensInfo) ;
	let base_token  = (tokens.base_token as UNISWAP.Token) ; 
	let quote_token = (tokens.quote_token as UNISWAP.Token) ; 
	let tmp =  (await ( tokens.base_token_contract as ethers.Contract).balanceOf(this.wallet.address)) ;
	let decimals = base_token.decimals ; 	
	return Number(ethers.utils.formatUnits( tmp.toString() , decimals )) ; 
    }

    async get_quote_balance(qa:string) : Promise<number> {
	let tokens = (this.tokens as TokensInfo) ;
	let base_token  = (tokens.base_token as UNISWAP.Token) ; 
	let quote_token = (tokens.quote_token as UNISWAP.Token) ; 
	let tmp =  (await ( tokens.quote_token_contract as ethers.Contract).balanceOf(this.wallet.address)) ;
	let decimals = quote_token.decimals ; 
	return Number(ethers.utils.formatUnits( tmp.toString() ,  decimals ) ) 
    }
    
    async get_base_price(ba:string,qa:string)  : Promise<number> {
	let { base_reserves, quote_reserves}  = await this.get_pool_reserves() ; 
	return quote_reserves/base_reserves ; 
    }


    /* 
       Generates a swap transaction, as well as info about slippage, etc. Does not send the transaction!
    */ 
    async generate_swap_transaction( base_or_quote : string , amt : number) {

	this.log(`Generating transaction that will consume ${amt} ${base_or_quote} tokens`)

	var output_info : any ;
	var _amt : any ; 
	let tokens = (this.tokens as TokensInfo) ;
	let base_token  = (tokens.base_token as UNISWAP.Token) ; 
	let quote_token = (tokens.quote_token as UNISWAP.Token) ; 

	if ( base_or_quote == "BASE") {
	    _amt = Number(amt.toFixed(base_token.decimals))
	    this.log(`Converted ${amt} to ${_amt} for base input`)
	    output_info = await this.estimate_quote_out(_amt) 
	} else {
	    _amt = Number(amt.toFixed(quote_token.decimals))
	    this.log(`Converted ${amt} to ${_amt} for quote input`)	    	    
	    output_info = await this.estimate_base_out(_amt) ;	    
	} 

	let {
	    amounts,
	    amountOutNoSlip,
	    amountIn,
	    amountOut,
	    slippageRatio,
	    slippagePercent,
	    path ,
	    max_slippage_percent ,
	    minAmountOutNum ,
	    minAmountOut, 
	} = output_info ;

	this.log(output_info)

	let overrides = await this.wallet.get_gas_overrides()  ;
	overrides.gasLimit = ethers.BigNumber.from("200000")

	this.log("Estimating gas")
	let gas_estimate = await (this.routerContract as ethers.Contract)
	    .estimateGas
	    .swapExactTokensForTokens(amountIn, minAmountOut, path, this.wallet.address , (Date.now() + 1000 * 60*10) , overrides  ) ;

	this.log("Gas estimate=")
	this.log(gas_estimate) 

	// and then incorporate gas estimate into the beloow transaction
	// by update overrides.gasLimit
	overrides.gasLimit = gas_estimate 
	
	let tx = await (this.routerContract as ethers.Contract)
	    .populateTransaction
	    .swapExactTokensForTokens(amountIn, minAmountOut, path, this.wallet.address , (Date.now() + 1000 * 60*10) , overrides  ) ;
	
	return {tx , output_info,  gas_estimate}
    }

    async do_swap(base_or_quote : string, amt : number , base_smart_send_ops : BaseSmartSendOps ) {
	let {tx,output_info} = await this.generate_swap_transaction(base_or_quote, amt)  ;
	let  {slippagePercent, max_slippage_percent}  = output_info ; 
	if (slippagePercent > max_slippage_percent) {
	    //abort
	    this.log("Aborting swap due to high slippage")
	    this.log(output_info)
	    return { success : false  } 
	} else {
	    //can proceed with the swap
	    this.log("Proceeding with swap") 
	    let ops = Object.assign({tx}, base_smart_send_ops)
	    return ( await this.wallet.smartSendTransaction(ops)) 
	} 
    } 
    

    // --- 
    
    async base_token_approved() {
	let tokens = (this.tokens as TokensInfo)
	let token_contract = (tokens.base_token_contract as ethers.Contract)
	let router_address = (this.routerContract as ethers.Contract).address ; 
	return ( await this.wallet.token_allowance_is_maxed( token_contract , router_address ) )
    } 

    async quote_token_approved() {
	let tokens = (this.tokens as TokensInfo)
	let token_contract = (tokens.quote_token_contract as ethers.Contract)
	let router_address = (this.routerContract as ethers.Contract).address ; 
	return ( await this.wallet.token_allowance_is_maxed( token_contract , router_address ) )
    }

    async approve_token(token_contract : ethers.Contract, base_smart_send_ops  : BaseSmartSendOps) {
	let router_address = (this.routerContract as ethers.Contract).address ;
	// approve the token
	let ops = { 
	    token_contract , 
	    allowee_addr   : router_address ,
	    base_smart_send_ops 
	}

	return (await this.wallet.fully_approve_token(ops))
    } 

    async approve_quote_token( base_smart_send_ops  : BaseSmartSendOps) {
	let tokens = (this.tokens as TokensInfo)
	let token_contract = (tokens.quote_token_contract as ethers.Contract)
	return (await this.approve_token(token_contract, base_smart_send_ops ))
    } 

    async approve_base_token( base_smart_send_ops  : BaseSmartSendOps) {
	let tokens = (this.tokens as TokensInfo)
	let token_contract = (tokens.base_token_contract as ethers.Contract)
	return (await this.approve_token(token_contract, base_smart_send_ops ))
    } 
    
    async prepare_tokens(base_smart_send_ops : BaseSmartSendOps) {
	this.log("Checking tokens")

	if (! base_smart_send_ops ) { this.log("No gas args provided!") ; return null } 

	var base_result : any; var quote_result : any ; 
	
	if (! (await this.base_token_approved()) ) {
	    this.log("Base token not approved...") 
	    base_result  = await this.approve_base_token(base_smart_send_ops) ; 
	} else  {
	    this.log("Base token already approved...") 	    
	    base_result = { status : TxStatus.Success }
	} 
	
	if (! (await this.quote_token_approved()) ) {
	    this.log("Quote token not approved...") 
	    quote_result  = await this.approve_quote_token(base_smart_send_ops) ; 
	} else {
	    this.log("Quote token already approved...") 	    	    
	    quote_result = { status : TxStatus.Success }	    
	} 

	if ((base_result.status == TxStatus.Success) &&
	    (quote_result.status == TxStatus.Success) ) {
	    this.log("Both token approvals succeeded!")
	    return {success : true }  
	} else {
	    this.log("Unfortunately there was an error with the token approvals")
	    return {success : false, data : {base_result, quote_result }} 
	} 
	
    } 


    // --- 


    async get_base_tx_ops() {
	let wallet = (this.wallet as ethers.Wallet) ;
	let addr = (wallet.address as string) ;
	let overrides = await this.wallet.get_gas_overrides() 

	let {
	    base_token,
	    quote_token,
	    base_token_contract,
	    quote_token_contract
	} = (this.tokens as TokensInfo) ;
	
	return {
	    wallet,
	    addr,
	    from : addr, 
	    overrides ,
	    base_token : base_token as UNISWAP.Token,
	    quote_token : quote_token as UNISWAP.Token,
	    base_token_contract : base_token_contract as ethers.Contract,
	    quote_token_contract : quote_token_contract as ethers.Contract,
	    router_contract : this.routerContract as ethers.Contract,
	    
	} 
    } 
    
    get_tx_gas_info(tx : any , usd_price : number ) {
	let {gasPrice, gasLimit } = tx ;
	let max_total_gas = Number( ethers.utils.formatEther(gasPrice.mul(gasLimit)))  ;
	let l1_price_usd = usd_price ; 
	let max_total_gas_usd = max_total_gas*l1_price_usd ; 
	return {
	    max_total_gas ,
	    max_total_gas_usd,
	    l1_price_usd ,
	    gasPrice, gasLimit, 
	} 
    } 

    async estimate_quote_out(amt : number) {
	let tokens = this.tokens as TokensInfo ;
	let base_token = tokens.base_token as UNISWAP.Token; 
	let quote_token = tokens.quote_token as UNISWAP.Token ;


	var {
	    base_amt,quote_amt,base_price,portfolio_value,
	    current_ratio, ratio_error, target_achieved,
	    target_base_amt, base_delta , trade_type , base_market_amt  
	} = (await this.get_balance_data() ); 


	let amountIn = ethers.utils.parseUnits(String(amt), base_token.decimals);
	let path = [base_token.address,quote_token.address]  ;	
	let amountOutNoSlip = amt*base_price ;


	//this.log(amountIn) ; 
	let amounts = await (this.routerContract as ethers.Contract).getAmountsOut(amountIn, path);
	let amountOut = Number(ethers.utils.formatUnits(amounts[1],quote_token.decimals))

	let slippageRatio = (amountOutNoSlip-amountOut)/amountOutNoSlip ;
	let slippagePercent = slippageRatio*100 ;
	let {max_slippage_percent} = this.params ; 
	let minAmountOutNum = (amountOutNoSlip*(1-max_slippage_percent/100) ).toFixed(quote_token.decimals);
	//console.log(minAmountOutNum) ; 

	let minAmountOut = ethers.utils.parseUnits(String(minAmountOutNum), quote_token.decimals);	    
	
	return {
	    amounts,
	    amountOutNoSlip,
	    amountIn, 
	    amountOut,
	    slippageRatio,
	    slippagePercent,
	    max_slippage_percent,
	    minAmountOutNum,
	    minAmountOut, 
	    path 
	} 

    }

    async estimate_base_out(amt : number) {
	let tokens = this.tokens as TokensInfo ;
	let base_token = tokens.base_token as UNISWAP.Token; 
	let quote_token = tokens.quote_token as UNISWAP.Token ;

	var {
	    base_amt,quote_amt,base_price,portfolio_value,
	    current_ratio, ratio_error, target_achieved,
	    target_base_amt, base_delta , trade_type , base_market_amt  
	} = (await this.get_balance_data() ); 
	

	let amountIn = ethers.utils.parseUnits(String(amt), quote_token.decimals);
	let path = [quote_token.address,base_token.address]  ;	
	let amountOutNoSlip = amt/base_price ;


	//this.log(amountIn) ; 
	let amounts = await (this.routerContract as ethers.Contract).getAmountsOut(amountIn, path);
	let amountOut = Number(ethers.utils.formatUnits(amounts[1],base_token.decimals))

	let slippageRatio = (amountOutNoSlip-amountOut)/amountOutNoSlip ;
	let slippagePercent = slippageRatio*100 ;
	let {max_slippage_percent} = this.params ; 
	let minAmountOutNum = (amountOutNoSlip*(1-max_slippage_percent/100) ).toFixed(base_token.decimals);
	//console.log(minAmountOutNum) ; 

	let minAmountOut = ethers.utils.parseUnits(String(minAmountOutNum), base_token.decimals);	    
	
	return {
	    amounts,
	    amountOutNoSlip,
	    amountIn, 
	    amountOut,
	    slippageRatio,
	    slippagePercent,
	    max_slippage_percent,
	    minAmountOutNum,
	    minAmountOut, 
	    path 
	} 

    }     
    
    
    async get_pool_reserves() {
	let tokens = (this.tokens as TokensInfo) ;
	var tmp = await (this.poolContract as ethers.Contract).getReserves() ;	
	let token0reserves = toEth(tmp[0] , (this.token0 as UNISWAP.Token).decimals )
	let token1reserves = toEth(tmp[1] , (this.token1 as UNISWAP.Token).decimals )
	let base_reserves  = (this.params.token0_is_base_asset ? token0reserves : token1reserves)
	let quote_reserves  = (this.params.token0_is_base_asset ?  token1reserves : token0reserves)
	return {
	    token0reserves,
	    token1reserves,
	    base_reserves,
	    quote_reserves, 
	} 
	   
    } 
    
    async do_market_trade(trade_type : pbl.MarketTradeType, base_amt : number) : Promise<pbl.MarketResult> {
	var result : any ;

	
	switch (trade_type ) {
	    case pbl.MarketTradeType.BUY :
		result = await this.do_swap("QUOTE" , base_amt  ,  this.wallet.default_smart_send_base(0.05))
		break
	    case pbl.MarketTradeType.SELL :
		result = await this.do_swap("BASE" , base_amt  ,  this.wallet.default_smart_send_base(0.05))		    
		break
	}

	if (result.status == TxStatus.Success) {
	    return {error:false, info : result } 
	} else {
	    return {error : true, info : result } 
	} 
    }
    
    
    symbol_generator(ba : string , qa : string )  : string {
	return `${ba}/${qa}`
    } 
    
} 
