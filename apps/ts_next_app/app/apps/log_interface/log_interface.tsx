'use client';

import React, { useState, useEffect, useRef } from "react";

import { ChakraProvider } from '@chakra-ui/react'

import {
    Box,
    Button,
    FormControl,
    FormLabel,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Select,
    Flex, 
    Image,
    Avatar,
    Text, 
    shouldForwardProp,
    Container ,
    Grid,
    GridItem, 
    Divider, 
    Progress,
    CircularProgress, 
    List,
    ListItem,
    Textarea
} from "@chakra-ui/react";


import {
    Accordion,
    AccordionItem,
    AccordionButton,
    AccordionPanel,
    AccordionIcon,
} from '@chakra-ui/react'

import { AddIcon } from "@chakra-ui/icons";

import { chakra } from '@chakra-ui/react'
import { motion, isValidMotionProp } from 'framer-motion'
import * as tsw from "tidyscripts_web"


import styles from "../../../styles/Log_interface.module.css"
import RL from "../../../components/RotatingLogo"


interface LogObject {
  category: string;
    title: string;
    description: string;
    datetime: Date;
    tags: string[];
}

type LogFormProps  = any ; 

export default function LogForm(props: LogFormProps) {
    var { onSubmit } = props;
    
    const log = tsw.common.logger.get_logger({id:'lip'}) ;
    
    if ( ! onSubmit) {
	onSubmit = function(log : LogObject){
	    alert(JSON.stringify(log)) 
	}
    }

    
    
    let voice_result_handler =  async function(e :any) {
	log("Got recognition result!") 
	let text = e.detail.trim().toLowerCase()
	window.alert(text) 
    }

    var init = async function(){
	/*
	   Initializing configuration... 
	 */
	await tsw.common.asnc.wait_until(function(){
	    return true; 
	}, 3000, 500 ) ;
	// - 
	log(`Init script started...`) ;
	tsw.apis.local_storage.set_storage_header("tidyscripts")

	log(`Waiting...`) ;

	
	//tsw.util.voice_interface.initialize_recognition() ;
	log('did not started recognition');

	window.addEventListener('tidyscripts_web_speech_recognition_result' , voice_result_handler)
	

	
	/*
	   ------------
	 */

    } 

    useEffect( () => {
	init()
	return function result_cleanup() {
	    window.removeEventListener('tidyscripts_web_speech_recognition_result' , voice_result_handler)
	}
    })

    const [category, setCategory] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [datetime, setDatetime] = useState(new Date());
    const [tags, setTags] = useState<string[]>([]);

    const handleCategoryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
	setCategory(event.target.value);
    };

    const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
	setTitle(event.target.value);
    };

    const handleDescriptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
	setDescription(event.target.value);
    };

    const handleDatetimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
	setDatetime(new Date(event.target.value));
    };

    const handleTagsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
	const newTags = event.target.value.split(",");
	setTags(newTags);
    };

    const handleClearClick = () => {
	setCategory("");
	setTitle("");
	setDescription("");
	setDatetime(new Date());
	setTags([]);
    };

    const handleSaveClick = () => {
	const log: LogObject = {
	    category,
	    title,
	    description,
	    datetime,
	    tags,
	};
	(onSubmit as any)(log);
	handleClearClick();
    };

    const sz = "60px"
    const dm = "20px" 
    const logo_dims = { x : sz, y : sz }

							  return (
							  <ChakraProvider> 
	<Flex direction="column" align="center" justify="space-between" padding="40px" >


	    <Flex direction="row" justifyContent="space-between"   style={{width : "100%"}}>
		<Box>
		    <Text fontSize="2xl"> Log Input Panel </Text>
		</Box>
		<Box>
		    <RL logo_dims={logo_dims} />
		</Box>
	    </Flex>

	    <Divider marginTop={dm} marginBottom={dm} />
	    
	    <Grid marginTop="20px" templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={10}>
		<GridItem>



		    
		    <FormControl id="category" className={styles.formControl}>
			<FormLabel>Category</FormLabel>
			<Input
			    type="text"
			    value={category}
			    onChange={handleCategoryChange}
			    fontSize="lg"
			    size="sm"
			/>
		    </FormControl>

		</GridItem>

		<GridItem>		
		    
		    <FormControl id="title" className={styles.formControl} >
			<FormLabel>Title</FormLabel>
			<Input
			    type="text"
			    value={title}
			    onChange={handleTitleChange}
			    fontSize="lg"
			    size="sm"
			/>
		    </FormControl>

		</GridItem>		    

		<GridItem>		    
		    
		    <FormControl id="datetime" className={styles.formControl} >
			<FormLabel>Date and Time</FormLabel>
			<Input
			    type="datetime-local"
			    value={datetime.toISOString().substr(0, 16)}
			    onChange={handleDatetimeChange}
			    fontSize="sm"
			    size="sm"
			/>
		    </FormControl>
		</GridItem>


		<GridItem>		    		

		    <FormControl id="description" className={styles.formControl}>
			<FormLabel>Description</FormLabel>
			<Textarea
			    value={description}
			    onChange={handleDescriptionChange}
			    fontSize="lg"
			    rows={5}
			    resize="none"
			/>
		    </FormControl>
		</GridItem>		    


		<GridItem>		    				
		    <FormControl id="tags" className={styles.formControl}>
			<FormLabel>Tags</FormLabel>
			<Input
			type="text"
			value={tags.join(",")}
			onChange={handleTagsChange}
			fontSize="lg"
			size="sm"
			/>
		    </FormControl>

		</GridItem>		    		    


		<GridItem>		    						

		    <Grid templateColumns="repeat(2, 1fr)" gap={6} mt="8">
			<Button onClick={handleClearClick} variant="outline">
			    Clear
			</Button>
			<Button onClick={handleSaveClick} colorScheme="blue">
			    Save
			</Button>
		    </Grid>


		    
		</GridItem>

		
	    </Grid>
	</Flex>
	</ChakraProvider> 
    );
}
