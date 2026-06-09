/* ══════════════════════════════════════════════════════════════════
   Aix en Vue – Générateur de Documents & Hub d'Administration
   app.js
   ══════════════════════════════════════════════════════════════════ */

// ── Constantes association ─────────────────────────────────────────
const ASSO = {
  nom:        "Aix en Vue",
  sousTitre:  "Pour et avec les déficients visuels",
  statut:     "Association Loi 1901 Reconnue d'intérêt général",
  siret:      "92855251200016",
  adresse:    "23 boulevard François et Emile Zola",
  cpVille:    "13 100 Aix en Provence",
  tel:        "07 44 99 94 38",
  email:      "info@aixenvue.fr",
  iban:       "FR76 1130 6000 4848 1698 0648 170",
  bic:        "AGRIFRPP813",
  tvaMention: "Aix en vue étant une association régie par la Loi 1901, les prestations ne sont pas assujetties à TVA.",
  conditions: "40% à la commande, solde le jour de l'exécution des prestations.",
  logoUrl:    "logo.png",
};

// ── URL de l'API Google Apps Script ───────────────────────────────
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxwsZDQY_W9hj3cM8CcC7BHmNsGkvvg-Yoci0i3THyDisu-TL2pBW0NP3UwGA7Is9kF/exec";

// ── État global ────────────────────────────────────────────────────
let store = { contacts: [], documents: [] };
let lignes = [];
let logoBase64 = null;
let modeDoc = "devis"; // "devis" | "facture"
let activeTab = "generator"; // "generator" | "contacts" | "documents"

// ── Initialisation ────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("dateDoc").value = new Date().toISOString().split("T")[0];
  document.getElementById("conditions").value = ASSO.conditions;

  loadLogoBase64();
  addLigne();

  // Événements du formulaire
  document.getElementById("btnAdd").addEventListener("click", addLigne);
  document.getElementById("btnGenerate").addEventListener("click", genererPDF);

  document.getElementById("btnTypeDevis").addEventListener("click", () => setMode("devis"));
  document.getElementById("btnTypeFacture").addEventListener("click", () => setMode("facture"));

  // État initial du formulaire
  setMode("devis");

  // Chargement des données depuis Google Sheets
  loadAllData();
});

// ── Chargement des données Google Sheets ─────────────────────────────
async function loadAllData() {
  try {
    toggleLoader(true, "Synchronisation avec Google Sheets...");
    
    const response = await fetch(WEB_APP_URL, { method: "GET", redirect: "follow" });
    if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
    
    const data = await response.json();
    if (data.error) throw new Error(data.error);

    store.contacts = data.contacts || [];
    store.documents = data.documents || [];
    
    toggleLoader(false);
    updateDocumentNumbers();
    renderActiveTab();
  } catch (err) {
    toggleLoader(false);
    showError(err.message);
  }
}

// ── Calcul automatique des numéros de devis / facture ──────────────
function updateDocumentNumbers() {
  const currentYear = new Date().getFullYear();
  
  // Calcul du numéro de Devis
  const devisCount = store.documents.filter(d => 
    d.type === "Devis" && d.titre && d.titre.includes(`-${currentYear}-`)
  ).length;
  const nextDevisNum = devisCount + 1;
  const devisId = `DEV-${currentYear}-${String(nextDevisNum).padStart(3, '0')}`;
  document.getElementById("numDevis").value = devisId;
  
  // Calcul du numéro de Facture
  const factureCount = store.documents.filter(d => 
    d.type === "Facture" && d.titre && d.titre.includes(`-${currentYear}-`)
  ).length;
  const nextFactureNum = factureCount + 1;
  const factureId = `FAC-${currentYear}-${String(nextFactureNum).padStart(3, '0')}`;
  document.getElementById("numFacture").value = factureId;
}

// ── Gestion mode devis / facture ───────────────────────────────────
function setMode(mode) {
  modeDoc = mode;

  const btnDevis = document.getElementById("btnTypeDevis");
  const btnFacture = document.getElementById("btnTypeFacture");
  const fieldFac = document.getElementById("fieldNumFacture");

  if (mode === "devis") {
    btnDevis.className = "flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-rose-600 text-white shadow-md shadow-rose-600/20";
    btnFacture.className = "flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-transparent text-slate-500 hover:text-slate-800";
    
    fieldFac.classList.add("hidden");
    document.getElementById("labelDate").textContent = "Date du devis";
    document.getElementById("btnLabel").textContent = "Générer le devis PDF";
  } else {
    btnFacture.className = "flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-rose-600 text-white shadow-md shadow-rose-600/20";
    btnDevis.className = "flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-transparent text-slate-500 hover:text-slate-800";
    
    fieldFac.classList.remove("hidden");
    document.getElementById("labelDate").textContent = "Date de la facture";
    document.getElementById("btnLabel").textContent = "Générer la facture PDF";
  }
}

