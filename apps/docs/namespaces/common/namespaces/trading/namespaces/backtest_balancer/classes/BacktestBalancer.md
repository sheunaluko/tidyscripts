[**Tidyscripts Docs**](../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../globals.md) / [common](../../../../../README.md) / [trading](../../../README.md) / [backtest\_balancer](../README.md) / BacktestBalancer

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

[packages/ts\_common/src/trading/backtester.ts:78](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/backtester.ts#L78)

## Properties

### Logger

> **Logger**: `any`

#### Inherited from

[`PortfolioBalancer`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md).[`Logger`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md#logger)

#### Defined in

[packages/ts\_common/src/trading/portfolio\_balancer\_lib.ts:43](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/portfolio_balancer_lib.ts#L43)

***

### Params

> **Params**: [`BalanceParams`](../../portfolio_balancer_lib/type-aliases/BalanceParams.md)

#### Inherited from

[`PortfolioBalancer`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md).[`Params`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md#params)

#### Defined in

[packages/ts\_common/src/trading/portfolio\_balancer\_lib.ts:42](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/portfolio_balancer_lib.ts#L42)

***

### balance\_portfolio\_series

> **balance\_portfolio\_series**: [`Portfolio`](../type-aliases/Portfolio.md)[]

#### Defined in

[packages/ts\_common/src/trading/backtester.ts:70](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/backtester.ts#L70)

***

### current\_index

> **current\_index**: `number`

#### Defined in

[packages/ts\_common/src/trading/backtester.ts:66](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/backtester.ts#L66)

***

### data

> **data**: [`BacktestData`](../type-aliases/BacktestData.md)

#### Defined in

[packages/ts\_common/src/trading/backtester.ts:65](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/backtester.ts#L65)

***

### fee

> **fee**: `number`

#### Defined in

[packages/ts\_common/src/trading/backtester.ts:74](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/backtester.ts#L74)

***

### hodl\_portfolio\_series

> **hodl\_portfolio\_series**: [`Portfolio`](../type-aliases/Portfolio.md)[]

#### Defined in

[packages/ts\_common/src/trading/backtester.ts:71](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/backtester.ts#L71)

***

### initial\_portfolio

> **initial\_portfolio**: [`Portfolio`](../type-aliases/Portfolio.md)

#### Defined in

[packages/ts\_common/src/trading/backtester.ts:69](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/backtester.ts#L69)

***

### last\_balance\_data

> **last\_balance\_data**: `any`

#### Inherited from

[`PortfolioBalancer`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md).[`last_balance_data`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md#last_balance_data)

#### Defined in

[packages/ts\_common/src/trading/portfolio\_balancer\_lib.ts:44](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/portfolio_balancer_lib.ts#L44)

***

### log\_mode

> **log\_mode**: `string`

#### Inherited from

[`PortfolioBalancer`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md).[`log_mode`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md#log_mode)

#### Defined in

[packages/ts\_common/src/trading/portfolio\_balancer\_lib.ts:45](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/portfolio_balancer_lib.ts#L45)

***

### portfolio

> **portfolio**: [`Portfolio`](../type-aliases/Portfolio.md)

#### Defined in

[packages/ts\_common/src/trading/backtester.ts:68](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/backtester.ts#L68)

***

### ratio\_series

> **ratio\_series**: `number`[]

#### Defined in

[packages/ts\_common/src/trading/backtester.ts:72](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/backtester.ts#L72)

***

### rebalances

> **rebalances**: `any`[]

#### Defined in

[packages/ts\_common/src/trading/backtester.ts:67](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/backtester.ts#L67)

***

### slippage

> **slippage**: `number`

#### Defined in

[packages/ts\_common/src/trading/backtester.ts:73](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/backtester.ts#L73)

***

### state

> **state**: `any`

#### Inherited from

[`PortfolioBalancer`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md).[`state`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md#state)

#### Defined in

[packages/ts\_common/src/trading/portfolio\_balancer\_lib.ts:46](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/portfolio_balancer_lib.ts#L46)

***

### transactions\_costs

> **transactions\_costs**: `any`

#### Defined in

[packages/ts\_common/src/trading/backtester.ts:75](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/backtester.ts#L75)

## Methods

### backtest()

> **backtest**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/ts\_common/src/trading/backtester.ts:232](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/backtester.ts#L232)

***

### balance\_portfolio()

> **balance\_portfolio**(): `Promise`\<`object`\>

Performs a portfolio re-balance using the supplied parameters

#### Returns

`Promise`\<`object`\>

##### balance\_needed

> **balance\_needed**: `boolean` = `true`

##### balanced

> **balanced**: `boolean` = `!error`

##### info

> **info**: `any` = `result_info`

#### Inherited from

[`PortfolioBalancer`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md).[`balance_portfolio`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md#balance_portfolio)

#### Defined in

[packages/ts\_common/src/trading/portfolio\_balancer\_lib.ts:70](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/portfolio_balancer_lib.ts#L70)

***

### do\_market\_trade()

> **do\_market\_trade**(`trade_type`, `base_amt`): `Promise`\<`object`\>

#### Parameters

• **trade\_type**: [`MarketTradeType`](../../portfolio_balancer_lib/enumerations/MarketTradeType.md)

• **base\_amt**: `number`

#### Returns

`Promise`\<`object`\>

##### error

> **error**: `boolean` = `false`

##### info

> **info**: `null` = `null`

#### Overrides

[`PortfolioBalancer`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md).[`do_market_trade`](../../portfolio_balancer_lib/classes/PortfolioBalancer.md#do_market_trade)

#### Defined in

[packages/ts\_common/src/trading/backtester.ts:112](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/backtester.ts#L112)

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

[packages/ts\_common/src/trading/portfolio\_balancer\_lib.ts:126](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/portfolio_balancer_lib.ts#L126)

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

[packages/ts\_common/src/trading/backtester.ts:106](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/backtester.ts#L106)

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

[packages/ts\_common/src/trading/backtester.ts:109](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/backtester.ts#L109)

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

> **base\_balance**: `number` = `portfolio.base_balance`

##### p

> **p**: `number`

##### quote\_balance

> **quote\_balance**: `number` = `portfolio.quote_balance`

##### t

> **t**: `string`

##### value

> **value**: `number`

#### Defined in

[packages/ts\_common/src/trading/backtester.ts:208](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/backtester.ts#L208)

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

[packages/ts\_common/src/trading/backtester.ts:103](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/backtester.ts#L103)

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

[packages/ts\_common/src/trading/backtester.ts:219](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/backtester.ts#L219)

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

[packages/ts\_common/src/trading/portfolio\_balancer\_lib.ts:65](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/portfolio_balancer_lib.ts#L65)

***

### process\_data()

> **process\_data**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/ts\_common/src/trading/backtester.ts:194](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/backtester.ts#L194)

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

[packages/ts\_common/src/trading/portfolio\_balancer\_lib.ts:157](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/portfolio_balancer_lib.ts#L157)

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

[packages/ts\_common/src/trading/backtester.ts:192](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/trading/backtester.ts#L192)
