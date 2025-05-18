// Configuration et initialisation de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAljojXHODwHjStePWkhthWLRzrw3pUslQ",
    authDomain: "la-voie-du-salut-36409.firebaseapp.com",
    projectId: "la-voie-du-salut-36409",
    storageBucket: "la-voie-du-salut-36409.firebasestorage.app",
    messagingSenderId: "61439310820",
    appId: "1:61439310820:web:52bfe8b862666ac13d25f1",
    measurementId: "G-G9S1ST8K3R"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
