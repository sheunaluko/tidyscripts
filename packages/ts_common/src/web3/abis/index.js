import erc20 from "./erc20"; // assert {type : 'json' } ;
import uni_v2_router_abi from "./uniswap_v2_router_abi"; // assert { type: 'json' }; 
import uni_v2_pool_abi from "./uniswap_v2_pool_abi"; // assert { type: 'json' }; 
export var uni_v2 = {
    router: uni_v2_router_abi,
    pool: uni_v2_pool_abi,
};
export { erc20 };
