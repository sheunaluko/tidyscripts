

import React from 'react' 
import { useTheme } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';


export default function Component() { 
    
    const theme = useTheme();    
    
    return ( 
	
	<Container> 
	    
	    
	    <div style={{ 
		backgroundColor : theme.palette.background.paper , 
		padding : "2%",  
		borderRadius : "15px",
		
 	    }}>		
		<div> 
		    VOICE PANEL 3 
		</div>
		
	    </div>
	</Container> 
    ) 

} 
