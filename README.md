# Tidyscripts
##### A tidy collection of web and server (deno) typescript libraries 

- Both web and server code share a common codebase at src/common, allowing the effective re-use of typescript code! 
- There is an automated build script at bin/rebuild which will run the typescript compiler then package the web libraries (including their src/common dependencies) into a npm package ready for distribution or use locally via "yarn|npm link"
- Deno files can be imported directly from the src/deno folders without any necessary compilation 

#### Currently included libraries: 

##### Common
- Functional programming with objects, strings, arrays 
- Date object manipuluation 
- Asynchronous helper functions (wait, wait_until, etc) 
- Loggers
- Custom Types (Result,AsyncResult,etc)

##### Browser
- Speech recognition and text to speech libraries (chrome) 
- Sound generation 
- Cryptocurrency apis (websocket feeds to the Binance Exchange) 
- Hyperloop client 
- Wikidata Queries 
- Medical Subject Headings (MeSH) Queries 

##### Deno 
- HTTP requests
- Hyperloop Server and Client 
- File IO 

