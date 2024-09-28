import puppeteer from 'puppeteer';
import {OpenAI} from "openai" ; 
import {logger, util} from "tidyscripts_common" 
import * as oai from "../../apis/openai/index"

const log = logger.get_logger({id : "aiu"}) ; 

export const openai = new OpenAI(); //default for v4 is to use the env var 

/*
 * Module generated with AI assistance (gpt o1-preview) 
 */

// Define an interface for simplified DOM elements
interface SimplifiedElement {
  tag: string;
  id?: string;
  classes?: string[];
  children?: SimplifiedElement[];
  textContent?: string;
}

// Function to simplify the DOM recursively
async function simplifyDOM(
  element: any, 
  depth: number = 0,
  maxDepth: number = 3
): Promise<SimplifiedElement | null> {
  if (depth > maxDepth) {
    return null;
  }

  const tag = await element.evaluate((el:any) => el.tagName.toLowerCase());
  const id = await element.evaluate((el:any) => el.id || undefined);
  const classes = await element.evaluate((el:any) => Array.from(el.classList));
  const textContent = await element.evaluate((el:any) => el.textContent?.trim() || undefined);

  // Get child elements
  const childrenHandles = await element.$$(':scope > *');

  const childrenPromises = childrenHandles.map((child:any) =>
    simplifyDOM(child, depth + 1, maxDepth)
  );
  const children = (
    await Promise.all(childrenPromises)
  ).filter((child:any) => child !== null) as SimplifiedElement[];

  return {
    tag: tag,
    id: id,
    classes: classes.length > 0 ? classes : undefined,
    textContent: children.length === 0 ? textContent : undefined,
    children: children.length > 0 ? children : undefined,
  };
}



// Function to extract and simplify the DOM from a given URL
export async function extractSimplifiedDOM(url: string, maxDepth: number = 3): Promise<SimplifiedElement | null> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle2' });

  const bodyHandle = await page.$('body');
  if (!bodyHandle) {
    await browser.close();
    return null;
  }

  const simplifiedDOM = await simplifyDOM(bodyHandle, 0, maxDepth);

  await bodyHandle.dispose();
  await browser.close();

  return simplifiedDOM;
}

// Function to communicate with the LLM
export async function interactWithLLM(simplifiedDOM: SimplifiedElement, userInstruction: string): Promise<string> {
  // Convert the simplified DOM to JSON string
  const domString = JSON.stringify(simplifiedDOM);

  // Prepare the prompt for the LLM
  const prompt = `
You are a helpful assistant that generates Puppeteer code for extracting information from web pages.

Here is a simplified representation of a web page's DOM:

${domString}

Based on the DOM above, ${userInstruction}

Provide the Puppeteer code snippets in TypeScript that accomplish this task.
`;

  // Call the OpenAI API
  let msgs = [{"role": "user" , "content" : prompt}]
  const response = await oai.chat_completion(msgs,"gpt-4o",4096) 

  const generatedCode = oai.extract_first_text_response(response) ; 
  return generatedCode || 'No response from LLM.';
}

// Example usage
export async function main() {
  const url = 'https://coinmarketcap.com'; // Replace with the target URL
  const userInstruction = 'please extract the cryptocurrency price information.';

  console.log('Extracting and simplifying the DOM...');
  const simplifiedDOM = await extractSimplifiedDOM(url);

  if (!simplifiedDOM) {
    console.error('Failed to extract DOM.');
    return;
  }

  console.log('Interacting with the LLM...');
  const llmResponse = await interactWithLLM(simplifiedDOM, userInstruction);

  console.log('LLM Response:');
  console.log(llmResponse);
}


