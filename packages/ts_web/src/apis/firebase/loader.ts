/**
 * Loads the firebase libraries into the web page 
 *
 * @packageDocumentation 
 */


import { add_script, add_css } from "../../util/index";
import { logger } from 'tidyscripts_common';

const log = logger.get_logger({ id: 'firebase_loader' });

export const libraries = {
  'app': "https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js",
  'auth': "https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js",
  'firestore': "https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js",
  'ui': "https://www.gstatic.com/firebasejs/ui/6.0.1/firebase-ui-auth.js",
  'ui_css': "https://www.gstatic.com/firebasejs/ui/6.0.1/firebase-ui-auth.css",
}

export async function load_firebase_app() { return add_script(libraries.app) }
export async function load_firebase_auth() { return add_script(libraries.auth) }
export async function load_firebase_ui() { return add_script(libraries.ui) }
export async function load_firebase_firestore() { return add_script(libraries.firestore) }
export async function load_firebase_ui_css() { return add_css(libraries.ui_css) }



export async function load_all() {

  log("Loading firebase resources");
  await load_firebase_app()
  await Promise.all([
    load_firebase_auth(),
    load_firebase_ui(),
    load_firebase_ui_css(),
    load_firebase_firestore(),
  ]);
  log("Done")
} 