// ── Navigation par onglet ──────────────────────────────────────────
function switchTab(tabName) {
  activeTab = tabName;
  
  // Reset de la recherche
  document.getElementById("search-input").value = "";
  
  // Liens de navigation
  const tabs = {
    generator: document.getElementById("btn-tab-generator"),
    contacts: document.getElementById("btn-tab-contacts"),
    documents: document.getElementById("btn-tab-documents")
  };
  
  // Style actif
  Object.keys(tabs).forEach(k => {
    if (!tabs[k]) return;
    if (k === activeTab) {
      tabs[k].className = "border-b-2 border-rose-600 text-rose-600 px-1 pb-4 text-sm font-bold flex items-center gap-2 focus:outline-none transition-all";
    } else {
      tabs[k].className = "border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 px-1 pb-4 text-sm font-semibold flex items-center gap-2 focus:outline-none transition-all";
    }
  });

  // Visibilité des conteneurs
  const containers = {
    generator: document.getElementById("container-generator"),
    contacts: document.getElementById("container-contacts"),
    documents: document.getElementById("container-documents")
  };
  
  Object.keys(containers).forEach(k => {
    if (!containers[k]) return;
    if (k === activeTab) {
      containers[k].classList.remove("hidden");
    } else {
      containers[k].classList.add("hidden");
    }
  });

  // Barre de recherche
  const searchBar = document.getElementById("search-bar-container");
  if (activeTab === "generator") {
    searchBar.classList.add("hidden");
  } else {
    searchBar.classList.remove("hidden");
    document.getElementById("search-input").placeholder = activeTab === "contacts" 
      ? "Rechercher un contact par organisation, nom, email, siret..."
      : "Rechercher un document par titre, type...";
  }

  // Cacher l'état d'erreur ou vide si on change
  document.getElementById("empty-state").classList.add("hidden");

  renderActiveTab();
}

function handleSearch() {
  renderActiveTab();
}

// ── Rendu de l'onglet actif ────────────────────────────────────────
function renderActiveTab() {
  const query = document.getElementById("search-input").value.toLowerCase().trim();
  const emptyState = document.getElementById("empty-state");
  
  emptyState.classList.add("hidden");

  if (activeTab === "generator") {
    updateCounter("Générateur");
  } else if (activeTab === "contacts") {
    const filtered = store.contacts.filter(c => 
      (c.organisation && c.organisation.toLowerCase().includes(query)) ||
      (c.nom && c.nom.toLowerCase().includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.mobile && c.mobile.toLowerCase().includes(query)) ||
      (c.siret && c.siret.toLowerCase().includes(query))
    );
    displayContacts(filtered);
    updateCounter(`${filtered.length} contact${filtered.length > 1 ? 's' : ''} trouvé(s)`);
  } else if (activeTab === "documents") {
    const filtered = store.documents.filter(d => 
      (d.titre && d.titre.toLowerCase().includes(query)) ||
      (d.type && d.type.toLowerCase().includes(query)) ||
      (d.id && d.id.toLowerCase().includes(query))
    );
    displayDocuments(filtered);
    updateCounter(`${filtered.length} document${filtered.length > 1 ? 's' : ''} archivé(s)`);
  }
}

