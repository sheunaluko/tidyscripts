import { ethers } from 'ethers' ; 
import {get_logger}  from "../logger" ; 
import * as asnc from "../async"; 
import * as R from 'ramda';

const {
    formatEther ,
    parseEther,
    formatUnits,
    parseUnits 
}  = ethers.utils ; 

/*

  Extension of the ethers.Wallet class 

  - can automatically resend transactions with higher gasPrice until the transaction is mined 
  OR the number of tries is reached OR a max gasPrice is reached 
  - Supports EIP_1559 and legacy transactions for greater EVM coverage 
  - Supports eth transfers 
  - Supports token approvals 
  - Supports token swaps 


*/ 


const maxNumAsString = "115792089237316195423570985008687907853269984665640564039457584007913129639935" ;
const maxBigNum = ethers.BigNumber.from(maxNumAsString) ; 

type GasOps = {
    gasPrice : ethers.BigNumber,
    usdPrice : number, 
} 

export enum  MaxGasType {
    GasPrice,
    TxFee, 
} 

export type MaxGasOps = {
    type : MaxGasType ,
    value:  ethers.BigNumber , 
}

export interface BaseSmartSendOps {
    max_gas_ops : MaxGasOps , 
    timeout_ms : number ; 
    max_retries : number ; 
} 

export  interface SmartSendOps extends BaseSmartSendOps { 
    tx : ethers.UnsignedTransaction 
}

export function scale_big_num(n : ethers.BigNumber, ratio : number ) {
    let x_num = Math.ceil(ratio*Number(n.toString())) ;
    return ethers.BigNumber.from(String(x_num)) ;
} 

export enum TxStatus {
    Error,
    MaxRetriesReached,
    MaxGasReached ,
    GasVerified , 
    Success , 
}

export enum TxType {
    EIP_1559,
    LEGACY , 
}


export interface TokenApprovalOps {
    token_contract : ethers.Contract,
    allowee_addr : string,
    base_smart_send_ops : BaseSmartSendOps  , 
} 



export type SmartWalletOps = {
    privateKey : string,
    provider : ethers.providers.JsonRpcProvider , 
    tx_type : TxType , 
} 

export class SmartWallet extends ethers.Wallet {

    log : any ;
    params : SmartWalletOps ;
    id : any ; 
    
    constructor(ops : SmartWalletOps)  {

	let {privateKey, provider, tx_type} = ops ; 
	super(privateKey, provider) ;
	this.params = ops;
	
    }

    async init() {
	let {chainId} = await this.params.provider.ready ; 
	this.id = `${this.address.slice(1,6)}@${chainId}` ; 
	this.log = get_logger({id : this.id }) ;
    }

    async get_fee_data() {
	return await this.provider.getFeeData() ; 
    }
    
    async wrap_transactions_with_gas(txs : any[]) {
	let fee_data = await this.get_fee_data() ;
	let {maxFeePerGas,
	     maxPriorityFeePerGas,
	     gasPrice} = fee_data ;
	switch (this.params.tx_type) {
	    case TxType.EIP_1559 :
		txs.map(tx => Object.assign(tx, {maxFeePerGas}))
		return txs ; 
		break;
	    case TxType.LEGACY :
		txs.map(tx => Object.assign(tx, {gasPrice}))
		return txs ; 
		break; 
	} 
    }

    async get_gas_overrides() {
	let tx = {} ;
	return (await this.wrap_transactions_with_gas([tx]))[0] ;
    }

    multiply_transactions_gas_pricing(txs : any[],multiplier : number) {
	let scaler = ( (x:ethers.BigNumber)=>scale_big_num(x, multiplier) ) 
	switch (this.params.tx_type) {
	    case TxType.EIP_1559 :
		// @ts-ignore
		return txs.map( R.modifyPath(['maxFeePerGas'], scaler ))
	    case TxType.LEGACY :
		// @ts-ignore		
		return txs.map( R.modifyPath(['gasPrice'], scaler )) 
	}
    }

    async smart_eth_transfer(ops : { to: string,
				     amt : string,
				     max_gas_ops? : MaxGasOps , 
				     max_retries? : number,
				     timeout_ms? : number }) {

	var { to, amt, max_gas_ops, max_retries , timeout_ms } = ops ; 

	let default_gas_ops = { type : MaxGasType.TxFee ,
				value : parseEther("0.0001") }
										  
	max_gas_ops       = (max_gas_ops       || default_gas_ops ) ; 
	max_retries       = (max_retries       || 5 ) ;
	timeout_ms        = (timeout_ms        || 1000*30 )  ;

	let tx = await this.generate_l1_transfer_tx(to,amt)  ; 		    
	let smart_ops = {
	    tx, max_gas_ops , max_retries, timeout_ms 
	}
	return (await this.smartSendTransaction(smart_ops)) ; 
    }

    async generate_l1_transfer_tx(to : string, amt : string  ) {
	let tx = {
	    from : this.address , 
	    to ,
	    value : ethers.utils.parseEther(amt) ,
	    gasLimit : ethers.BigNumber.from("25000") , 
	}
	return (await this.wrap_transactions_with_gas([tx]))[0] ; 
    }


