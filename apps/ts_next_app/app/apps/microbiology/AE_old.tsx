'use_client' ; 

import React from "react";
import { useState } from "react";
import * as tsw from "tidyscripts_web";
import * as mui from "../../../src/mui";
import Context from "../../../components/AntibioticsContext";
import SelectionPanel from "../../../components/SelectionPanel" 

import * as sanford from "../../../src/sanford" 

let {
    Container,
    FormControlLabel,
    FormLabel, 
    RadioGroup, 
    Radio, 
    Divider, 
    Checkbox,
    Grid,
    Paper,
    AddCircleOutlineIcon,
    Link,
    TextField,
    Box,
    FormControl,
    FormHelperText,
    Breadcrumbs,
    Tabs,
    Tab,
    Chip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    ExpandMoreIcon,
    FaceIcon,
    IconButton,
    Icon,
    InputLabel,
    OutlinedInput,
    InputAdornment,
    DoneIcon,
    Avatar,
    Button,
    Visibility,
    VisibilityOff,
    createTheme , 
} = mui;

let fp = tsw.common.fp;
let log = tsw.common.logger.get_logger({id : "antibiogram"}) ; 

declare var window: any;

/*
   abx
 */

let ABX_DB =  {} //tsw.apis.db.GET_DB("ABX") ; 

let sizes = { 
    w1 : "20%" , 
    w2 : "80%" , 
    h1 : "20%" , 
    h2 : "80%" , 
    row_height : "10%" , 
    col_width  : "50px" , 
} 


function EditorPanel() {
    
    return ( 
	<Context.Consumer >
	{function({ state, setState }) {
	    
	    let set_mode = function(m : any) {
		setState( (s:any) => ({...state,editor_mode: m}))
	    } 
	    
	    return ( 
		<Box>
		    Editor Mode:  

		    <FormControl component="fieldset">
			<RadioGroup row aria-label="position" name="position" value={state.editor_mode} onChange={m=>set_mode( (m.target as any).value   )}>
			    <FormControlLabel
			    value="R"
			    control={<Radio color="primary" />}
			    label="Recommended"
			    labelPlacement="end"
			    />
			    <FormControlLabel
			    value="A"
			    control={<Radio color="primary" />}
			    label="Active"
			    labelPlacement="end"
			    />
			    <FormControlLabel
			    value="V"
			    control={<Radio color="primary" />}
			    label="Variable"
			    labelPlacement="end"
			    />
			    
			    <FormControlLabel
			    value="N"
			    control={<Radio color="primary" />}
			    label="Not Recommended"
			    labelPlacement="end"
			    />
			    
			    <FormControlLabel
			    value="X"
			    control={<Radio color="primary" />}
			    label="Not Active"
			    labelPlacement="end"
			    />
			    
			    <FormControlLabel
			    value="?"
			    control={<Radio color="primary" />}
			    label="Insufficient Info"
			    labelPlacement="end"
			    />			    
			    
			    
			    
			    
			</RadioGroup>
		    </FormControl>
		</Box>
	    ) 
	}
	}
	</Context.Consumer> 
    )
}