// ── Affichage des Contacts ─────────────────────────────────────────
function displayContacts(list) {
  const target = document.getElementById("container-contacts");
  target.innerHTML = "";
  
  if (list.length === 0) {
    document.getElementById("empty-state").classList.remove("hidden");
    return;
  }
  
  list.forEach(c => {
    const card = document.createElement("div");
    card.className = "bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow";
    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between mb-4">
          <span class="text-[10px] font-mono text-slate-300">ID : #${escapeHtml(c.id)}</span>
        </div>
        <h2 class="text-lg font-extrabold text-slate-900 mb-2 flex items-center gap-2">
          <i class="fa-solid fa-building text-rose-600 text-sm"></i>
          ${escapeHtml(c.organisation) || 'Sans entité'}
        </h2>
        ${c.nom ? `<p class="text-sm font-semibold text-slate-500 mb-4 flex items-center gap-2"><i class="fa-solid fa-user text-xs text-slate-400"></i> ${escapeHtml(c.nom)}</p>` : '<div class="mb-4"></div>'}
        <div class="space-y-2 text-sm text-slate-600 border-t border-slate-50 pt-3">
          ${c.mobile ? `<p class="flex items-center gap-2"><i class="fa-solid fa-phone text-slate-400 w-4"></i> <a href="tel:${c.mobile}" class="hover:text-rose-600 font-medium">${escapeHtml(c.mobile)}</a></p>` : ''}
          ${c.email ? `<p class="flex items-center gap-2 truncate"><i class="fa-solid fa-envelope text-slate-400 w-4"></i> <a href="mailto:${c.email}" class="hover:text-rose-600 font-medium">${escapeHtml(c.email)}</a></p>` : ''}
          ${c.adresse ? `<p class="flex items-start gap-2"><i class="fa-solid fa-map-pin text-slate-400 w-4 mt-0.5"></i> <span class="text-xs">${escapeHtml(c.adresse)}</span></p>` : ''}
          ${c.siret ? `<p class="flex items-center gap-2 text-xs text-slate-400"><i class="fa-solid fa-id-card w-4"></i> SIRET : ${escapeHtml(c.siret)}</p>` : ''}
        </div>
      </div>
      <div class="mt-6 pt-4 border-t border-slate-50 flex items-center justify-end">
        <button onclick="prefillClient('${escJs(c.organisation)}', '${escJs(c.siret)}', '${escJs(c.nom)}', '${escJs(c.email)}', '${escJs(c.adresse)}')"
                class="inline-flex items-center gap-2 text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-100 hover:border-rose-600 px-4 py-2.5 rounded-xl transition-all shadow-sm">
          <i class="fa-solid fa-file-invoice"></i> Facturer / Devis
        </button>
      </div>
    `;
    target.appendChild(card);
  });
}

// ── Pré-remplissage du client ──────────────────────────────────────
function prefillClient(org, siren, contact, email, address) {
  document.getElementById("clientOrg").value = org;
  document.getElementById("clientSiren").value = siren;
  document.getElementById("clientContact").value = contact;
  document.getElementById("clientEmail").value = email;
  document.getElementById("clientAddress").value = address;
  
  switchTab("generator");
}

// ── Affichage des Documents Archivés ────────────────────────────────
function displayDocuments(list) {
  const target = document.getElementById("container-documents");
  target.innerHTML = "";
  
  if (list.length === 0) {
    document.getElementById("empty-state").classList.remove("hidden");
    return;
  }

  list.forEach(d => {
    const isDevis = d.type === "Devis";
    const badgeClass = isDevis ? "bg-cyan-50 text-cyan-700 border-cyan-150" : "bg-emerald-50 text-emerald-700 border-emerald-150";
    const iconClass = isDevis ? "fa-file-signature" : "fa-file-invoice";

    const card = document.createElement("div");
    card.className = "bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow";
    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between mb-4">
          <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${badgeClass}">
            <i class="fa-solid ${iconClass} mr-1.5"></i> ${d.type}
          </span>
          <span class="text-[10px] font-mono text-slate-300">#${escapeHtml(d.id)}</span>
        </div>
        <h2 class="text-base font-bold text-slate-900 mb-2 line-clamp-2" title="${escapeHtml(d.titre)}">
          ${escapeHtml(d.titre) || 'Sans titre'}
        </h2>
        <p class="text-[10px] text-slate-400 font-medium flex items-center gap-1.5 mb-6">
          <i class="fa-solid fa-clock"></i> ${escapeHtml(d.datetime)}
        </p>
      </div>
      
      <div class="pt-4 border-t border-slate-50 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <a href="${escapeHtml(d.url)}" target="_blank" 
             class="inline-flex items-center gap-2 text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-100 hover:border-rose-600 px-4 py-2.5 rounded-xl transition-all shadow-sm">
            <i class="fa-solid fa-file-pdf"></i> PDF
          </a>
          ${isDevis ? `
          <button onclick="convertDevisToFacture('${escJs(d.id)}')" 
                  class="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-100 hover:border-indigo-600 px-3 py-2.5 rounded-xl transition-all shadow-sm"
                  title="Créer une facture à partir de ce devis">
            <i class="fa-solid fa-file-invoice-dollar"></i> Facturer
          </button>
          ` : ''}
        </div>
        <button onclick="confirmDeleteDocument('${escJs(d.id)}', '${escJs(d.titre)}')" 
                class="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-3 py-2.5 rounded-xl transition-all">
          <i class="fa-solid fa-trash-can"></i> Supprimer
        </button>
      </div>
    `;
    target.appendChild(card);
  });
}

// ── Conversion de Devis en Facture ──────────────────────────────────
function convertDevisToFacture(docId) {
  const devis = store.documents.find(d => d.id === docId);
  if (!devis) return;
  
  // Pré-remplir les champs client
  document.getElementById("clientOrg").value = devis.organisation || "";
  document.getElementById("clientSiren").value = devis.siren || "";
  document.getElementById("clientContact").value = devis.contact || "";
  document.getElementById("clientEmail").value = devis.email || "";
  document.getElementById("clientAddress").value = devis.adresse || "";
  document.getElementById("conditions").value = devis.condition || ASSO.conditions;
  
  // Remplir les prestations
  lignes = [];
  if (devis.articles && devis.articles.length > 0) {
    devis.articles.forEach(art => {
      lignes.push({
        id: Date.now() + Math.random(),
        designation: art.designation || "",
        quantite: art.quantite || 1,
        prixUnitaire: art.prixUnitaire || 0
      });
    });
  } else {
    addLigne();
  }
  
  // Basculer en mode Facture
  setMode("facture");
  
  // Recalculer le numéro automatique de facture
  updateDocumentNumbers();
  
  // Re-générer les lignes prestations du formulaire
  renderLignes();
  
  // Rediriger vers l'onglet Formulaire
  switchTab("generator");
}

