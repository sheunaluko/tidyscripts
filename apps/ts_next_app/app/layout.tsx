import React from 'react' ;
import { Metadata } from 'next';
import ChakraProvider from './chakra_provider'
import styles from '../styles/Layout.module.css'


import Footer from '../components/Footer' ; //the footer component contains the drawer as well
import Toast from '../components/Toast'

import { Analytics } from '@vercel/analytics/react';



export const metadata: Metadata = {
  title: 'Tidyscripts',
  description : 'A typescript developer dream' 
};


export default function RootLayout({
  // Layouts must accept a children prop.
  // This will be populated with nested layouts or pages
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
	<ChakraProvider>

	  <div style={{display: 'flex', flexDirection: 'column' , minHeight : "100vh" }}>

	    <main className={styles.main} >

              {children}

	      
	      
	    </main>

	    <Footer/>
	    <Toast/> 
	    
	  </div>


	  
	</ChakraProvider>
	<Analytics />
      </body>
    </html>
  );
}
