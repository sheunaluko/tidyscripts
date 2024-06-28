import React from 'react';


export default function useInit(args: any) {

  let { init, clean_up } = args;

  /* initialization function patttern */
  React.useEffect(() => {
    //create and call a wrapper async functon 
    (async function _init() { await (init as any)() })()
    //return the clean up listender 
    return (clean_up as any)

  }, []);

}

