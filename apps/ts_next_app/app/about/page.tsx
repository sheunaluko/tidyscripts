'use client';

import type { NextPage } from 'next'
import styles from '../../styles/About.module.css'

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
  Flex , 
  Card,
} from "@chakra-ui/react";



const Component: NextPage = (props : any) => {

  return (

    <>
      <h1 className={styles.title}>
	<a href="https://github.com/sheunaluko/tidyscripts"> { "Tidyscripts" } </a>
      </h1>

      <p className={styles.description}>
	Tidyscripts is a medical software company that specializes in full stack web application development for healthcare providers and patients. 
      </p>

      <p className={styles.description}>
	We leverage our open source Typescript software library (Tidyscripts) to quickly and reliably develop new Mobile Health apps for stakeholders within the healthcare industry, starting with patients and providers. 
      </p>

      <p className={styles.description}>
	The founder of Tidyscripts is
	
	<a href="https://www.linkedin.com/in/sheun-aluko/"> { "Dr. Sheun Aluko, MD" } </a>. He completed his medical training at Stanford University School of Medicine, in addition to a Masters in Biomedical Informatics from Stanford and a Bachelors in Biomedical Engineering from Washington University in St. Louis. Currently, Dr. Aluko is a 3rd year Internal Medicine physician at Barnes-Jewish Hospital in St. Louis. 
      </p>


    </>
  )
}

export default Component
