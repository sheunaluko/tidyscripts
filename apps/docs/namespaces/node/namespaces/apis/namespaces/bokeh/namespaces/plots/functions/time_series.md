[**Tidyscripts Docs**](../../../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../../../globals.md) / [node](../../../../../../../README.md) / [apis](../../../../../README.md) / [bokeh](../../../README.md) / [plots](../README.md) / time\_series

# Function: time\_series()

> **time\_series**(`x`, `y`): `void`

Creates a time series plot given x values and y values 
Note that the x values should be unix timestamp in ms. 
```
//for example
//assuming data represents a mongodb aggregation result by year
let t     = data.map(x=> (new Date(x.year,0,1)).getTime() ) ; 
let count = data.map(x=>x.count) ; 
let ts    = require("tidyscripts_node") ; 
//to use bokeh api you need to first initialize it 
let i     = ts.apis.bokeh.api.get_interface() ; 
//now you need to connect to the websocket server which is hosted on port 9001 by default
//then you can graph 
ts.apis.bokeh.plots.time_series( t, count ) ; 

//Note: I plan to simplify this process in the future, for more automated plotting
```

## Parameters

• **x**: `any`

• **y**: `any`

## Returns

`void`

## Defined in

[packages/ts\_node/src/apis/bokeh/plots.ts:25](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/apis/bokeh/plots.ts#L25)
