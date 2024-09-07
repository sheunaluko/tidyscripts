[**Tidyscripts Docs**](../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../globals.md) / [common](../../../README.md) / [fp](../README.md) / map\_prop\_reduce

# Function: map\_prop\_reduce()

> **map\_prop\_reduce**(`prop`, `reducer`, `acc`, `list`): \<`U`\>(`f`) => (`acc`) => `U`\<`U`\>(`__`, `acc`) => (`f`) => `U`\<`U`\>(`f`, `acc`) => `U`

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

• **U**

### Parameters

• **\_\_**: `Placeholder`

• **acc**: `U`

### Returns

`Function`

#### Parameters

• **f**

#### Returns

`U`

### Type Parameters

• **U**

### Parameters

• **f**

• **acc**: `U`

### Returns

`U`

## Defined in

[packages/ts\_common/src/fp.ts:338](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_common/src/fp.ts#L338)
