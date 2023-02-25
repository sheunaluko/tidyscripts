import React, { useState, useEffect } from "react";

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
    shouldForwardProp
} from "@chakra-ui/react";

import { chakra } from '@chakra-ui/react'
import { motion, isValidMotionProp } from 'framer-motion'

import RL from './RotatingLogo' ; 


const VIP = () => {
    
    useEffect(() => {
    }, []);

    return (
	<Flex padding="20px" direction="column" align="center" >
	    <Box>
		<h1>Voice interface panel</h1>
		<br/>
		Please create a rotating Tidyscripts logo

		<Box marginTop="20px">
		    <RL />
		</Box>
	    </Box>
	</Flex>
    );
};

export default VIP;
