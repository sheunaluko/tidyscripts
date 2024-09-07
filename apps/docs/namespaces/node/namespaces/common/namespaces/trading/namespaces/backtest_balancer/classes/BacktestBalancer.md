[**Tidyscripts Docs**](../../../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../../../globals.md) / [node](../../../../../../../README.md) / [common](../../../../../README.md) / [trading](../../../README.md) / [backtest\_balancer](../README.md) / BacktestBalancer

# Class: BacktestBalancer

Class for running a backtest. See below for usage example.

## Example

```
// 1. First create the backtester options
let ops = {
   base_asset : "ETH",
   quote_asset : "BUSD",
   data : [ {p :1450 , t : "ISO_DATE" }...],
   initial_portfolio : {
     base_balance : 20 ,
     quote_balance : 0 ,
   } ,
  logger_id : "ETHUSDC" ,
  fee : 0.001 ,
  slippage : 0.01,
  target_precision  : 0.05,
  target_ratio : 0.6,
}

// 2. Then create the backtester
let backtester = new BacktestBalancer(ops) ;

// 3. Then run the backtest
await backtester.backtest() ;

// 4. Then extract the backtest metrics and use them in a graph, analysis, etc...
let  {
 hodl_porfolio_series,
 balance_portfolio_series,
 rebalances
} = backtester  ;
```

## Extends

- [`PortfolioBalancer`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md)

## Constructors

### new BacktestBalancer()

> **new BacktestBalancer**(`p`): [`BacktestBalancer`](BacktestBalancer.md)

#### Parameters

• **p**: [`BacktestBalancerParams`](../interfaces/BacktestBalancerParams.md)

#### Returns

[`BacktestBalancer`](BacktestBalancer.md)

#### Overrides

