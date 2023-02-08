import { ethers } from "ethers";
export function toEth(bigNum, decimals) {
    return Number(ethers.utils.formatUnits(bigNum.toString(), decimals));
}
export function BNtoGwei(bigNum) {
    return Number(ethers.utils.formatUnits(bigNum, 'gwei'));
}
export function toGweiBN(s) {
    return ethers.utils.parseUnits(s, 'gwei');
}
