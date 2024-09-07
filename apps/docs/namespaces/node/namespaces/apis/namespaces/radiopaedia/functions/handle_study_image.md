[**Tidyscripts Docs**](../../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../../globals.md) / [node](../../../../../README.md) / [apis](../../../README.md) / [radiopaedia](../README.md) / handle\_study\_image

# Function: handle\_study\_image()

> **handle\_study\_image**(`img`): `Promise`\<`object`\>

Parses an image object 
``` 
//Example input looks like:
{
 id: 59905553,
 fullscreen_filename: 'https://prod-images-static.radiopaedia.org/images/59905553/680cc234567b77cf3ab1e8cd24d21e649018e70336ccdf42abc6780d341ed001_big_gallery.jpeg',
 public_filename: 'https://prod-images-static.radiopaedia.org/images/59905553/680cc234567b77cf3ab1e8cd24d21e649018e70336ccdf42abc6780d341ed001.png',
 plane_projection: 'Axial',
 aux_modality: 'C+ arterial phase',
 position: 51,
 content_type: 'image/png',
 width: 1382,
 height: 984,
 show_feature: false,
 show_pin: false,
 show_case_key_image: false,
 show_stack_key_image: false,
 download_image_url: '/images/59905553/download?layout=false',
 crop_pending: false
}
```

## Parameters

• **img**: `any`

## Returns

`Promise`\<`object`\>

### height

> **height**: `any`

### pixels\_indexed

> **pixels\_indexed**: `any`[][]

### width

> **width**: `any`

## Defined in

[packages/ts\_node/src/apis/radiopaedia.ts:298](https://github.com/sheunaluko/tidyscripts/blob/master/packages/ts_node/src/apis/radiopaedia.ts#L298)
