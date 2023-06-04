// imports
import * as tsw from "tidyscripts_web";
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithRedirect, signOut } from "firebase/auth";
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


/* Create signout functions for export */
export function log_out() {
  const auth = getAuth();
  signOut(auth).then(() => {
    // Sign-out successful.
    log("User signed out")
  }).catch((error) => {
    // An error happened.
    log("Signout error")
  });
}

