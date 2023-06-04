// imports
import * as tsw from "tidyscripts_web";
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithRedirect } from "firebase/auth";
import {
  GoogleAuthProvider,
  GithubAuthProvider,
  FacebookAuthProvider
} from "firebase/auth";

const log = tsw.common.logger.get_logger({ id: 'firebase' });

// Firebase config 
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyByjw-kqCpeYXQpApAeUU3GAnh1WfSQd7I",
  authDomain: "tidyscripts.firebaseapp.com",
  projectId: "tidyscripts",
  storageBucket: "tidyscripts.appspot.com",
  messagingSenderId: "292052354057",
  appId: "1:292052354057:web:77fa4743a205deb40764d8",
  measurementId: "G-4SJGBBQWW2"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

/* Configure providers */
const GoogleProvider = new GoogleAuthProvider();
const FacebookProvider = new FacebookAuthProvider();
const GithubProvider = new GithubAuthProvider();

/* Create sign in functions for export */
export function google_sign_in() { signInWithRedirect(auth, GoogleProvider) }
export function facebook_sign_in() { signInWithRedirect(auth, FacebookProvider) }
export function github_sign_in() { signInWithRedirect(auth, GithubProvider) }
/*

declare var window: any;
export var scripts_loaded = false;
export var app_initialized = false;
export var app: any = null;

export async function load_firebase() {
  if (scripts_loaded) { log(`already loaded the firebase resources`) } else {
    await tsw.apis.firebase.loader.load_all();
    scripts_loaded = true;
  }
  //now the firebase resources are available in the global scope for all pages 
}

export async function init_firebase_app() {
  await load_firebase();
  app = window.firebase.initializeApp(firebaseConfig);
  log(`Firebase app initialized`)
  app_initialized = true;
  return app
}


export async function firebase_app_initialized() {
  if (app_initialized) { return true } else {
    await init_firebase_app()
    return true;
  }
}

*/
