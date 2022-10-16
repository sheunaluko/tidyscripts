import type { NextPage } from 'next'
import {useEffect} from 'react' ; 
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

import * as tsn from "tidyscripts_node" ;
import * as tsw from "tidyscripts_web"  ; 


const msgs = ["Tidyscripts", "ok"]  ;


export async function getStaticProps(context :any) {

  return {
      props: {msg :  tsn.common.fp.first(msgs) },
  }
}

declare var window : any ;

const Home: NextPage = (props : any) => {

    useEffect( ()=>{
        Object.assign(window, {
            tsw , 
        })
    },[])

  return (
    <div className={styles.container}>
      <Head>
        <title>Tidyscripts</title>
        <meta name="description" content="A typescript developer oasis" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to <a href="https://github.com/sheunaluko/tidyscripts"> { props.msg } </a>
        </h1>

        <p className={styles.description}>
          An elegant tool for {' '}
          <code className={styles.code}>builders</code>
        </p>

        <div className={styles.grid}>
          <a href="/docs" className={styles.card}>
            <h2>Documentation &rarr;</h2>
            <p>Explore Tidyscripts features and API.</p>
          </a>

          <a
            href="https://github.com/sheunaluko/tidyscripts"
            className={styles.card}
          >
            <h2>Github &rarr;</h2>
            <p>
              See the source. 
            </p>
          </a>
        </div>
      </main>

      <footer className={styles.footer}>
        <a
          href="https://sheunaluko.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Created by Sheun Aluko MD-MS, using {' '}
          <span className={styles.logo}>
	    {(()=> {
	      let y = 20 ;
	      let x = Math.floor(1*y) ; 
	      return (
		<Image src="/tidyscripts_logo.png" alt="Tidyscripts Logo" width={x} height={y} />)})()}
          </span>
	  {'   '}     Tidyscripts
        </a>
      </footer>
    </div>
  )
}

export default Home
