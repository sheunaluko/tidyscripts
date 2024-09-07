[**Tidyscripts Docs**](../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../globals.md) / [node](../../../../README.md) / [apis](../../README.md) / coinbase

# coinbase

API for interacting with a coinbase(pro) user account.
For example, to get the total usd value of an account:
```
const ts = require("tidyscripts_node")  ;
let keys = { api_key, secret_key , passphrase } ;  //coinbase api keys and passphrase 
let value =  ts.apis.coinbase.get_user_balances(keys)  ; 
console.log("Your net worth on coinbase/coinbasepro is currently" + value);
```

## Index

### Type Aliases

- [CoinbaseUserDataParams](type-aliases/CoinbaseUserDataParams.md)

### Functions

- [coinbase\_query](functions/coinbase_query.md)
- [coinbase\_total\_usd\_value](functions/coinbase_total_usd_value.md)
- [get\_account\_id\_mapping](functions/get_account_id_mapping.md)
- [get\_coinbase\_balances](functions/get_coinbase_balances.md)
- [get\_coinbase\_pro\_user\_accounts](functions/get_coinbase_pro_user_accounts.md)
- [get\_coinbase\_pro\_user\_balances](functions/get_coinbase_pro_user_balances.md)
- [get\_coinbase\_user\_accounts](functions/get_coinbase_user_accounts.md)
- [get\_resolved\_user\_transfers](functions/get_resolved_user_transfers.md)
- [get\_user\_balances](functions/get_user_balances.md)
- [get\_user\_transfers](functions/get_user_transfers.md)
- [usd\_price](functions/usd_price.md)
