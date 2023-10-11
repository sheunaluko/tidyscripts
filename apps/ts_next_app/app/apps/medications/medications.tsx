'use client';

import type { NextPage } from 'next'

import {useEffect, useState } from 'react' ;
import React from 'react' ; 
import styles from '../../../styles/Default.module.css'


import * as tsw from "tidyscripts_web" ; 

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import Button from '@mui/material/Button';

import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';

import { ThemeProvider, createTheme } from '@mui/material/styles';
//import { ThemeProvider as Emotion10ThemeProvider } from 'emotion-theming';

const defaultTheme = createTheme(); // or your custom theme

const log = tsw.common.logger.get_logger({id : 'medications'}) ; 


import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';

import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider'; 


const R = tsw.common.R ; 


const Component: NextPage = (props : any) => {


  let init =  async function() {
    
    await tsw.common.apis.medications.init() ; 
    log('medications component loaded')

    var meds = tsw.common.apis.medications ;

    let side_effect_options = (R.keys(meds.index) as string[]).map( (se:string) => (
      {name: se}
    ))

    setMedications(meds.medications) ;
    setMedicationSideEffects(side_effect_options) ;
    setMedicationIndex(meds.index) ; 

    Object.assign(window,  {
      tsw , meds , R 
    })
    
  }

  let [medications,setMedications] = React.useState([] as any) ;
  let [medicationIndex,setMedicationIndex] = React.useState(null as any) ;
  let [medicationSideEffects,setMedicationSideEffects] = React.useState([] as any) ;


  let [selectedSideEffects,setSelectedSideEffects] = React.useState([] as any) ;
  let [selectedMedications,setSelectedMedications] = React.useState([] as any) ;

  let [resultsFilter,setResultsFilter] = React.useState(null as any) ;         

  
  let MedSelect = function() {
    return (
      <Stack spacing={3} >


	<Autocomplete
          multiple
          id="tags-outlined"
          options={medications}
          getOptionLabel={(option : any) => option.name}
          filterSelectedOptions


	  value={selectedMedications}
	  // @ts-ignore 
	  onChange={(event: any, newValue: string | null) => {
            //console.log(newValue) ;
	    setSelectedMedications(newValue) ; 
          }}


	  renderTags={(tagValue : any, getTagProps : any) => {
	    return tagValue.map((option : any, index : any) => (
              <Chip {...getTagProps({ index })} key={option.name} label={option.name} />
	    ))
	  }}

	  renderOption={(props : any, option : any) => {
	    return (
	      <li {...props} key={option.name}>
		{option.name}
	      </li>
	    );
	  }}
	
          renderInput={(params : any) => (
            <TextField
              {...params}
	      key={params.key}
              label="All"
              placeholder=""
            />
          )}
	/>
	
	
      </Stack>
    );
  }

  let SeSelect = function() {
    return (
      <Stack spacing={3} >


	<Autocomplete
          multiple
          id="tags-outlined"
          options={medicationSideEffects}
          getOptionLabel={(option : any) => option.name}
          filterSelectedOptions
	value={selectedSideEffects}
	  // @ts-ignore 
	  onChange={(event: any, newValue: string | null) => {
            //console.log(newValue) ;
	    setSelectedSideEffects(newValue) ; 
          }}
	  renderTags={(tagValue, getTagProps) => {
	    return tagValue.map((option, index) => (
              <Chip {...getTagProps({ index })} key={option.name} label={option.name} />
	    ))
	  }}

	  renderOption={(props, option) => {
	    return (
	      <li {...props} key={option.name}>
		{option.name}
	      </li>
	    );
	  }}
	
          renderInput={(params : any) => (
            <TextField
              {...params}
	      key={params.key}
              label="Select"
              placeholder=""
            />
          )}
	/>
	
	
      </Stack>
    );
  } 
  
  //let a_button = <Button variant="contained">Hello world</Button>


  let RowRadioGroupMaker = function( labels : string[] ) {

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      //console.log((event.target as HTMLInputElement).value);
      setResultsFilter( (event.target as HTMLInputElement).value) ; 
    };
    
    return (
      <FormControl>
	<FormLabel id="demo-row-radio-buttons-group-label">Frequency</FormLabel>
	<RadioGroup
          row
          aria-labelledby="demo-row-radio-buttons-group-label"
          name="row-radio-buttons-group"
	  onChange={handleChange}
	  value={resultsFilter}
	>
	  {labels.map( (l:string)=> <FormControlLabel value={l} key={l} control={<Radio />} label={l} /> )}
	</RadioGroup>
	<br/> 
      </FormControl>
    );
  }

  

  
  let MakeResultPanel = function(se : any) {

    let name = se.name; 

    // @ts-ignore
    let candidates = meds.index[name]
    //console.log(name)
    //console.log(meds.index[name])

    //let x1 = Object.entries(candidates) ;
    //let freqs = x1.map( (y:any)=> y[0] ).filter( (y:any)=> y.match( new RegExp(">10%:|1% to 10%:|2% to 10%") )  ) ;

    let Panel = function() {
      if ( resultsFilter && candidates[resultsFilter] ) {

	return (
	  <Box key={name}>
	    <Divider />	  
	    <p className={styles.blue}>{name}</p>
	    <Divider />
	    {
	      candidates[resultsFilter].map( (m:string) =>
		{
		  if (selectedMedications.length == 0  || selectedMedications.map( (med:any)=>med.name).includes(m) ) {
		    return (
		      <p key={m}>
			<a href={`https://www.uptodate.com/contents/${m}-drug-information`}>{m}</a>
		      </p>
		    )
		  } else {return null}
		}
	      )
	    }
	    <br/>
	  </Box>
	)
	
      } else {
	return null 
      }
    }

    return <Panel key={name} /> 
  }


  
  let Results = function() {

    /*
       ----- 
     */

    let freqs = [">10%:", "1% to 10%:", "2% to 10%:"]
    
    if ( ! selectedSideEffects.length ) {
      return <></>
    } else  { 

      return (
	<>
	  <p>
	    Results
	  </p>

	  <br /> 

	  <Box>

	    { RowRadioGroupMaker(freqs) }

	    <br/> 

	    {
	      selectedSideEffects.map(MakeResultPanel)
	    } 

	    
	  </Box>
	</> 
      )
    }
  }

  useEffect(  ()=> {init()} , [] ) ; //init script

  return (
  <ThemeProvider theme={defaultTheme} >
    <Box >

      <p className={styles.title}>
	Medication <a href="https://github.com/sheunaluko/tidyscripts">Analyzer </a>
      </p>

      <br />
      
      <p> 
        Select Side Effects
      </p>

      <br /> 

      <SeSelect />

      <br />       

      <p> 
        Filter By Medications 
      </p>

      <br /> 

      <MedSelect />

      <br />

      <Results />

      
      
      

      

    </Box>
  </ThemeProvider> 

  )
}

export default Component