export default function Component() {
    
    const theme = createTheme()  ; 
    const [state, setState] = React.useState<any>({
	editor_mode : "N" , 
	block_states : {},  //holds block states :) 
    });
    
    const [curr_abx,set_abx] = React.useState<any>([])
    const [curr_orgs,set_orgs] = React.useState<any>([])    
   
    
    let change_fn  = function(type : string) {
	return  (cdata : any) => { 
	    log(`Detected ${type} change... recomputing...`)
	    log(cdata) 
	    let {selections,mode} = cdata
	    if ( type == "abx") { 
		var list = sanford.get_abx_list(selections,mode)
		set_abx(list)
	    } else if ( type == "orgs") { 
		var list = sanford.get_org_list(selections,mode)
		set_orgs(list)
	    }
	    // @ts-ignore 
	    log(`Set ${type}: ${list.join(" ")}`)
	} 
    } 
    
    let {abx_classes,
	 orgs_classes,
	 all_orgs, 
	 all_abx } = sanford ; 
    
    React.useEffect( ()=>  { 
	log("Loading all stored abx info...");
	(async function go() {
	    //attempt to retrieve all the states
	    let block_states =  {}  // await ABX_DB.get("block_states")   
	    setState( (s:any) => ( { 
		...s, 
		block_states : (block_states || {})
	    }) ) 
	    log("Done loading all stored abx info...")
	})() 
    } , [] ) 
    
    
    /*    
       
       Link the scroll bars now ! ( https://stackoverflow.com/questions/31084136/how-to-bind-multiple-elements-to-scroll-together ) 
       
     */ 
    
    function link_scrollers_of_class(scroll_class : string ) { 
	
	var scrollers = document.getElementsByClassName(scroll_class);
	

	
	var scrollerDivs = Array.prototype.filter.call(scrollers, function(testElement : any) {
	    return testElement.nodeName === 'DIV';
	});
	
	
	function scrollAllLeft(scrollLeft :any) {
	    scrollerDivs.forEach(function(element : any, index  : any , array  :any ) {
		element.scrollLeft = scrollLeft;
	    });
	} // - - - > 
	
	/* - - - */ 
	function scrollAllTop(scrollTop : any) {
	    scrollerDivs.forEach(function(element : any, index : any, array : any) {
		element.scrollTop = scrollTop;
	    });
	}
	
	/* - - -  */ 
	scrollerDivs.forEach(function(element : any, index : any, array : any) {  
	    
	    if (scroll_class == "h-scroll") {
		// @ts-ignore 
		console.log(`Got ${fp.len(scrollers)} scrollers LEFT`)		
		element.addEventListener('scroll', function(e : any) {
		    scrollAllLeft(e.target.scrollLeft);
		});
		return 
	    } 
	    
	    if (scroll_class == "v-scroll") {
		// @ts-ignore 
		console.log(`Got ${fp.len(scrollers)} scrollers UP`)
		element.addEventListener('scroll', function(e : any) {
		    scrollAllTop(e.target.scrollTop);
		});
		return 
	    } 
	    
	});
	
    } 
    
    React.useEffect(  ()=> { 
	console.log("Linking scroll bars") // -
	link_scrollers_of_class("v-scroll")
	link_scrollers_of_class("h-scroll")	
    }, [] ) 

    return (
	<Context.Provider value={{ state, setState }}>
	    
	    <Box style={{display :"flex", 
			 flexDirection :"row"  , 
			 padding : "10px" , 
			 boxSizing: 'border-box' , 
			 overflow :"hidden"  }}>
		
		<Box
		    style={{
			backgroundColor: theme.palette.background.paper,
			padding: "2%",
			borderRadius: "15px" ,
			width: "16%", 
			overflow : "auto" 
		    }}
		>
		    
		    <SelectionPanel
			init_classes={{
			    'Gram Positive' : true , 
			}}
		        init_mode="Or" 
			all_classes={orgs_classes} 
			title="Organisms"
			on_change={change_fn("orgs")}
		    />
		    
		    <br/>
		    
		    <SelectionPanel
			init_classes={{
			    Penicillins : true, 
			}}
			all_classes={abx_classes} 
			title="Antimicrobials"
			init_mode="Or"
			on_change={change_fn("abx")}  
		    />	
	
		    <Divider /> 
		    <br /> 
		    <EditorPanel /> 
		    
		    
		</Box>
		
		<Box style={{ 
		    display: "flex", 
		    flexDirection: "column" , 
		    minWidth  : "1%" ,
		}}>	    
		</Box>
		
		
		<Box
		    style={{
			backgroundColor: theme.palette.background.paper,
			padding: "2%",
			borderRadius: "15px" , 
			width : "83%" , 
			overflow : "hidden" 			
		    }}
		>
		    
		    {/*surrounding box */} 
	<Box style={{ 
	    display: "flex", 
	    flexDirection: "row" , 
	    width : "100%" , 
	    height : "100%" , 
	}}>

	    {/*left panel */} 
	    <Box style={{ 
		display: "flex", 
		flexDirection: "column" , 
		width  : sizes.w1 ,  
	    }}>
		
		{/*top left */} 
                <Box style={{ height : sizes.h1  }}> 
		</Box>

		{/*bottom left */} 			    
                <Box  
		    className="v-scroll"				
		    style={{ 
			height : sizes.h2, 

			overflow : "auto" , 
		    }}> 
		    { LEGEND_COLUMN(curr_orgs  ) } 				
		</Box>
		
	    </Box> 

	    
	    {/*right panel */} 			    			
	    <Box style={{ 
		display: "flex", 
		flexDirection: "column" , 
		width : sizes.w2 , 
	    }}>
		
		{/*top right */} 			    			    
                <Box 
		    className="h-scroll"					    
		    style={{ 
			height : sizes.h1 , 
			display : "flex"  , 
			flexDirection : "row", 
			overflow  :"auto" , 
		    }}> 
		    
		    { /* vertical abx names  */ } 
		    { curr_abx.map( (abx:any) => <React.Fragment key={abx}> {ABX_HEADER(abx)} </React.Fragment>) } 
		</Box>
		
		{/*bottom right */} 			    			    
		<Box 
		    className="h-scroll v-scroll"						    		    
		    style={{ 
			display: "flex", 
			flexDirection: "row" , 
			overflow : "auto", 
			height : sizes.h2 , 
		    }}>
		    
		    {
			
			curr_abx.map( (abx :any) => ABX_SELECT_COLUMN(abx, curr_orgs  ) ) 
			
		    } 
		    

		    
		</Box>
		
	    </Box>
	</Box> 
	


	
	    </Box>
	    </Box>
	</Context.Provider>
    );
}



