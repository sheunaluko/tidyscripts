import React from 'react';
import { Box, Typography } from '@mui/material';
import { useAssessment } from "./AssessmentContext";

import {cmp} from "./new_items" ;


const boxStyle = (bgColor: string) => ({
  backgroundColor: bgColor,
  border: '2px solid black',
  color: 'black',
  padding: '1%',
    width: '40%',
    height : "100%", 
  textAlign: 'center',
  borderRadius: '0px',

  position: 'relative',
  zIndex: 2,
});

const connectorBoxStyle = {
  border: '1px solid black',
  padding: '4px 8px',
  textAlign: 'center',
  color: 'black',
  fontWeight: 'bold',
  backgroundColor: 'white',
  zIndex: 2,
  position: 'relative'
};

const middleBoxStyle = {
  border: '1px solid black',
  padding: '4px 8px',
  textAlign: 'center',
  color: 'black',
    fontWeight: 'bold',
    mt : '5px' ,
    mb : '3px' ,     
  backgroundColor: 'white',

};

const Arrow = () => (
  <Box sx={{ fontSize: '24px', lineHeight: '4px', color: 'black', zIndex: 2  }}>↓</Box>
);

const HLINE = () => (
    <Box position="absolute" top="50%" left="0" right="0" marginLeft="20%" marginRight="20%" height="2px" bgcolor="black" zIndex={1} />
)

const MiddlePart = () => (

      <Box sx={{ height : "100%" , position : 'relative' }}>

        <Box sx={{
	    position : 'absolute' ,
	    fontSize: '24px',
	    lineHeight: '4px',
	    color: 'black',
	    top: '-15px', // move it above the main box
	    left: '50%',
	    transform: 'translateX(-50%)', // center horizontally
	    zIndex: 2
	}}>↓</Box>	
      <Box sx={middleBoxStyle}>
        <Typography>AND</Typography>
      </Box>

        <Box sx={{
	    position : 'absolute' ,
	    fontSize: '24px',
	    lineHeight: '4px',
	    color: 'black',
	    bottom: '-12px', // move it above the main box
	    left: '50%',
	    transform: 'translateX(-50%)', // center horizontally
	    zIndex: 2
	}}>↓</Box>	
      
      
      </Box> 



)

export const DeliriumDiagram = () => {

    const {features} = useAssessment() ; 
    
    let f1 = features['1'] ? 'red' :  cmp['f1'];
    let f2 = features['2'] ? 'red' :  cmp['f2']
    let f3 = features['3'] ? 'red' :  cmp['f3']
    let f4 = features['4'] ? 'red' :  cmp['f4']        

    
  return (
    <Box display="flex" flexDirection="column" alignItems="center" width="100%" position="relative" padding="4%">
      {/* Top Row with background line */}
      <Box width="100%" position="relative" display="flex" justifyContent="center" alignItems="center" mt={2} mb={1}>
      
	  <HLINE/>

        <Box display="flex" justifyContent="space-around" alignItems="center" width="100%" height="100%">
          <Box sx={boxStyle(f1)}>
            <Typography variant="body1">F1</Typography>
            <Typography variant="body2">Acute Change/Fluctuation</Typography>
          </Box>
          <Box sx={connectorBoxStyle}>
            <Typography>AND</Typography>
          </Box>
          <Box sx={boxStyle(f2)}>
            <Typography variant="body1">F2</Typography>
            <Typography variant="body2">Inattention</Typography>
          </Box>
        </Box>
      </Box>


      <MiddlePart/> 
      	  
      {/* Bottom Row with background line */}
      <Box width="100%" position="relative" display="flex" justifyContent="center" alignItems="center" mt={1}>

	  <HLINE /> 

        <Box display="flex" justifyContent="space-around" alignItems="center" width="100%" height="100%">
          <Box sx={boxStyle(f3)}>
            <Typography variant="body1">F3</Typography>
            <Typography variant="body2">Disorganized Thinking</Typography>
          </Box>
          <Box sx={connectorBoxStyle}>
            <Typography>OR</Typography>
          </Box>
          <Box sx={boxStyle(f4)}>
            <Typography variant="body1">F4</Typography>
            <Typography variant="body2">Altered Level of Consciousness</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default DeliriumDiagram;
