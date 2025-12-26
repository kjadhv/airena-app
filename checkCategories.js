// checkCategoriesAdmin.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function checkCategories() {
  const snap = await db.collection("videos").get();
  const categories = new Set();

  snap.docs.forEach(doc => {
    categories.add(doc.data().category);
  });

  console.log("Unique categories in Firebase:");
  console.log([...categories]);
}

checkCategories();
