
/**
 * Webtransport API for browsers.
 * See {@link webtransport.get_json_writer} for example usage. 
 *
 * @packageDocumentation 
 */


declare var WebTransport: any;

/**
 * Creates a WebTransport session 
 *
 */
function init(url: string) {
  let transport = new WebTransport(url)
  return transport
}


/**
 * Turns json object into string and then into uint8array of bytes 
 */
function encode_json_to_uint8(json: any) {
  return new TextEncoder().encode(JSON.stringify(json))
}


/**
 * Given a transport object, will return a datagram writer
 * This does not need to be called directly; it is used internally 
 */
function get_json_datagram_writer(transport: any) {
  let writer = transport.datagrams.writable.getWriter();
  return writer
}


async function write_json_datagram(writer: any, json: any) {
  //let writer = transport.datagrams.writable.getWriter();
  let u8 = encode_json_to_uint8(json)
  await writer.write(u8)
}


/**
 * Main entry point; see usage below.
 * Creates a webtransport session with the specified URL and then
 * returns a writer object. The writer objects 
 * accepts json via obj.write_json(json). 
 * 
 * ```
 * let r = get_json_writer("https://localhost:1234/webtransport")
 * r.write_json({'msg': 'init' , 'time' : (new Date())})
 * ``` 
 *
 */
function get_json_writer(url: string) {
  let jr = get_json_datagram_writer(init(url));
  if (true) {
    write_json_datagram(jr, { 'status': 'init', 't': (new Date()) });;
  }
  (jr as any).write_json = async function(j: any) {
    await jr.write(encode_json_to_uint8(j))
  }

  return jr

}

export {
  init,
  encode_json_to_uint8,
  get_json_datagram_writer,
  write_json_datagram,
  get_json_writer,

} 
