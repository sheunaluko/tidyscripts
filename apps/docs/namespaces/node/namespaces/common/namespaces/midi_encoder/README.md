[**Tidyscripts Docs**](../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../globals.md) / [node](../../../../README.md) / [common](../../README.md) / midi\_encoder

# midi\_encoder

Tools for encoding midi message to uint8array
For example:
```
// The following schema is used to encode messages
// 1000nnnn  0kkkkkkk  0vvvvvvv  Note Off          n=channel k=key v=velocity
// 1001nnnn  0kkkkkkk  0vvvvvvv  Note On           n=channel k=key v=velocity
// 1010nnnn  0kkkkkkk  0ppppppp  AfterTouch        n=channel k=key p=pressure
// 1011nnnn  0ccccccc  0vvvvvvv  Controller Value  n=channel c=controller v=value

// the code below will produce uint8Array encoded midi message, which can be sent to a server, etc
let bytes = note_on(1,60,127) //full velocity middle c on channel 1
let bytes = control_change(1,60,127) //set controller with ID 60, on ch1 to value of 127
```

## Index

### Functions

- [control\_change](functions/control_change.md)
- [note\_off](functions/note_off.md)
- [note\_on](functions/note_on.md)
