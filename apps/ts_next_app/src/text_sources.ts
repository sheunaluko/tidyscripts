import {hyponatremia}  from "./dp" 

const textSources = [
  {
    content: hyponatremia,
    metadata: { provenance: "Deranged Physiology", category: "Medicine" } 
  },
    
  {
    content: `The quick brown fox jumps over the lazy dog. A journey of a thousand miles begins with a single step. 
    Actions speak louder than words. All that glitters is not gold. The pen is mightier than the sword. Practice makes perfect. 
    Honesty is the best policy. Better late than never. Two wrongs don't make a right. When in Rome, do as the Romans do. 
    Time waits for no one. Every cloud has a silver lining. Birds of a feather flock together. Don't bite the hand that feeds you. 
    You can't judge a book by its cover. Necessity is the mother of invention. Too many cooks spoil the broth. 
    A picture is worth a thousand words. Rome wasn't built in a day. The squeaky wheel gets the grease.`,
    metadata: { provenance: "English Proverb", category: "literature", length: 515 }
  },
  {
    content: `E = mc^2 represents the relationship between energy, mass, and the speed of light. 
    The speed of light is approximately 299,792 kilometers per second. Energy can neither be created nor destroyed. 
    Gravity keeps planets in orbit around the Sun. Black holes are regions of space where gravity is so strong that nothing can escape. 
    The observable universe is estimated to be 93 billion light-years in diameter. Neutron stars are among the densest objects in the universe. 
    Quantum mechanics describes the behavior of particles at the smallest scales. The theory of relativity revolutionized modern physics. 
    The Big Bang theory explains the origin of the universe. Photons are particles of light. 
    Dark matter and dark energy make up most of the universe's mass-energy content. The Earth orbits the Sun once every 365.25 days. 
    The Milky Way galaxy contains over 100 billion stars. Electrons orbit the nucleus of an atom. 
    Protons and neutrons are found in the nucleus. The Higgs boson gives particles mass. 
    Supernovae occur when massive stars collapse. A light-year is the distance light travels in one year. 
    Space-time is a four-dimensional fabric that can be warped by mass and energy.`,
    metadata: { provenance: "Physics", category: "science", length: 1047 }
  },
  {
    content: `The mitochondrion is the powerhouse of the cell. Cells are the basic building blocks of life. 
    DNA carries the genetic information necessary for life. Proteins are synthesized in the ribosomes. 
    The cell membrane regulates what enters and exits the cell. Plant cells have chloroplasts for photosynthesis. 
    The nucleus is the control center of the cell. Enzymes are proteins that speed up chemical reactions. 
    Cellular respiration occurs in the mitochondria. The cytoplasm is the jelly-like substance inside cells. 
    Lysosomes break down waste and cellular debris. Endoplasmic reticulum helps in protein and lipid synthesis. 
    Golgi apparatus packages and transports proteins. Cell division occurs through mitosis and meiosis. 
    Stem cells can differentiate into various cell types. Red blood cells carry oxygen throughout the body. 
    White blood cells help fight infections. The immune system is a defense mechanism against pathogens. 
    Neurons transmit signals in the nervous system. ATP is the primary energy currency of cells.`,
    metadata: { provenance: "Biology Textbook", category: "education", length: 992 }
  },
  {
    content: `To be, or not to be, that is the question. All the world's a stage, and all the men and women merely players. 
    Some are born great, some achieve greatness, and some have greatness thrust upon them. 
    The course of true love never did run smooth. What's in a name? That which we call a rose by any other name would smell as sweet. 
    If music be the food of love, play on. Brevity is the soul of wit. Uneasy lies the head that wears a crown. 
    Love looks not with the eyes, but with the mind, and therefore is winged Cupid painted blind. 
    Cowards die many times before their deaths; the valiant never taste of death but once. 
    Hell is empty, and all the devils are here. We are such stuff as dreams are made on. 
    This above all: to thine own self be true. A fool thinks himself to be wise, but a wise man knows himself to be a fool. 
    The fault, dear Brutus, is not in our stars, but in ourselves. Now is the winter of our discontent. 
    The better part of valor is discretion. Men at some time are masters of their fates. 
    The lady doth protest too much, methinks. Parting is such sweet sorrow.`,
    metadata: { provenance: "William Shakespeare", category: "literature", length: 1192 }
  },
  {
    content: `JavaScript is a versatile programming language used for web development. It allows you to create dynamic and interactive web pages. 
    JavaScript runs in the browser and on servers using Node.js. Functions are first-class citizens in JavaScript. 
    Variables can be declared using var, let, or const. The Document Object Model (DOM) represents the structure of a web page. 
    JavaScript supports asynchronous programming with Promises and async/await. 
    ES6 introduced many new features, such as arrow functions and template literals. 
    JSON (JavaScript Object Notation) is a common data format used in APIs. 
    JavaScript can manipulate HTML elements and CSS styles dynamically. 
    JavaScript frameworks like React, Angular, and Vue are popular for building web apps. 
    The event loop handles concurrency in JavaScript. JavaScript is loosely typed, meaning variables can change types. 
    Closures are functions that remember their lexical scope. Prototypes allow object inheritance in JavaScript. 
    TypeScript adds static typing to JavaScript. 
    JavaScript engines like V8 power modern web browsers. Debugging tools in browsers make it easier to fix JavaScript issues. 
    JavaScript can also be used for mobile app and game development. Libraries like D3.js are great for data visualization.`,
    metadata: { provenance: "Coding Tutorial", category: "technology", length: 1124 }
  }
];

export default textSources;
