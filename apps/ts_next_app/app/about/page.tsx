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
	We leverage our open source Typescript software library (Tidyscripts) to quickly and reliably develop new Health Applications for stakeholders within the healthcare industry, starting with patients and providers. 
      </p>

      <p className={styles.description}>
	The founder of Tidyscripts is
	
	<a href="https://www.linkedin.com/in/sheun-aluko/"> { "Dr. Sheun Aluko, MD." }</a> After completing a degree in Biomedical Engineering from Washington University in St. Louis, he attended Stanford for Medical School and for a Masters in Biomedical Informatics. Currently, Dr. Aluko is an Internal Medicine Hospitalist Physician at Barnes-Jewish Hospital in St. Louis, where he completed his residency training in Internal Medicine.
      </p>


    </>
  )
}

export default Component
