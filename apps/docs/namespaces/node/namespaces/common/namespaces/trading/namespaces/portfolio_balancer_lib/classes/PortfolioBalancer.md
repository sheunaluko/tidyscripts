[**Tidyscripts Docs**](../../../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../../../globals.md) / [node](../../../../../../../README.md) / [common](../../../../../README.md) / [trading](../../../README.md) / [portfolio\_balancer\_lib](../README.md) / PortfolioBalancer

# Class: `abstract` PortfolioBalancer

Creates a PortfolioBalancer object using the supplied parameters.
See class methods.

## Extended by

- [`BacktestBalancer`](../../backtest_balancer/classes/BacktestBalancer.md)

## Constructors

### new PortfolioBalancer()

> **new PortfolioBalancer**(`params`): [`PortfolioBalancer`](PortfolioBalancer.md)

#### Parameters

• **params**: [`BalanceParams`](../type-aliases/BalanceParams.md)

#### Returns

[`PortfolioBalancer`](PortfolioBalancer.md)

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:28

## Properties

### Logger

> **Logger**: `any`

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:24

***

### Params

> **Params**: [`BalanceParams`](../type-aliases/BalanceParams.md)

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:23

***

### last\_balance\_data

> **last\_balance\_data**: `any`

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:25

***

### log\_mode

> **log\_mode**: `string`

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:26

***

### state

> **state**: `any`

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:27

## Methods

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

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:36

***

### do\_market\_trade()

> `abstract` **do\_market\_trade**(`trade_type`, `base_amt`): `Promise`\<[`MarketResult`](../type-aliases/MarketResult.md)\>

#### Parameters

• **trade\_type**: [`MarketTradeType`](../enumerations/MarketTradeType.md)

• **base\_amt**: `number`

#### Returns

`Promise`\<[`MarketResult`](../type-aliases/MarketResult.md)\>

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:63

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

> **trade\_type**: [`MarketTradeType`](../enumerations/MarketTradeType.md)

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:44

***

### get\_base\_balance()

> `abstract` **get\_base\_balance**(`ba`): `Promise`\<`number`\>

#### Parameters

• **ba**: `string`

#### Returns

`Promise`\<`number`\>

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:61

***

### get\_base\_price()

> `abstract` **get\_base\_price**(`ba`, `qa`): `Promise`\<`number`\>

#### Parameters

• **ba**: `string`

• **qa**: `string`

#### Returns

`Promise`\<`number`\>

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:62

***

### get\_quote\_balance()

> `abstract` **get\_quote\_balance**(`qa`): `Promise`\<`number`\>

#### Parameters

• **qa**: `string`

#### Returns

`Promise`\<`number`\>

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:60

***

### log()

> **log**(`v`): `void`

Logs data via std method

#### Parameters

• **v**: `any`

#### Returns

`void`

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:32

***

### set\_log\_mode()

> **set\_log\_mode**(`s`): `void`

#### Parameters

• **s**: `string`

#### Returns

`void`

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:59

***

### symbol\_generator()

> `abstract` **symbol\_generator**(`ba`, `qa`): `string`

#### Parameters

• **ba**: `string`

• **qa**: `string`

#### Returns

`string`

#### Defined in

packages/ts\_common/dist/trading/portfolio\_balancer\_lib.d.ts:64
