/**
 * API to query evm-based account (public key) information 
 * Uses consensys.net codefi api 
 * 
 * @packageDocumentation
 */





/**
 * Returns account info for an evm based account, running on the blockchain network with the provided chain_id. 
 * Uses the consensys.net codefi api to retrieve the data. 
 * @param account - Public key of the account to query 
 * @param chain_id  n
 * @returns 
 */
export async function get_account_info(account : string, chain_id :number){
    let url = `https://account.metafi.codefi.network/accounts/${account}?chainId=${chain_id}&includePrices=true`
    let res =  await fetch(url);
    console.log(url) 
    //@ts-ignore
    global.res = res  ; 
    return await res.json() ; 
}
