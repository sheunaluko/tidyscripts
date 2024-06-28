
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
 * Given a web transport url, will return a datagram writer and the transport object 
 * in a dictionary with keys (writer, tranport).
 * Use writer.write(bytes) to send a datagram 
 */
function get_datagram_writer(url: string) {
  let transport = init(url);
  let writer = transport.datagrams.writable.getWriter();
  return { writer, transport }
}


async function write_json_datagram(writer: any, json: any) {
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
  let { writer, transport } = get_datagram_writer(url);
  (writer as any).write_json = async function(j: any) {
    await writer.write(encode_json_to_uint8(j))
  }

  return writer

}


export {
  init,
  encode_json_to_uint8,
  get_datagram_writer,
  write_json_datagram,
  get_json_writer,
} 
