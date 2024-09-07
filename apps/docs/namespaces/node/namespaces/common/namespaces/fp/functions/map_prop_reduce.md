[**Tidyscripts Docs**](../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../globals.md) / [node](../../../../../README.md) / [common](../../../README.md) / [fp](../README.md) / map\_prop\_reduce

# Function: map\_prop\_reduce()

> **map\_prop\_reduce**(`prop`, `reducer`, `acc`, `list`): \<`U`\>(`f`) => (`acc`) => `U`\<`U_1`\>(`__`, `acc`) => (`f`) => `U_1`\<`U_2`\>(`f`, `acc`) => `U_2`

Given a list of objects, extract property 'prop' from each object
to create a new list, and then reduce this list with the given
reducer and initial accumulator

## Parameters

• **prop**: `string`

The property to extract

• **reducer**: `any`

The reducer to use

• **acc**: `any`

The initiall acc value

• **list**: `any`[]

The list to act upon

## Returns

`Function`

### Type Parameters

• **U**

### Parameters

• **f**

### Returns

`Function`

#### Parameters

• **acc**: `U`

#### Returns

`U`

### Type Parameters

• **U_1**

### Parameters

• **\_\_**: `Placeholder`

• **acc**: `U_1`

### Returns

`Function`

#### Parameters

• **f**

#### Returns

`U_1`

### Type Parameters

• **U_2**

### Parameters

• **f**

• **acc**: `U_2`

### Returns

`U_2`

## Defined in

packages/ts\_common/dist/fp.d.ts:121