// ── Suppression d'un document ──────────────────────────────────────
async function confirmDeleteDocument(id, title) {
  const check = confirm(`⚠️ ATTENTION ⚠️\n\nÊtes-vous sûr de vouloir supprimer définitivement le document :\n"${title}" ?\n\nCette action va effacer définitivement le fichier correspondant sur Google Drive et sa ligne dans Google Sheets.`);
  if (!check) return;

  try {
    toggleLoader(true, "Suppression sur Google Drive & Sheets...");
    
    const url = `${WEB_APP_URL}?action=deleteDocument&id=${encodeURIComponent(id)}`;
    const response = await fetch(url, { method: "GET", redirect: "follow" });
    if (!response.ok) throw new Error("Échec technique de communication.");
    
    const result = await response.json();
    
    if (result.success) {
      // Retrait local
      store.documents = store.documents.filter(doc => doc.id !== id);
      toggleLoader(false);
      updateDocumentNumbers();
      renderActiveTab();
    } else {
      throw new Error(result.error || "Raison inconnue.");
    }
  } catch (err) {
    toggleLoader(false);
    alert("Erreur lors de la suppression : " + err.message);
  }
}

// ── Logo Base64 ────────────────────────────────────────────────────
function loadLogoBase64() {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 200;
      canvas.height = img.naturalHeight || 200;
      canvas.getContext("2d").drawImage(img, 0, 0);
      logoBase64 = canvas.toDataURL("image/png");
    } catch (e) { logoBase64 = null; }
  };
  img.onerror = () => { logoBase64 = null; };
  img.src = ASSO.logoUrl + "?t=" + Date.now();
  const headerImg = document.getElementById("logoImg");
  if (headerImg) headerImg.src = ASSO.logoUrl;
}

// ── Lignes de Prestation ───────────────────────────────────────────
function addLigne() {
  const id = Date.now();
  lignes.push({ id, designation: "", quantite: 1, prixUnitaire: 0 });
  renderLignes();
}

function deleteLigne(id) {
  if (lignes.length <= 1) return;
  lignes = lignes.filter(l => l.id !== id);
  renderLignes();
}

function updateLigne(id, field, value) {
  const l = lignes.find(l => l.id === id);
  if (!l) return;
  if (field === "designation") l.designation = value;
  else if (field === "quantite") l.quantite = Math.max(1, parseFloat(value) || 1);
  else if (field === "pu") l.prixUnitaire = Math.max(0, parseFloat(value) || 0);
  updateLigneTotal(id);
  updateTotaux();
}

function updateLigneTotal(id) {
  const l = lignes.find(l => l.id === id);
  const el = document.getElementById(`total-${id}`);
  if (l && el) el.textContent = formatEur(l.quantite * l.prixUnitaire);
}

function renderLignes() {
  const container = document.getElementById("lignes-container");
  container.innerHTML = "";
  lignes.forEach(l => {
    const row = document.createElement("div");
    row.className = "p-4 flex flex-col md:grid md:grid-cols-12 gap-4 items-center relative hover:bg-slate-50 transition-colors";
    row.id = `ligne-${l.id}`;
    row.innerHTML = `
      <!-- Désignation -->
      <div class="w-full md:col-span-6 pr-8 md:pr-0">
        <input type="text" placeholder="Description de la prestation"
               value="${escapeHtml(l.designation)}"
               oninput="updateLigne(${l.id},'designation',this.value)"
               class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all font-medium bg-white" />
      </div>
      
      <!-- Mobile labels + inputs -->
      <div class="grid grid-cols-3 gap-3 w-full md:col-span-6 items-center">
        <!-- Quantité -->
        <div class="flex flex-col md:block">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider md:hidden mb-1">Quantité</span>
          <input type="number" min="1" step="1" value="${l.quantite}"
                 oninput="updateLigne(${l.id},'quantite',this.value)"
                 class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none text-center transition-all font-medium bg-white" />
        </div>
        
        <!-- Prix Unit. -->
        <div class="flex flex-col md:block">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider md:hidden mb-1">Prix Unit.</span>
          <input type="number" min="0" step="0.01" value="${l.prixUnitaire}"
                 oninput="updateLigne(${l.id},'pu',this.value)"
                 class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none text-right transition-all font-medium bg-white" />
        </div>
        
        <!-- Total -->
        <div class="flex flex-col md:block pr-6 md:pr-4">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider md:hidden mb-1">Total</span>
          <div class="text-sm font-bold text-slate-800 text-right py-2" id="total-${l.id}">
            ${formatEur(l.quantite * l.prixUnitaire)}
          </div>
        </div>
      </div>
      
      <!-- Bouton Supprimer -->
      <button class="absolute right-3 top-3 md:top-auto md:relative md:right-0 p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
              onclick="deleteLigne(${l.id})" title="Supprimer">
        <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    `;
    container.appendChild(row);
  });
  updateTotaux();
}

