import { db, auth } from "./firebase.js";
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  getDocs, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const $ = id => document.getElementById(id);
let programs = [];
let editingId = null;

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 1800);
}

function setLoggedIn(loggedIn) {
  $("loginPanel").classList.toggle("hidden", loggedIn);
  $("dashboard").classList.toggle("hidden", !loggedIn);
}

onAuthStateChanged(auth, user => {
  setLoggedIn(!!user);
  if (user) loadPrograms();
});

$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  $("loginError").textContent = "";
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
  } catch (error) {
    $("loginError").textContent = friendlyAuthError(error.code);
  }
});

$("logoutBtn").addEventListener("click", () => signOut(auth));

function friendlyAuthError(code) {
  const map = {
    "auth/invalid-credential": "Invalid email or password.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
    "auth/network-request-failed": "Network error. Check your internet."
  };
  return map[code] || "Login failed. Check your Firebase Authentication setup.";
}

async function loadPrograms() {
  try {
    const q = query(collection(db, "programs"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    programs = snap.docs.map(d => ({ id:d.id, ...d.data() }));
  } catch {
    const snap = await getDocs(collection(db, "programs"));
    programs = snap.docs.map(d => ({ id:d.id, ...d.data() }));
  }
  renderStats();
  renderList();
}

function renderStats() {
  $("aTotal").textContent = programs.length;
  $("aPython").textContent = programs.filter(p => p.subject === "Python").length;
  $("aSql").textContent = programs.filter(p => p.subject === "SQL").length;
  $("aTableau").textContent = programs.filter(p => p.subject === "Tableau").length;
  $("aEdc").textContent = programs.filter(p => p.subject === "EDC").length;
}

function renderList() {
  const search = $("adminSearch").value.trim().toLowerCase();
  const list = programs.filter(p =>
    `${p.title || ""} ${p.subject || ""} ${p.description || ""}`.toLowerCase().includes(search)
  );

  $("adminList").innerHTML = list.length ? list.map(p => `
    <div class="admin-item">
      <div>
        <span class="badge">${escapeHTML(p.subject || "Other")}</span>
        <h3>${escapeHTML(p.title || "Untitled")}</h3>
        <small>${escapeHTML(p.difficulty || "Easy")}</small>
      </div>
      <div class="item-actions">
        <button class="small-btn edit-btn" data-id="${p.id}">Edit</button>
        <button class="small-btn danger delete-btn" data-id="${p.id}">Delete</button>
      </div>
    </div>
  `).join("") : `<div class="empty">No programs yet.</div>`;

  document.querySelectorAll(".edit-btn").forEach(b => b.addEventListener("click", () => startEdit(b.dataset.id)));
  document.querySelectorAll(".delete-btn").forEach(b => b.addEventListener("click", () => removeProgram(b.dataset.id)));
}

$("adminSearch").addEventListener("input", renderList);

$("programForm").addEventListener("submit", async e => {
  e.preventDefault();
  const data = {
    subject: $("subject").value,
    title: $("title").value.trim(),
    description: $("description").value.trim(),
    difficulty: $("difficulty").value,
    code: $("code").value,
    updatedAt: serverTimestamp()
  };

  $("saveBtn").disabled = true;
  try {
    if (editingId) {
      await updateDoc(doc(db, "programs", editingId), data);
      toast("Program updated");
    } else {
      await addDoc(collection(db, "programs"), {
        ...data,
        createdAt: serverTimestamp()
      });
      toast("Program added");
    }
    resetForm();
    await loadPrograms();
  } catch (error) {
    toast("Save failed: " + error.message);
  } finally {
    $("saveBtn").disabled = false;
  }
});

function startEdit(id) {
  const p = programs.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  $("formTitle").textContent = "Edit Program";
  $("cancelEdit").classList.remove("hidden");
  $("saveBtn").textContent = "Update Program";
  $("subject").value = p.subject || "Python";
  $("title").value = p.title || "";
  $("description").value = p.description || "";
  $("difficulty").value = p.difficulty || "Easy";
  $("code").value = p.code || "";
  window.scrollTo({top: 0, behavior: "smooth"});
}

$("cancelEdit").addEventListener("click", resetForm);

function resetForm() {
  editingId = null;
  $("programForm").reset();
  $("formTitle").textContent = "Add Program";
  $("cancelEdit").classList.add("hidden");
  $("saveBtn").textContent = "Save Program";
}

async function removeProgram(id) {
  const p = programs.find(x => x.id === id);
  if (!p || !confirm(`Delete "${p.title}"?`)) return;
  try {
    await deleteDoc(doc(db, "programs", id));
    toast("Program deleted");
    await loadPrograms();
  } catch (error) {
    toast("Delete failed: " + error.message);
  }
}