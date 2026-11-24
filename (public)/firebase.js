import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, push, query, orderByChild, limitToLast, get, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCp5enmy_AvnQfklbhOjB19I5FeA2jPYMU",
  authDomain: "tetris2-ucp.firebaseapp.com",
  databaseURL: "https://tetris2-ucp-default-rtdb.firebaseio.com", // Confirme se este link está certo no seu console
  projectId: "tetris2-ucp",
  storageBucket: "tetris2-ucp.firebasestorage.app",
  messagingSenderId: "1022536050322",
  appId: "1:1022536050322:web:a8cd6690e661811a43e84b",
  measurementId: "G-VT20NM5KEL"
};

// Inicializa o app
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Exporta as funções necessárias para o tetris.js
export { database, ref, set, push, query, orderByChild, limitToLast, get, onValue };