function updateTotaux() {
  const total = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  document.getElementById("totGeneral").textContent = formatEur(total);
}

// ── Helpers ────────────────────────────────────────────────────────
function formatEur(val) {
  return val.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(/[\u202f\u00a0]/g, " ") + " \u20ac";
}

function escHtml(str) {
  return escapeHtml(str);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escJs(str) {
  if (!str) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

function showAlert(msg) {
  const el = document.getElementById("alertMsg");
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

function formatDateFR(str) {
  if (!str) return new Date().toLocaleDateString("fr-FR");
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}

function dateValidite(str) {
  const d = str ? new Date(str) : new Date();
  d.setMonth(d.getMonth() + 3);
  return d.toLocaleDateString("fr-FR");
}

function toggleLoader(show, text = "Synchronisation...") {
  const el = document.getElementById("global-loader");
  const textEl = document.getElementById("global-loader-text");
  if (textEl) textEl.textContent = text;
  if (show) {
    el.classList.remove("hidden");
  } else {
    el.classList.add("hidden");
  }
}

function updateCounter(text) {
  document.getElementById("global-counter").textContent = text;
}

function showError(msg) {
  document.getElementById("error-state").classList.remove("hidden");
  document.getElementById("error-message").textContent = msg;
}

// ── Génération et Envoi PDF ────────────────────────────────────────
async function genererPDF() {
  const isDevis     = modeDoc === "devis";
  const numDevis    = document.getElementById("numDevis").value.trim();
  const numFacture  = document.getElementById("numFacture").value.trim();
  const dateDoc     = document.getElementById("dateDoc").value;
  const clientOrg   = document.getElementById("clientOrg").value.trim();
  const clientSiren = document.getElementById("clientSiren").value.trim();
  const clientCont  = document.getElementById("clientContact").value.trim();
  const clientEmail = document.getElementById("clientEmail").value.trim();
  const clientAddress = document.getElementById("clientAddress").value.trim();

  // Validation
  const numRef = isDevis ? numDevis : numFacture;
  if (!numRef)    { showAlert("Numéro de document non initialisé."); return; }
  if (!dateDoc)   { showAlert("Veuillez renseigner la date du document."); return; }
  if (!clientOrg) { showAlert("Veuillez renseigner le nom de l'organisation cliente."); return; }
  if (!clientAddress) { showAlert("Veuillez renseigner l'adresse du client."); return; }
  if (lignes.every(l => !l.designation.trim())) {
    showAlert("Ajoutez au moins une prestation avec une désignation.");
    return;
  }

  toggleLoader(true, "Génération du PDF...");

  setTimeout(async () => {
    try {
      // Générer le PDF localement avec jsPDF
      const doc = isDevis 
        ? buildDevisPDF(numDevis, dateDoc, clientOrg, clientSiren, clientCont, clientEmail, clientAddress)
        : buildFacturePDF(numDevis, numFacture, dateDoc, clientOrg, clientSiren, clientCont, clientEmail, clientAddress);
      
      // Convertir en Base64
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      
      toggleLoader(true, "Envoi et synchronisation Google Drive / Sheets...");

      // Envoi au Apps Script
      const payload = {
        action: "createDocument",
        title: numRef,
        pdfBase64: pdfBase64,
        type: modeDoc,
        clientOrg: clientOrg,
        clientSiren: clientSiren,
        clientCont: clientCont,
        clientEmail: clientEmail,
        clientAddress: clientAddress,
        conditions: conditions,
        articles: lignes.filter(l => l.designation.trim()).map(l => ({
          designation: l.designation,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire
        }))
      };

      const response = await fetch(WEB_APP_URL, {
        method: "POST",
        body: JSON.stringify(payload),
        redirect: "follow"
      });

      if (!response.ok) throw new Error("Erreur de connexion au serveur d'archivage.");
      const result = await response.json();

      if (result.success) {
        // Ajouter dans l'archive locale
        store.documents.unshift({
          id: result.id,
          titre: numRef,
          url: result.url,
          type: isDevis ? "Devis" : "Facture",
          datetime: result.datetime,
          organisation: clientOrg,
          siren: clientSiren,
          contact: clientCont,
          email: clientEmail,
          adresse: clientAddress,
          condition: conditions,
          articles: payload.articles
        });

        // Téléchargement client-side pour l'utilisateur
        const safe = clientOrg.replace(/[^a-z0-9]/gi, "_").substring(0, 30);
        doc.save(`${numRef}_${safe}.pdf`);

        // Réinitialisation du formulaire prestation
        lignes = [];
        addLigne();
        
        // Vider les champs client
        document.getElementById("clientOrg").value = "";
        document.getElementById("clientSiren").value = "";
        document.getElementById("clientContact").value = "";
        document.getElementById("clientEmail").value = "";
        document.getElementById("clientAddress").value = "";

        toggleLoader(false);
        updateDocumentNumbers();
        switchTab("documents"); // Rediriger l'utilisateur vers l'archive pour voir le document
        alert("Succès : Le document a été généré, téléchargé et archivé avec succès !");
      } else {
        throw new Error(result.error || "Raison inconnue.");
      }

    } catch (err) {
      toggleLoader(false);
      alert("Erreur lors de la génération / synchronisation : " + err.message);
    }
  }, 50);
}

// ══════════════════════════════════════════════════════════════════
//  HELPERS PDF COMMUNS
// ══════════════════════════════════════════════════════════════════
const RED    = [192, 57, 43];
const DARK   = [30, 30, 30];
const WHITE  = [255, 255, 255];
const LIGHT  = [250, 248, 248];
const BORDER = [220, 220, 220];
const MUTED  = [120, 120, 120];
const PW = 210;
const ML = 16;
const MR = 16;
const CW = PW - ML - MR;

function newDoc() {
  const { jsPDF } = window.jspdf;
  return new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
}

function drawTopStripe(doc) {
  doc.setFillColor(...RED);
  doc.rect(0, 0, PW, 4, "F");
}

function drawHeader(doc, y) {
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", ML, y, 28, 17, undefined, "FAST"); } catch(e) {}
  }
  const rx = PW - MR;
  doc.setFont("helvetica", "bold");   doc.setFontSize(10.5); doc.setTextColor(...DARK);
  doc.text(ASSO.nom, rx, y + 4, { align: "right" });
  doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(...RED);
  doc.text(ASSO.sousTitre, rx, y + 8, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
  doc.text(ASSO.statut, rx, y + 12, { align: "right" });
  doc.text(`${ASSO.adresse} – ${ASSO.cpVille}`, rx, y + 16, { align: "right" });
  doc.text(`${ASSO.tel}   ${ASSO.email}`, rx, y + 20, { align: "right" });
  doc.setFontSize(7); doc.setTextColor(150,150,150);
  doc.text(`SIRET : ${ASSO.siret}`, rx, y + 24, { align: "right" });
  return y + 28;
}

function drawSeparator(doc, y) {
  doc.setDrawColor(...RED); doc.setLineWidth(0.6);
  doc.line(ML, y, PW - MR, y);
  return y + 5;
}

function drawClientBloc(doc, y, clientOrg, clientSiren, clientCont, clientEmail, clientAddress, emetteurLabel, clientLabel) {
  const bw     = (CW - 8) / 2;
  const availW = bw - 10;

  // Pre-compute lines to calculate height dynamically
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  const orgLines = doc.splitTextToSize(clientOrg || "—", availW);

  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  const addrLines = clientAddress ? doc.splitTextToSize(clientAddress, availW) : [];
  const emailLines = clientEmail ? doc.splitTextToSize(clientEmail, availW) : [];

  // Compute heights dynamically
  let cy = y + 12;
  cy += orgLines.length * 4.5;
  cy += addrLines.length * 4;
  if (clientSiren) cy += 4;
  if (clientCont)  cy += 4;
  cy += emailLines.length * 4;

  const bh = Math.max(28, cy - y + 1);

  // Émetteur
  doc.setFillColor(...LIGHT); doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, bw, bh, 2, 2, "FD");
  doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(...RED);
  doc.text(emetteurLabel || "ÉMETTEUR", ML + 5, y + 5);
  doc.setLineWidth(0.2); doc.line(ML + 4, y + 7, ML + bw - 4, y + 7);
  doc.setFont("helvetica","bold"); doc.setFontSize(8.5); doc.setTextColor(...DARK);
  doc.text(ASSO.nom, ML + 5, y + 12);
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(80,80,80);
  doc.text(ASSO.adresse, ML + 5, y + 17);
  doc.text(ASSO.cpVille, ML + 5, y + 21);
  doc.text(`SIRET : ${ASSO.siret}`, ML + 5, y + 25);

  // Client
  const cx = ML + bw + 8;
  doc.setFillColor(...LIGHT); doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
  doc.roundedRect(cx, y, bw, bh, 2, 2, "FD");
  doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(...RED);
  doc.text(clientLabel || "ADRESSÉ À", cx + 5, y + 5);
  doc.setLineWidth(0.2); doc.line(cx + 4, y + 7, cx + bw - 4, y + 7);

  // Render Client Text
  doc.setFont("helvetica","bold"); doc.setFontSize(8.5); doc.setTextColor(...DARK);
  doc.text(orgLines, cx + 5, y + 12);

  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(80,80,80);
  let textY = y + 12 + orgLines.length * 4.5;
  if (addrLines.length > 0) {
    doc.text(addrLines, cx + 5, textY);
    textY += addrLines.length * 4;
  }
  if (clientSiren) {
    doc.text(`SIREN : ${clientSiren}`, cx + 5, textY);
    textY += 4;
  }
  if (clientCont) {
    doc.text(`Contact : ${clientCont}`, cx + 5, textY);
    textY += 4;
  }
  if (emailLines.length > 0) {
    doc.text(emailLines, cx + 5, textY);
    textY += emailLines.length * 4;
  }

  return y + bh + 7;
}

function drawTable(doc, y, lignes) {
  const tableBody = lignes
    .filter(l => l.designation.trim())
    .map(l => [
      l.designation,
      String(l.quantite),
      formatEur(l.prixUnitaire),
      formatEur(l.quantite * l.prixUnitaire),
    ]);
  if (!tableBody.length) tableBody.push(["—","—","—","—"]);

  doc.autoTable({
    startY: y,
    head: [["Désignation", "Qté", "Prix forfaitaire", "Total"]],
    body: tableBody,
    margin: { left: ML, right: MR },
    styles: { font:"helvetica", fontSize:8.5, cellPadding:{top:3,right:6,bottom:3,left:6}, lineWidth:0.1, lineColor:BORDER },
    headStyles: { fillColor:RED, textColor:WHITE, fontStyle:"bold", fontSize:8.5, cellPadding:{top:4,right:6,bottom:4,left:6} },
    columnStyles: {
      0: { cellWidth:"auto" },
      1: { cellWidth:18, halign:"center" },
      2: { cellWidth:38, halign:"right" },
      3: { cellWidth:36, halign:"right", fontStyle:"bold" },
    },
    alternateRowStyles: { fillColor:[253,248,247] },
    tableLineColor: BORDER, tableLineWidth: 0.2,
  });
  return doc.lastAutoTable.finalY + 6;
}

function drawFooterBlocs(doc, y, conditions) {
  const fw = (CW - 8) / 2;

  // RIB
  doc.setFillColor(248,248,248); doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, fw, 24, 2, 2, "FD");
  doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(...RED);
  doc.text("COORDONNÉES BANCAIRES", ML + 5, y + 6);
  doc.setLineWidth(0.2); doc.line(ML + 4, y + 8, ML + fw - 4, y + 8);
  doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...DARK);
  doc.text("IBAN :", ML + 5, y + 14);
  doc.setFont("helvetica","normal"); doc.text(ASSO.iban, ML + 18, y + 14);
  doc.setFont("helvetica","bold");   doc.text("BIC :", ML + 5, y + 20);
  doc.setFont("helvetica","normal"); doc.text(ASSO.bic, ML + 16, y + 20);

  // Conditions
  const cx = ML + fw + 8;
  doc.setFillColor(248,248,248); doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
  doc.roundedRect(cx, y, fw, 24, 2, 2, "FD");
  doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(...RED);
  doc.text("CONDITIONS DE RÈGLEMENT", cx + 5, y + 6);
  doc.setLineWidth(0.2); doc.line(cx + 4, y + 8, cx + fw - 4, y + 8);
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(80,80,80);
  const condLines = doc.splitTextToSize(conditions || ASSO.conditions, fw - 10);
  doc.text(condLines, cx + 5, y + 14);

  return y + 30;
}

