
import { initializeApp } from 'firebase/app';
//import { getFirestore, collection, getDocs, setDoc, doc } from 'firebase/firestore/lite';
import { getFirestore, collection, getDocs, setDoc, doc } from 'firebase/firestore';
// Follow this pattern to import other Firebase services

/* define the  Firebase config object  */ 
const firebaseConfig = {
  apiKey: "AIzaSyByjw-kqCpeYXQpApAeUU3GAnh1WfSQd7I",
  authDomain: "tidyscripts.firebaseapp.com",
  projectId: "tidyscripts",
  storageBucket: "tidyscripts.appspot.com",
  messagingSenderId: "292052354057",
  appId: "1:292052354057:web:77fa4743a205deb40764d8",
  measurementId: "G-4SJGBBQWW2"
};



const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get a list of cities from your database
export async function getCities() {
  const citiesCol = collection(db, 'cities');
  const citySnapshot = await getDocs(citiesCol);
  const cityList = citySnapshot.docs.map(doc => doc.data());
  return cityList;
}


export async function store() {

    const citiesRef = collection(db, "cities");
    
    await setDoc(doc(citiesRef, "SF"), {
	name: "San Francisco", state: "CA", country: "USA",
	capital: false, population: 860000,
	regions: ["west_coast", "norcal"] });
    await setDoc(doc(citiesRef, "LA"), {
	name: "Los Angeles", state: "CA", country: "USA",
	capital: false, population: 3900000,
	regions: ["west_coast", "socal"] });
    await setDoc(doc(citiesRef, "DC"), {
	name: "Washington, D.C.", state: null, country: "USA",
	capital: true, population: 680000,
	regions: ["east_coast"] });
    await setDoc(doc(citiesRef, "TOK"), {
	name: "Tokyo", state: null, country: "Japan",
	capital: true, population: 9000000,
	regions: ["kanto", "honshu"] });
    await setDoc(doc(citiesRef, "BJ"), {
	name: "Beijing", state: null, country: "China",
	capital: true, population: 21500000,
	regions: ["jingjinji", "hebei"] }) ; 

}

