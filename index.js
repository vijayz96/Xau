import { db } from "./firebase.js";
import {
  collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const subjects = ["All", "Python", "SQL", "Tableau", "EDC"];
let programs = [];
let activeSubject = "All";

const $ = (id) => document.getElementById(id);

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

async function loadPrograms() {
  try {
    const q = query(collection(db, "programs"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    programs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    // Fallback without ordering, useful if the createdAt index/query is unavailable.
    try {
      const snap = await getDocs(collection(db, "programs"));
      programs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      $("programGrid").innerHTML = `<div class="empty">Could not load programs.<br><small>${escapeHTML(e.message)}</small></div>`;
      return;
    }
  }
  renderStats();
  renderFilters();
  renderPrograms();
}

function renderStats() {
  $("totalCount").textContent = programs.length;
  ["Python","SQL","Tableau","EDC"].forEach(s => {
    const id = s.toLowerCase() + "Count";
    $(id).textContent = programs.filter(p => p.subject === s).length;
  });
}

function renderFilters() {
  $("subjectFilters").innerHTML = subjects.map(s =>
    `<button class="filter ${activeSubject === s ? "active" : ""}" data-subject="${escapeHTML(s)}">${escapeHTML(s)}</button>`
  ).join("");
  document.querySelectorAll(".filter").forEach(btn => {
    btn.addEventListener("click", () => {
      activeSubject = btn.dataset.subject;
      renderFilters();
      renderPrograms();
    });
  });
}

function renderPrograms() {
  const search = $("searchInput").value.trim().toLowerCase();
  const filtered = programs.filter(p => {
    const subjectOK = activeSubject === "All" || p.subject === activeSubject;
    const hay = `${p.title || ""} ${p.description || ""} ${p.code || ""} ${p.subject || ""}`.toLowerCase();
    return subjectOK && (!search || hay.includes(search));
  });

  if (!filtered.length) {
    $("programGrid").innerHTML = `<div class="empty">No programs found.<br><small>Add programs from the Admin Panel.</small></div>`;
    return;
  }

  $("programGrid").innerHTML = filtered.map((p, i) => `
    <article class="program-card" style="--delay:${i * 45}ms">
      <div class="card-top">
        <span class="badge">${escapeHTML(p.subject || "Other")}</span>
        <span class="difficulty ${String(p.difficulty || "Easy").toLowerCase()}">${escapeHTML(p.difficulty || "Easy")}</span>
      </div>
      <h3>${escapeHTML(p.title || "Untitled Program")}</h3>
      <p>${escapeHTML(p.description || "No description added.")}</p>
      <div class="code-wrap">
        <div class="code-bar"><span>PROGRAM CODE</span><button class="copy-btn" data-id="${p.id}">Copy</button></div>
        <pre><code>${escapeHTML(p.code || "")}</code></pre>
      </div>
    </article>
  `).join("");

  document.querySelectorAll(".copy-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const p = programs.find(x => x.id === btn.dataset.id);
      if (!p) return;
      try {
        await navigator.clipboard.writeText(p.code || "");
      } catch {
        const ta = document.createElement("textarea");
        ta.value = p.code || "";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      btn.textContent = "Copied!";
      toast("Code copied to clipboard");
      setTimeout(() => btn.textContent = "Copy", 1200);
    });
  });
}

$("searchInput").addEventListener("input", renderPrograms);
loadPrograms();