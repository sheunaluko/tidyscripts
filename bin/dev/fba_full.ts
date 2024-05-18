import node from "../../packages/ts_node/dist/index";
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';


const serviceAccount = node.io.read_json(process.env['TIDYSCRIPTS_FIREBASE_KEY_LOC']) 

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function setData() {
  const data = { name: 'Los Angeles', state: 'CA', country: 'USA' };
  try {
    const res = await db.collection('cities').doc('LA').set(data);
    console.log('Document successfully written!', res);
  } catch (error) {
    console.error('Error writing document: ', error);
  }
}

setData();
