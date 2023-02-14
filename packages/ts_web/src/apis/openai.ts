

import { get_json_from_url } from "tidyscripts_common"



/**
 * Uses the tidyscripts openai davinci api to answer a text based prompt 
 * 
 */
export async function openai_davinci_prompt(prompt : string, max_tokens  : number ) {
  return await get_json_from_url("https://tidyscripts.com/api/openai_davinci" , {prompt , max_tokens})
}

