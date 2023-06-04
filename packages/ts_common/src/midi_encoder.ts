/**
 * Tools for encoding midi message to uint8array
 * For example:
 * ```
 * // The following schema is used to encode messages 
 * // 1000nnnn  0kkkkkkk  0vvvvvvv  Note Off          n=channel k=key v=velocity
 * // 1001nnnn  0kkkkkkk  0vvvvvvv  Note On           n=channel k=key v=velocity
 * // 1010nnnn  0kkkkkkk  0ppppppp  AfterTouch        n=channel k=key p=pressure
 * // 1011nnnn  0ccccccc  0vvvvvvv  Controller Value  n=channel c=controller v=value
 *
 * // the code below will produce uint8Array encoded midi message, which can be sent to a server, etc 
 * let bytes = note_on(1,60,127) //full velocity middle c on channel 1
 * let bytes = control_change(1,60,127) //set controller with ID 60, on ch1 to value of 127
 * ``` 
 * @packageDocumentation
 */



export function note_on(c: number, k: number, velocity: number) {
  return Uint8Array.from([0b10010000 + c, k, velocity])
}

export function note_off(c: number, k: number, velocity: number) {
  return Uint8Array.from([0b10000000 + c, k, velocity])
}

export function control_change(c: number, id: number, velocity: number) {
  return Uint8Array.from([0b10110000 + c, id, velocity])
}