    async get_token_allowance(token_contract : ethers.Contract , allowee_addr : string ) {
	let allowance = await token_contract.allowance(this.address , allowee_addr) ; 
	return allowance 
    }

    async token_allowance_is_maxed(token_contract : ethers.Contract, allowee_addr : string) {
	let allowance = await this.get_token_allowance(token_contract, allowee_addr) ;
	return ( allowance.eq( maxBigNum) ) ; 
    }

    async generate_approve_token_tx(token_contract : ethers.Contract, allowee_addr : string) {
	var overrides = await this.get_gas_overrides() ; 
	overrides.gasLimit = ethers.utils.parseUnits("100000",'gwei') ; //set gasLimit 
	let gas_estimate = await token_contract.estimateGas.approve(allowee_addr, maxBigNum, overrides) ;
	//set the estimate as the new gasLimit 
	overrides.gasLimit = gas_estimate
	//populate the transaction 
	let tx = await token_contract.populateTransaction.approve(allowee_addr, maxBigNum , overrides) ;
	return tx 
    }
    

    async fully_approve_token(ops : TokenApprovalOps) {
	let {
	    token_contract, allowee_addr, base_smart_send_ops 
	} = ops ; 
	let tx = await this.generate_approve_token_tx(token_contract, allowee_addr) ;
	let smart_ops = Object.assign({tx}, base_smart_send_ops)
	return (await this.smartSendTransaction(smart_ops)) ;
    }
    

    max_fee_ops(value : ethers.BigNumber)  {
	return {
	    type : MaxGasType.TxFee ,
	    value
	}
    }

    max_price_ops(value : ethers.BigNumber) {
	return {
	    type : MaxGasType.GasPrice,
	    value  
	} 
    }


    default_smart_send_base(ethFee : number ) {
	let max_gas_ops = this.max_fee_ops( ethers.utils.parseEther(String(ethFee)))
	let max_retries = 4 ;
	let timeout_ms  = 45*1000 ;
	return {
	    max_gas_ops , max_retries, timeout_ms 
	} 
    } 
    
    async smartSendTransaction( ops : SmartSendOps ) { 
	
        let { 
            tx ,
	    max_gas_ops, 
	    max_retries ,
	    timeout_ms ,
        } = ops  ;

	var nonce = await this.getTransactionCount() ;
	let tx_log = get_logger({id : `${this.id}:${nonce}` }); 

	var tx_attempts : any = [] ;
	var tx_receipts : any = [] ; 
	
        tx_log("Processing SmartSend Tx Request::");
	tx_log(`Nonce is ${nonce}`)	
    	tx_log(tx) ;

	let overrides = await this.get_gas_overrides() ;
	overrides.nonce = nonce ; 

	for (var i=0 ; i < max_retries ; i ++ ) {
	    tx_log(`Attempt number: ${i+1}`) ;
	    tx_log('overrides:') ; tx_log(overrides) ;
	    Object.assign(tx, overrides) ; 
	    tx_log('tx:') ; tx_log(tx) ; 

	    try {

		//check transaction gas before even submitting 
		let info = await this.check_transaction_gas(tx,max_gas_ops)  ; 
		let {
		    tx_gas_info , 
		    status,
		    details
		}  = info ; 

		if (status != TxStatus.GasVerified) {
		    tx_log("Tx gas failed verification... aborting")
		    return {
			status ,
			tx_gas_info ,
			tx_attempts ,
			details, 
			ops 
		    } 
		} else { 
		    // set up for next iteration
		    tx_log("Tx gas check passed... will send following tx: (see gas info after tx)")
		    tx_log(tx)
		    tx_log(tx_gas_info) 
		}


		/* 
		   This is complex... there was a bug where the first transaction timed out, so a second transaction with the same nonce was sent with higher gas. But then the second 
		   transaction error with "nonce already used", since the first one had gotten mined already. But the first tx_receipt had already been "forgotten". 

		   So I upgraded the architecture to hold the array of transaction receipts, and to run promise.any on these after appending the new transaction receipt. Theoretically, in this above case, the second transaction would error but the promise.any would be ok and return the FIRST tx_receipt which would now have completed. Theoretically..  

		   The final step is to include this aggregate promise in a race with the timeout... 

		 */
		let tx_response = await this.sendTransaction(tx as any) ;
		let tx_receipt  = tx_response.wait() ;
		tx_attempts.push([tx_response, tx_receipt]) ;
		tx_receipts.push(tx_receipt); //keeps track of all transaction receipts
		// @ts-ignore 
		let receipts_promise = Promise.any(tx_receipts) ; //wait for ANY on of the transactions to be successful, or for ALL to fail... 
		let x : any = await Promise.race( [receipts_promise, asnc.wait(timeout_ms)] )  ;  //wait for one of the receipts, OR for the timeout
		
		// either a status.TIMEUT occurred OR the tx_receipt is returned 
		if (x == asnc.status.TIMEOUT ) {
		    //timeout occured
		    tx_log("Timeout occurred.. tx not yet mined or errored")
		    tx_log("Modifying gas params...")
		    let multiplier = (1 + (i+1)*0.1)  ;
		    tx_log("Multiplier=" + multiplier) ;

		    //request the new gas estimate and populate the overrides 
		    Object.assign(overrides, await this.get_gas_overrides())
		    
		    tx_log("Got gas estimation:")
		    tx_log(overrides) ;

		    //modify the old transaction
		    Object.assign(tx, overrides)

		    tx_log("Looping") ; 
		    
		}  else {
		    //there was no timeout -- so the transaction must have been mined and x is the transaction receipt
		    tx_log("Transaction mined successfully!")
		    //tx_log(x) ;
		    return {
			status : TxStatus.Success ,
			receipt : x ,
			tx_attempts ,
			ops , 
		    } 
		    
		} 

	    } catch (e) {
		//some kind of error happened.. the transaction may have been rejected, who knows.
		tx_log("Error occurred :(")
		tx_log(e) 
		return {
		    status : TxStatus.Error,
		    details : e ,
		    tx_attempts,
		    ops , 
		} 
	    }
	}

	//here we have reached the max number of retries
	return {
	    status : TxStatus.MaxRetriesReached ,
	    tx_attempts , 
	    ops,  
	}
    }

