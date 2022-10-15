import {ethers} from "ethers" ;


export function toEth(bigNum:any,decimals : number) {
    return Number(ethers.utils.formatUnits(bigNum.toString(), decimals))
} 

    
export function BNtoGwei(bigNum:any) {
    return Number(ethers.utils.formatUnits(bigNum,'gwei'))
}


export function toGweiBN(s : string) {
    return ethers.utils.parseUnits(s,'gwei') 
} 
