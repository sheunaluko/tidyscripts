
export var ethereum = {
    uniswap : {
	contracts : {
	    eth_usdc : "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8" 
	} 
    } 
} 

export var arbitrum = {
    uniswap : {
	contracts : {
	    eth_usdc : "0xC31E54c7a869B9FcBEcc14363CF510d1c41fa443"
	} 
    } 
}


export var fantom = {
    mainnet : {
	chain_id : 250 ,
	spookyswap : {
	    router : {
		address : "0xF491e7B69E4244ad4002BC14e878a34207E38c29" 
	    } , 
	    pools : {
		usdc_ftm : {address:  "0x2b4c76d0dc16be1c31d4c1dc53bf9b45987fc75c"}
	    } 
	}, 
	tokens : {
	    usdc : {
		contract_address : "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75" ,
		decimals : 6 ,
		name : "USDC Coin" ,
		symbol : "USDC" , 
	    } ,
	    wftm : {
		contract_address : "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83" ,
		decimals : 18  ,
		name : "Wrapped Fantom" ,
		symbol : "WFTM" ,
	    } 

	}
    } , 
} 
