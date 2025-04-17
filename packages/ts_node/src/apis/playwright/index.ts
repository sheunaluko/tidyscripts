const { chromium } = require('playwright');


export async function get_browser(ops : any) {
    return await chromium.launch(ops) ; 
} 

export async function get_ui_browser() {
    return await get_browser({headless: false}) 
}

export async function get_browser_with_ops(ops : any) {
    return await chromium.launch(ops) 
} 

export {chromium} 
