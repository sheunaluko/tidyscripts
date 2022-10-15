import React, {useState, useEffect} from 'react' 
import { useTheme } from '@material-ui/core/styles';

import * as mui from "./list" 

let { 
    Container , 
    MicIcon, 
    MicOffIcon, 
    IconButton, 
    
} = mui  


/* 
   
   1. Button for initializing mic and stopping the mic 
   2. feedback panel which listens to 'tidyscripts_web_mic' event for the audio power
   3. window.addEventListener( 'tidyscripts_web_speech_recognition_result' , (e) => e.detail ) 
   To get the recognition result 
   4. also handle the ON SOUND STarted event to give the user feedback 
   
   5. two tabs -- one tab for TTS -> allow user to select the voice and save this to local storage 
      -- need a local storage API! 


 */ 

export default function Component() { 
    
    const theme = useTheme();    
    
    const [state,setState] = useState({  
	listening : false , 
	text : "..." , 
    }); 
    
    
    useEffect( () => { 
	window.addEventListener('tidyscripts_web_speech_recognition_result' , async function(e :any) {
	    console.log("Got recognition result!") 
	    let text = e.detail.trim().toLowerCase()
	    console.log(text) 
	    setState({...state, text : text}) 
	})

    }, []); 
    
    return ( 
	
	
	<Container> 
	    
	    
	    <div style={{ 
		backgroundColor : theme.palette.background.paper , 
		padding : "2%",  
		borderRadius : "15px",
		
 	    }}>	   
		
		<div> 
		     Voice Panel  
		</div>
		
		<div>
		    <IconButton onClick={()=>setState({...state, listening: !state.listening})} > 
			{ 
			    state.listening? <MicIcon/> : <MicOffIcon/> 
			} 
		    </IconButton>
		    
		    <svg width = "150px" height = "200px" viewBox = "0 0 100 100">
			<path stroke = "#00FF00" fill = "none" d = "M0,0 C36.42,0,70.58,100,100,100" />
		    </svg>
		    
		    
		    
		</div>
		
	    </div>
		
		
	</Container> 
    )

}
