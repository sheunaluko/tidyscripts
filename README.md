# tidyscripts
##### A tidy collection of web and server (deno) typescript libraries 

- Both web and server code share a common codebase at src/common, allowing the effective re-use of typescript code! 
- There is an automated build script at bin/build_web_module which will run the typescript compiler then package the web libraries (including their src/common dependencies) into a npm package ready for distribution or use locally via "yarn|npm link"
- In order for the src/common modules to work with both Deno and npm, the .ts extensions are stripped by the build script when the web package is generated 
- Deno files can be imported directly from the src/deno folders without any necessary compilation 

#### Currently included libraries: 

##### Common
- functional programming with objects, strings, arrays 
- date object manipuluation 
- asynchronous helpers 

##### Browser
- speech recognition and text to speech libraries (chrome) 
- sound generation 

##### Deno 
- http requests

