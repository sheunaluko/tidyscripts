import React from 'react' ;
import { Metadata } from 'next';
import ChakraProvider from './chakra_provider'
import styles from '../styles/Layout.module.css'
import TFooter from '../components/Footer' ;


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

	  <div className={styles.container}>

	    <main className={styles.main}>

              {children}
	      
	    </main>

	  </div>

	  <TFooter/>
	  
	</ChakraProvider>
      </body>
    </html>
  );
}