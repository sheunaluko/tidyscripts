import { midi_encoder } from "tidyscripts_common";
import { get_datagram_writer } from "../webtransport"


/**
 * Given a url to a webtranport server endpoint, returns a writer object 
 * that has the functions 'note_on(ch,nte,vel)', 'note_off(ch,nte,vel)' and
 * 'control_change(ch,id,val)'.
 * When these functions are called, the message is converted to midi byte format
 * and sent as a datagram over the webtranport connection
 *
 * This assumes that you have a functioning webtransport server to connect to and which
 * parses and acts on these midi bytes. 
 */
export function get_midi_writer(url: string) {

  let writer = (get_datagram_writer(url) as any);

  writer.note_on = function(c: number, k: number, velocity: number) {
    let midi_bytes = midi_encoder.note_on(c, k, velocity);
    writer.write(midi_bytes)
  }


  writer.note_off = function(c: number, k: number, velocity: number) {
    let midi_bytes = Uint8Array.from([0b10000000 + c, k, velocity])
    writer.write(midi_bytes)
  }


  writer.control_change = function(c: number, id: number, value: number) {
    let midi_bytes = midi_encoder.control_change(c, id, value)
    writer.write(midi_bytes)
  }

  return writer
}




