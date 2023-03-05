import React, { useState, useEffect, useRef } from "react";

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




interface LogObject {
  category: string;
  title: string;
  description: string;
  datetime: Date;
  tags: string[];
}

interface LogFormProps {
  onSubmit: (log: LogObject) => void;
}

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

	
	tsw.util.voice_interface.initialize_recognition() ;
	log('started recognition');

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
    }, [])

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
    onSubmit(log);
    handleClearClick();
  };

  return (
      <Box padding="20px">

       
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
      <GridItem>
      <FormControl id="category" >
      <FormLabel>Category</FormLabel>
      <Input
      type="text"
      value={category}
      onChange={handleCategoryChange}
              fontSize="lg"
              size="sm"
            />
          </FormControl>
          <FormControl id="title" >
            <FormLabel>Title</FormLabel>
            <Input
              type="text"
              value={title}
              onChange={handleTitleChange}
              fontSize="lg"
              size="sm"
            />
          </FormControl>
          <FormControl id="datetime" >
            <FormLabel>Date and Time</FormLabel>
            <Input
              type="datetime-local"
              value={datetime.toISOString().substr(0, 16)}
              onChange={handleDatetimeChange}
              fontSize="lg"
              size="sm"
            />
          </FormControl>
        </GridItem>
        <GridItem>
          <FormControl id="description" >
            <FormLabel>Description</FormLabel>
            <Textarea
              value={description}
              onChange={handleDescriptionChange}
              fontSize="lg"
              rows={5}
              resize="none"
            />
          </FormControl>
          <FormControl id="tags">
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
</Grid>
<Grid templateColumns="repeat(2, 1fr)" gap={6} mt="8">
<Button onClick={handleClearClick} variant="outline">
Clear
</Button>
<Button onClick={handleSaveClick} colorScheme="blue">
Save
</Button>
</Grid>
</Box>
);
}