[`PortfolioBalancer`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md).[`constructor`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md#constructors)

#### Defined in

packages/ts\_common/dist/trading/backtester.d.ts:66

## Properties

### Logger

> **Logger**: `any`

#### Inherited from

[`PortfolioBalancer`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md).[`Logger`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md#logger)

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:24

***

### Params

> **Params**: [`BalanceParams`](../../portfolio_balancer_lib/type-aliases/BalanceParams.md)

#### Inherited from

[`PortfolioBalancer`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md).[`Params`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md#params)

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:23

***

### balance\_portfolio\_series

> **balance\_portfolio\_series**: [`Portfolio`](../type-aliases/Portfolio.md)[]

#### Defined in

packages/ts\_common/dist/trading/backtester.d.ts:60

***

### current\_index

> **current\_index**: `number`

#### Defined in

packages/ts\_common/dist/trading/backtester.d.ts:56

***

### data

> **data**: [`BacktestData`](../type-aliases/BacktestData.md)

#### Defined in

packages/ts\_common/dist/trading/backtester.d.ts:55

***

### fee

> **fee**: `number`

#### Defined in

packages/ts\_common/dist/trading/backtester.d.ts:64

***

### hodl\_portfolio\_series

> **hodl\_portfolio\_series**: [`Portfolio`](../type-aliases/Portfolio.md)[]

#### Defined in

packages/ts\_common/dist/trading/backtester.d.ts:61

***

### initial\_portfolio

> **initial\_portfolio**: [`Portfolio`](../type-aliases/Portfolio.md)

#### Defined in

packages/ts\_common/dist/trading/backtester.d.ts:59

***

### last\_balance\_data

> **last\_balance\_data**: `any`

#### Inherited from

[`PortfolioBalancer`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md).[`last_balance_data`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md#last_balance_data)

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:25

***

### log\_mode

> **log\_mode**: `string`

#### Inherited from

[`PortfolioBalancer`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md).[`log_mode`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md#log_mode)

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:26

***

### portfolio

> **portfolio**: [`Portfolio`](../type-aliases/Portfolio.md)

#### Defined in

packages/ts\_common/dist/trading/backtester.d.ts:58

***

### ratio\_series

> **ratio\_series**: `number`[]

#### Defined in

packages/ts\_common/dist/trading/backtester.d.ts:62

***

### rebalances

> **rebalances**: `any`[]

#### Defined in

packages/ts\_common/dist/trading/backtester.d.ts:57

***

### slippage

> **slippage**: `number`

#### Defined in

packages/ts\_common/dist/trading/backtester.d.ts:63

***

### state

> **state**: `any`

#### Inherited from

[`PortfolioBalancer`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md).[`state`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md#state)

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:27

***

### transactions\_costs

> **transactions\_costs**: `any`

#### Defined in

packages/ts\_common/dist/trading/backtester.d.ts:65

## Methods

### backtest()

> **backtest**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

packages/ts\_common/dist/trading/backtester.d.ts:88

***

### balance\_portfolio()

> **balance\_portfolio**(): `Promise`\<`object`\>

Performs a portfolio re-balance using the supplied parameters

#### Returns

`Promise`\<`object`\>

##### balance\_needed

> **balance\_needed**: `boolean`

##### balanced

> **balanced**: `boolean`

##### info

> **info**: `any`

#### Inherited from

[`PortfolioBalancer`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md).[`balance_portfolio`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md#balance_portfolio)

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:36

***

### do\_market\_trade()

> **do\_market\_trade**(`trade_type`, `base_amt`): `Promise`\<`object`\>

#### Parameters

• **trade\_type**: [`MarketTradeType`](../../portfolio_balancer_lib/enumerations/MarketTradeType.md)

• **base\_amt**: `number`

#### Returns

`Promise`\<`object`\>

##### error

> **error**: `boolean`

##### info

> **info**: `null`

#### Overrides

[`PortfolioBalancer`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md).[`do_market_trade`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md#do_market_trade)

#### Defined in

packages/ts\_common/dist/trading/backtester.d.ts:70

***

### get\_balance\_data()

> **get\_balance\_data**(): `Promise`\<`object`\>

Retrieve data about a potential rebalancing

#### Returns

`Promise`\<`object`\>

##### base\_amt

> **base\_amt**: `number`

##### base\_delta

> **base\_delta**: `number`

##### base\_market\_amt

> **base\_market\_amt**: `number`

##### base\_price

> **base\_price**: `number`

##### current\_ratio

> **current\_ratio**: `number`

##### portfolio\_value

> **portfolio\_value**: `number`

##### quote\_amt

> **quote\_amt**: `number`

##### ratio\_error

> **ratio\_error**: `number`

##### target\_achieved

> **target\_achieved**: `boolean`

##### target\_base\_amt

> **target\_base\_amt**: `number`

##### target\_precision

> **target\_precision**: `number`

##### target\_ratio

> **target\_ratio**: `number`

##### trade\_type

> **trade\_type**: [`MarketTradeType`](../../portfolio_balancer_lib/enumerations/MarketTradeType.md)

#### Inherited from

[`PortfolioBalancer`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md).[`get_balance_data`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md#get_balance_data)

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:44

***

### get\_base\_balance()

> **get\_base\_balance**(`ba`): `Promise`\<`number`\>

#### Parameters

• **ba**: `string`

#### Returns

`Promise`\<`number`\>

#### Overrides

[`PortfolioBalancer`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md).[`get_base_balance`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md#get_base_balance)

#### Defined in

packages/ts\_common/dist/trading/backtester.d.ts:68

***

### get\_base\_price()

> **get\_base\_price**(`ba`, `qa`): `Promise`\<`number`\>

#### Parameters

• **ba**: `string`

• **qa**: `string`

#### Returns

`Promise`\<`number`\>

#### Overrides

[`PortfolioBalancer`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md).[`get_base_price`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md#get_base_price)

#### Defined in

packages/ts\_common/dist/trading/backtester.d.ts:69

***

### get\_portfolio\_value\_and\_time()

> **get\_portfolio\_value\_and\_time**(`portfolio`, `p`, `t`): `object`

#### Parameters

• **portfolio**: [`Portfolio`](../type-aliases/Portfolio.md)

• **p**: `number`

• **t**: `string`

#### Returns

`object`

##### base\_balance

> **base\_balance**: `number`

##### p

> **p**: `number`

##### quote\_balance

> **quote\_balance**: `number`

##### t

> **t**: `string`

##### value

> **value**: `number`

#### Defined in

packages/ts\_common/dist/trading/backtester.d.ts:76

***

### get\_quote\_balance()

> **get\_quote\_balance**(`qa`): `Promise`\<`number`\>

#### Parameters

• **qa**: `string`

#### Returns

`Promise`\<`number`\>

#### Overrides

[`PortfolioBalancer`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md).[`get_quote_balance`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md#get_quote_balance)

#### Defined in

packages/ts\_common/dist/trading/backtester.d.ts:67

***

### get\_transactions\_costs\_values()

> **get\_transactions\_costs\_values**(`tc`, `p`): `object`

#### Parameters

• **tc**: `any`

• **p**: `number`

#### Returns

`object`

##### fee\_cost

> **fee\_cost**: `any`

##### slippage\_cost

> **slippage\_cost**: `any`

##### total

> **total**: `any`

#### Defined in

packages/ts\_common/dist/trading/backtester.d.ts:83

***

### log()

> **log**(`v`): `void`

Logs data via std method

#### Parameters

• **v**: `any`

#### Returns

`void`

#### Inherited from

[`PortfolioBalancer`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md).[`log`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md#log)

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:32

***

### process\_data()

> **process\_data**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

packages/ts\_common/dist/trading/backtester.d.ts:75

***

### set\_log\_mode()

> **set\_log\_mode**(`s`): `void`

#### Parameters

• **s**: `string`

#### Returns

`void`

#### Inherited from

[`PortfolioBalancer`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md).[`set_log_mode`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md#set_log_mode)

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:59

***

### symbol\_generator()

> **symbol\_generator**(`ba`, `qa`): `string`

#### Parameters

• **ba**: `string`

• **qa**: `string`

#### Returns

`string`

#### Overrides

[`PortfolioBalancer`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md).[`symbol_generator`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md#symbol_generator)

#### Defined in

packages/ts\_common/dist/trading/backtester.d.ts:74
