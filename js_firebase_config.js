import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAkB4iwe-nWRYthyz9aqv9pIp0WIOkTtAs",
  authDomain: "badside-boutique.firebaseapp.com",
  projectId: "badside-boutique",
  storageBucket: "badside-boutique.firebasestorage.app",
  messagingSenderId: "376959216290",
  appId: "1:376959216290:web:73e6f80c3d6097b93685fb"
};

export const tebexUrl = "https://badside.tebex.io";

export const magicLinks = [
  "ownerbadside",
  "juanteam",
  "friendvip"
];

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export async function initFirebaseAuth() {
  try {
    await signInAnonymously(auth);
  } catch (error) {
    console.error("Erreur auth Firebase :", error);
  }
}
