


export var init = 'true' ;


export async function drug_outline(page : any) {
    try {
        let data = await page.evaluate(() => {
            const panel = document.querySelector('#tree');
            
            // If panel doesn't exist, handle it gracefully
            if (!panel) {
                throw new Error('Panel with #tree not found.');
            }
            
            const titleElement = panel.querySelector('.moduleLeftPaneTitle span');
            const title = titleElement ? (titleElement as any).innerText : 'No title found';
            
            const items = Array.from(panel.querySelectorAll('dl.wk-list dt')).map((item : any)  => item.innerText);

            return {
                title: title,
                items: items.length ? items : ['No items found']
            };
        });

        console.log('Scraped Data:', data);
        return data;

    } catch (error) {
        console.error('Error in scraping drug outline:', error);
        return null;  // Return null or any default value in case of failure
    }
}