    get_gas_price_field() {
	switch( this.params.tx_type) {
	    case TxType.EIP_1559 :
		return 'maxFeePerGas'
	    case TxType.LEGACY :
		return 'gasPrice' 
	} 
    }
    
    calculate_transaction_gas(tx : any ) {
	let maxGasPrice = tx[this.get_gas_price_field()] ;
	let gasLimit    = tx.gasLimit ;
	let maxTxFee    = maxGasPrice.mul(gasLimit) ;
	return {
	    maxGasPrice,
	    gasLimit,
	    maxTxFee
	} 
    } 
    
    check_transaction_gas(tx : any , gas_ops : MaxGasOps ) {
	let tx_gas_info = this.calculate_transaction_gas(tx) ;
	let {
	    maxGasPrice,
	    gasLimit,
	    maxTxFee
	} =  tx_gas_info ; 

	var status ;
	var details ;

	switch ( gas_ops.type  ) {
	    case MaxGasType.TxFee :
		this.log("0"); 
		if ( maxTxFee.gt(gas_ops.value)  ) {
		    status = TxStatus.MaxGasReached ;
		    details = `MaxFee of ${formatEther(gas_ops.value)} was exceeded by planned fee of ${formatEther(maxTxFee)}`
		} else {
		    status = TxStatus.GasVerified
		    details = `MaxFee of ${formatEther(gas_ops.value)} was verified by planned fee of ${formatEther(maxTxFee)}`		    
		} 
		break 
	    case MaxGasType.GasPrice :
		if (maxGasPrice.gt(gas_ops.value) ) {
		    status  = TxStatus.MaxGasReached
		    details = `MaxGasPrice of ${formatUnits(gas_ops.value,'gwei')} (gwei) was exceeded by planned price of ${formatUnits(maxGasPrice,'gwei')} (gwei)`
		} else 	{
		    status = TxStatus.GasVerified
		    details = `MaxGasPrice of ${formatUnits(gas_ops.value,'gwei')} (gwei) was verified by planned price of ${formatUnits(maxGasPrice,'gwei')} (gwei)`		    
		}		 
		break
	    default :
		status = TxStatus.Error
		details = "Unkown MaxGasType"
		break 
	}

	let to_ret =  {
	    tx_gas_info, 
	    status,
	    details, 
	}

	this.log(details) ;
	
	return to_ret ; 
    }


    async balanceAsNumber() {
	return Number(formatEther(await this.getBalance()))
    } 
    
}



// ---
// Providers 
// -- 

export enum ProviderType {
    Ethereum,
    Fantom ,
    Arbitrum,
    Polygon,
}

export function get_provider(p : ProviderType) {
    switch (p) {
	case ProviderType.Ethereum :
	    return new ethers.providers.InfuraProvider( 'mainnet', process.env['ETHER_INFURA_PROJECT_ID'] ) ;
	    break
	case ProviderType.Fantom :
	    //return new ethers.providers.JsonRpcProvider("https://rpc.ftm.tools/") ;
	    return new ethers.providers.JsonRpcProvider("https://rpcapi.fantom.network/") ; 	    
	    break 
	case ProviderType.Arbitrum :
	    return new ethers.providers.InfuraProvider( 'mainnet', process.env['ARBITRUM_INFURA_PROJECT_ID'] ) ; 
	    break
	case ProviderType.Polygon :
	    return new ethers.providers.JsonRpcProvider('https://polygon-rpc.com') ; 
	    break
    } 
}

export function fantom_provider() { return get_provider(ProviderType.Fantom) }
export function ethereum_provider() { return get_provider(ProviderType.Ethereum) }
export function arbitrum_provider() { return get_provider(ProviderType.Arbitrum) }
export function polygon_provider() { return get_provider(ProviderType.Polygon) } 