function ABX_HEADER(abx : string) { 
    
    return (
	
	<Box style={{  
	    width : sizes.col_width, 
	    minWidth : sizes.col_width, 	    
	    display :'flex', 
	    flexDirection : 'column', 
	    alignItems : 'center'  }} > 
	
	<Box> 
	    <p 
	    style={{
		//transform: "rotate(180deg)" , 			  
		writingMode :   "vertical-rl" , 			  
	    }} >
		{abx} 
	    </p>		
	</Box>
	
	    </Box>

    ) 
    
} 

function ABX_SELECT_COLUMN(abx : string , rnames : string[]) { 
    
    return (
	<Box key={abx} 
	    style={{ 
	    display:"flex", 
	    flexDirection :"column" ,
	    width  : sizes.col_width , 
	    minWidth : sizes.col_width, 
	}}>
	{ 
	    rnames.map( (i:any)=>   <React.Fragment key={i + "_fragment_select"} > {SELECT_BLOCK(abx,i)} </React.Fragment>  ) 
 	} 
        </Box>
    ) 
    
} 

function LEGEND_COLUMN(rnames : string[] ){
    return ( 
	<Box  style={{width : "100%" , height : "100%" }}> 
	    { 
		
		rnames.map((i: any) =>  <React.Fragment key={i + "_fragment_legend"}> {LEGEND_BLOCK(i)} </React.Fragment>  ) 
		
	    } 
	</Box> 
    ) 
} 



function LEGEND_BLOCK(i :string) {
    return (
	<Box style={{ 
	    height : sizes.row_height , 
	    minHeight : sizes.row_height , 	    
	    display: "flex" , 
	    alignItems : "center" , 
	}}> 
	    <Box>
		{i}
	    </Box>
	</Box> 
    ) 
} 



function SELECT_BLOCK(abx : string, i :string) {
    
    let color_map = { 
	'N' : 'red' , 
	'V'  : 'yellow', 
	'A'  : 'green'  , 
	'R'  : 'blue' , 
	'?'  : 'gray' , 
	'X' : 'gray' , 
    } 
    
    let id = `${abx}_${i}` ;     
    
    return (
	<Context.Consumer >
	{function({ state, setState }) {
		
		let select_click = async function() {
		    let edit_mode = state.editor_mode ;

		    setState( (s:any) => { 
			let new_state = fp.clone(s) 
			//update the state 
			new_state.block_states[id] = edit_mode 
			//update the state object in the background 
			//ABX_DB.set("block_states",new_state.block_states).then( ()=> console.log(`Edited block state for ${abx}_${i} to ${edit_mode} and saved to db`) ) 
			//and set it 
			return new_state
		    }) 
		    
		 } 
	    
	    //let mouse_over = select_click
	    let mouse_over = ()=>null ; 	    
	    
	    
	    return ( 
		<Box style={{  
		    height : sizes.row_height , 
		    minHeight : sizes.row_height , 	    
		    display :'flex', 
		    flexDirection : 'column', 
		    justifyContent : 'center', 
		    boxSizing : "border-box", 
		    padding : "12px",  		       
		    alignItems : 'center'  }} > 
		    {
			// @ts-ignore 
			 state.block_states[id] ?   (<button onMouseOver={mouse_over} onClick={select_click} style={{width : "100%", height : "100%" , backgroundColor : color_map[state.block_states[id]]  }} type="button">  { state.block_states[id] } </button>)  :  (<button onMouseOver={mouse_over} onClick={select_click} style={{width : "100%", height : "100%"}} type="button"> - </button>)  
		     } 

		</Box>
		 ) 
	}}
	</Context.Consumer> 
    )
} 