function drawTVAMention(doc, y) {
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("* " + ASSO.tvaMention, ML, y);
  return y + 5;
}

function drawPageFooter(doc) {
  const PH = 297;
  doc.setFillColor(...RED); doc.rect(0, PH - 4, PW, 4, "F");
  doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(...MUTED);
  doc.text(`${ASSO.nom}  ·  ${ASSO.statut}  ·  SIRET ${ASSO.siret}`, PW/2, PH - 6, { align:"center" });
}

// ══════════════════════════════════════════════════════════════════
//  BUILD FACTURE PDF
// ══════════════════════════════════════════════════════════════════
function buildFacturePDF(numDevis, numFacture, dateDoc, clientOrg, clientSiren, clientCont, clientEmail, clientAddress) {
  const doc        = newDoc();
  const total      = lignes.reduce((s,l) => s + l.quantite * l.prixUnitaire, 0);
  const conditions = document.getElementById("conditions").value.trim() || ASSO.conditions;

  drawTopStripe(doc);
  let y = drawHeader(doc, 7);
  y = drawSeparator(doc, y);

  // Bande FACTURE
  doc.setFillColor(...DARK); doc.roundedRect(ML, y, CW, 15, 2, 2, "F");
  doc.setFont("helvetica","bold"); doc.setFontSize(15); doc.setTextColor(...WHITE);
  doc.text("FACTURE", ML + 8, y + 10);
  const rx = PW - MR - 6;
  doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(200,200,200);
  doc.text("N° Facture :", rx - 22, y + 5,   {align:"right"});
  doc.text("N° Devis :",   rx - 22, y + 10,  {align:"right"});
  doc.text("Date :",       rx - 22, y + 14.5,{align:"right"});
  doc.setFont("helvetica","bold"); doc.setTextColor(...WHITE);
  doc.text(numFacture || "—",     rx, y + 5,   {align:"right"});
  doc.text(numDevis   || "—",     rx, y + 10,  {align:"right"});
  doc.text(formatDateFR(dateDoc), rx, y + 14.5,{align:"right"});
  y += 20;

  y = drawClientBloc(doc, y, clientOrg, clientSiren, clientCont, clientEmail, clientAddress, "ÉMETTEUR", "FACTURÉ À");
  y = drawTable(doc, y, lignes);

  // Total simplifié
  const tw = 80, tx = PW - MR - tw, th = 14;
  doc.setFillColor(...DARK); doc.roundedRect(tx, y, tw, th, 2, 2, "F");
  doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(...WHITE);
  doc.text("TOTAL TTC :", tx + 4, y + 10);
  doc.text(formatEur(total), tx + tw - 4, y + 10, {align:"right"});
  y += th + 7;

  y = drawFooterBlocs(doc, y, conditions);
  drawTVAMention(doc, y);
  drawPageFooter(doc);

  return doc;
}

