import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBQksNHv_iD28jfgrF88CRt6KDH6H2cpVY",
  authDomain: "jet-tracker-df2b8.firebaseapp.com",
  projectId: "jet-tracker-df2b8",
  storageBucket: "jet-tracker-df2b8.firebasestorage.app",
  messagingSenderId: "574239949264",
  appId: "1:574239949264:web:ab394bb34362393142f9d5",
  measurementId: "G-JQTXNK738E"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
