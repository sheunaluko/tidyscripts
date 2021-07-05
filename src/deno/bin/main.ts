
/*
  Default deno script which runs when in top level directory and call ./bin/run

  This file will be in the GITIGNORE
  So that your own local script does not get pushed to the main repository (or overwritten by one there)
  Add your machine specific code below this line
   - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
*/

import("./hyperloop_respawner.ts").then( (mod :any) => {
	log("Imported respawner  module")
})