// ══════════════════════════════════════════════════════════════════
//  BUILD DEVIS PDF
// ══════════════════════════════════════════════════════════════════
function buildDevisPDF(numDevis, dateDoc, clientOrg, clientSiren, clientCont, clientEmail, clientAddress) {
  const doc        = newDoc();
  const total      = lignes.reduce((s,l) => s + l.quantite * l.prixUnitaire, 0);
  const PH         = 297;
  const conditions = document.getElementById("conditions").value.trim() || ASSO.conditions;

  drawTopStripe(doc);
  let y = drawHeader(doc, 7);
  y = drawSeparator(doc, y);

  // Bande DEVIS
  doc.setFillColor(...DARK); doc.roundedRect(ML, y, CW, 15, 2, 2, "F");
  doc.setFont("helvetica","bold"); doc.setFontSize(15); doc.setTextColor(...WHITE);
  doc.text("DEVIS", ML + 8, y + 10);
  const rx = PW - MR - 6;
  doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(200,200,200);
  doc.text("N° Devis :",          rx - 22, y + 5,   {align:"right"});
  doc.text("Date :",              rx - 22, y + 10,  {align:"right"});
  doc.text("Valable jusqu'au :", rx - 22, y + 14.5, {align:"right"});
  doc.setFont("helvetica","bold"); doc.setTextColor(...WHITE);
  doc.text(numDevis || "—",       rx, y + 5,   {align:"right"});
  doc.text(formatDateFR(dateDoc), rx, y + 10,  {align:"right"});
  doc.setTextColor(...RED);
  doc.text(dateValidite(dateDoc), rx, y + 14.5, {align:"right"});
  y += 20;

  y = drawClientBloc(doc, y, clientOrg, clientSiren, clientCont, clientEmail, clientAddress, "ÉMETTEUR", "ADRESSÉ À");
  y = drawTable(doc, y, lignes);

  // Total
  const tw = 80, tx = PW - MR - tw, th = 14;
  doc.setFillColor(...DARK); doc.roundedRect(tx, y, tw, th, 2, 2, "F");
  doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(...WHITE);
  doc.text("TOTAL :", tx + 4, y + 10);
  doc.text(formatEur(total), tx + tw - 4, y + 10, {align:"right"});
  y += th + 7;

  // RIB + conditions (comme la facture)
  y = drawFooterBlocs(doc, y, conditions);

  // Mention TVA
  y = drawTVAMention(doc, y);

  // Bloc "Bon pour accord"
  if (y + 46 > PH - 10) { doc.addPage(); y = 14; }

  doc.setFillColor(254,249,245); doc.setDrawColor(...RED); doc.setLineWidth(0.4);
  doc.roundedRect(ML, y, CW, 12, 2, 2, "FD");
  doc.setFont("helvetica","italic"); doc.setFontSize(8.5); doc.setTextColor(80,40,30);
  const mentionLines = doc.splitTextToSize(
    "Si ce devis vous convient, merci de nous le retourner signé, précédé de la mention « Bon pour accord ».",
    CW - 12
  );
  doc.text(mentionLines, ML + 6, y + 5);
  y += 17;

  // Zones date + signature
  const zw = (CW - 8) / 2, zh = 24;

  doc.setFillColor(252,252,252); doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, zw, zh, 2, 2, "FD");
  doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...DARK);
  doc.text("Date :", ML + 5, y + 7);
  doc.setFont("helvetica","normal"); doc.setTextColor(...MUTED);
  doc.text("Le ........................................", ML + 5, y + 15);

  const sx = ML + zw + 8;
  doc.setFillColor(252,252,252); doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
  doc.roundedRect(sx, y, zw, zh, 2, 2, "FD");
  doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...DARK);
  doc.text("Signature :", sx + 5, y + 7);
  doc.setFont("helvetica","normal"); doc.setTextColor(...MUTED);
  doc.text("Bon pour accord", sx + 5, y + 15);
  doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
  doc.line(sx + 5, y + 22, sx + zw - 5, y + 22);

  drawPageFooter(doc);

  return doc;
}
