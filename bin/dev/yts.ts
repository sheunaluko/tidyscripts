import * as ytt from './yt_transcript'
import common from "../../packages/ts_common/dist/index" ;
import node   from "../../packages/ts_node/dist/index" ;

const log = common.logger.get_logger({'id' : 'yts'})
const {debug} = common.util

export async function get_summary(url: string, length : string ) {
    log(`Getting transcript`) 
    let transcript = await ytt.get_transcript(url) ;
    //now pass to ai to get summary
    log(`Generating summary...`)

    let messages = [
	{role : 'system' , content : 'The user sends you long video transcripts and you summarize the contents of the video into key points/takeaways' }, 
	{role : 'user' , content : `I want you to summarize (in plain text and NOT markdown) the following video transcript, such that it can be readable and understandble in about ${length} minutes. <transcript>${transcript}</transcript>`}
    ]

    let model = "chatgpt-4o-latest"
    let max_tokens = 2000 ;
    debug.add('msgs', messages) 

    let resp = await node.apis.openai.chat_completion(messages,model, max_tokens)
    debug.add('resp', resp) 
    return resp.response.content
    
} 
