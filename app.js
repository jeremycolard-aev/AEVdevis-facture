/* ══════════════════════════════════════════════════════════════════
   Aix en Vue – Générateur de Devis & Factures
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

// ── État global ────────────────────────────────────────────────────
let lignes    = [];
let logoBase64 = null;
let modeDoc   = "devis"; // "devis" | "facture"

// ── Init ───────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("dateDoc").value = new Date().toISOString().split("T")[0];

  loadLogoBase64();
  addLigne();

  document.getElementById("btnAdd").addEventListener("click", addLigne);
  document.getElementById("btnGenerate").addEventListener("click", genererPDF);

  document.getElementById("btnTypeDevis").addEventListener("click",   () => setMode("devis"));
  document.getElementById("btnTypeFacture").addEventListener("click", () => setMode("facture"));

  setMode("devis"); // état initial
});

// ── Gestion mode devis / facture ───────────────────────────────────
function setMode(mode) {
  modeDoc = mode;

  // Boutons toggle
  document.getElementById("btnTypeDevis").classList.toggle("active",   mode === "devis");
  document.getElementById("btnTypeFacture").classList.toggle("active", mode === "facture");

  // Champ num facture : visible seulement en mode facture
  const fieldFac = document.getElementById("fieldNumFacture");
  const gridRefs = document.getElementById("gridRefs");

  if (mode === "devis") {
    fieldFac.classList.add("hidden-field");
    gridRefs.classList.add("mode-devis");
    document.getElementById("labelDate").textContent  = "Date du devis";
    document.getElementById("labelNumDevis").innerHTML = "Numéro de devis <span class=\"req\">*</span>";
    document.getElementById("btnLabel").textContent   = "Générer le devis PDF";
    // Cacher acompte/solde sur le devis (pas encore contractuel)
    document.getElementById("rowAcompte").classList.add("row-hidden");
    document.getElementById("rowSolde").classList.add("row-hidden");
  } else {
    fieldFac.classList.remove("hidden-field");
    gridRefs.classList.remove("mode-devis");
    document.getElementById("labelDate").textContent  = "Date de la facture";
    document.getElementById("labelNumDevis").innerHTML = "Numéro de devis";
    document.getElementById("btnLabel").textContent   = "Générer la facture PDF";
    document.getElementById("rowAcompte").classList.remove("row-hidden");
    document.getElementById("rowSolde").classList.remove("row-hidden");
  }
}

// ── Logo base64 ────────────────────────────────────────────────────
function loadLogoBase64() {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width  = img.naturalWidth  || 200;
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

// ── Lignes de prestation ───────────────────────────────────────────
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
  if (field === "designation")   l.designation   = value;
  else if (field === "quantite") l.quantite       = Math.max(1, parseFloat(value) || 1);
  else if (field === "pu")       l.prixUnitaire   = Math.max(0, parseFloat(value) || 0);
  updateLigneTotal(id);
  updateTotaux();
}

function updateLigneTotal(id) {
  const l  = lignes.find(l => l.id === id);
  const el = document.getElementById(`total-${id}`);
  if (l && el) el.textContent = formatEur(l.quantite * l.prixUnitaire);
}

function renderLignes() {
  const container = document.getElementById("lignes-container");
  container.innerHTML = "";
  lignes.forEach(l => {
    const row = document.createElement("div");
    row.className = "ligne-row";
    row.id = `ligne-${l.id}`;
    row.innerHTML = `
      <input type="text" placeholder="Description de la prestation"
             value="${escHtml(l.designation)}"
             oninput="updateLigne(${l.id},'designation',this.value)" />
      <div class="mobile-nums">
        <div class="mobile-num-field">
          <span class="mobile-num-label">Quantité</span>
          <input type="number" min="1" step="1" value="${l.quantite}"
                 oninput="updateLigne(${l.id},'quantite',this.value)" />
        </div>
        <div class="mobile-num-field">
          <span class="mobile-num-label">Prix unit.</span>
          <input type="number" min="0" step="10" value="${l.prixUnitaire}"
                 oninput="updateLigne(${l.id},'pu',this.value)" />
        </div>
        <div class="mobile-num-field">
          <span class="mobile-num-label">Total</span>
          <div class="ligne-total" id="total-${l.id}">${formatEur(l.quantite * l.prixUnitaire)}</div>
        </div>
      </div>
      <button class="btn-del" onclick="deleteLigne(${l.id})" title="Supprimer">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>`;
    container.appendChild(row);
  });
  updateTotaux();
}

function updateTotaux() {
  const total = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  document.getElementById("totGeneral").textContent = formatEur(total);
  document.getElementById("totAcompte").textContent = formatEur(total * 0.40);
  document.getElementById("totSolde").textContent   = formatEur(total * 0.60);
}

// ── Helpers ────────────────────────────────────────────────────────
function formatEur(val) {
  return val.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " \u20ac";
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
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

// Ajoute 3 mois à une date ISO
function dateValidite(str) {
  const d = str ? new Date(str) : new Date();
  d.setMonth(d.getMonth() + 3);
  return d.toLocaleDateString("fr-FR");
}

// ── Génération PDF ─────────────────────────────────────────────────
function genererPDF() {
  const isDevis     = modeDoc === "devis";
  const numDevis    = document.getElementById("numDevis").value.trim();
  const numFacture  = document.getElementById("numFacture").value.trim();
  const dateDoc     = document.getElementById("dateDoc").value;
  const clientOrg   = document.getElementById("clientOrg").value.trim();
  const clientSiren = document.getElementById("clientSiren").value.trim();
  const clientCont  = document.getElementById("clientContact").value.trim();
  const clientEmail = document.getElementById("clientEmail").value.trim();

  // Validation
  const numRef = isDevis ? numDevis : numFacture;
  const labelRef = isDevis ? "le numéro de devis" : "le numéro de facture";
  if (!numRef)    { showAlert(`\u26a0\ufe0f Veuillez renseigner ${labelRef}.`); return; }
  if (!clientOrg) { showAlert("\u26a0\ufe0f Veuillez renseigner le nom de l'organisation cliente."); return; }
  if (lignes.every(l => !l.designation.trim())) {
    showAlert("\u26a0\ufe0f Ajoutez au moins une prestation avec une désignation.");
    return;
  }

  const btn = document.getElementById("btnGenerate");
  btn.classList.add("loading");

  setTimeout(() => {
    try {
      isDevis ? buildDevisPDF(numDevis, dateDoc, clientOrg, clientSiren, clientCont, clientEmail)
              : buildFacturePDF(numDevis, numFacture, dateDoc, clientOrg, clientSiren, clientCont, clientEmail);
    } finally {
      btn.classList.remove("loading");
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
  doc.rect(0, 0, PW, 6, "F");
}

function drawHeader(doc, y) {
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", ML, y, 36, 22, undefined, "FAST"); } catch(e) {}
  }
  const rx = PW - MR;
  doc.setFont("helvetica", "bold");   doc.setFontSize(11); doc.setTextColor(...DARK);
  doc.text(ASSO.nom, rx, y + 4, { align: "right" });
  doc.setFont("helvetica", "italic"); doc.setFontSize(8);  doc.setTextColor(...RED);
  doc.text(ASSO.sousTitre, rx, y + 9, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);  doc.setTextColor(...MUTED);
  doc.text(ASSO.statut, rx, y + 14, { align: "right" });
  doc.text(`${ASSO.adresse} – ${ASSO.cpVille}`, rx, y + 19, { align: "right" });
  doc.text(`${ASSO.tel}   ${ASSO.email}`, rx, y + 24, { align: "right" });
  doc.setFontSize(7.5); doc.setTextColor(150,150,150);
  doc.text(`SIRET : ${ASSO.siret}`, rx, y + 29, { align: "right" });
  return y + 34;
}

function drawSeparator(doc, y) {
  doc.setDrawColor(...RED); doc.setLineWidth(0.6);
  doc.line(ML, y, PW - MR, y);
  return y + 8;
}

function drawClientBloc(doc, y, clientOrg, clientSiren, clientCont, clientEmail, emetteurLabel, clientLabel) {
  const bw = (CW - 8) / 2;
  const bh = 32;

  // Émetteur
  doc.setFillColor(...LIGHT); doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, bw, bh, 2, 2, "FD");
  doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(...RED);
  doc.text(emetteurLabel || "ÉMETTEUR", ML + 5, y + 6);
  doc.setLineWidth(0.2); doc.line(ML + 4, y + 8, ML + bw - 4, y + 8);
  doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(...DARK);
  doc.text(ASSO.nom, ML + 5, y + 14);
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(80,80,80);
  doc.text(ASSO.adresse, ML + 5, y + 20);
  doc.text(ASSO.cpVille, ML + 5, y + 25);
  doc.text(`SIRET : ${ASSO.siret}`, ML + 5, y + 30);

  // Client
  const cx = ML + bw + 8;
  doc.setFillColor(...LIGHT); doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
  doc.roundedRect(cx, y, bw, bh, 2, 2, "FD");
  doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(...RED);
  doc.text(clientLabel || "ADRESSÉ À", cx + 5, y + 6);
  doc.setLineWidth(0.2); doc.line(cx + 4, y + 8, cx + bw - 4, y + 8);
  doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(...DARK);
  doc.text(clientOrg || "—", cx + 5, y + 14);
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(80,80,80);
  let cy = y + 20;
  if (clientSiren) { doc.text(`SIREN : ${clientSiren}`, cx + 5, cy); cy += 6; }
  if (clientCont)  { doc.text(`Contact : ${clientCont}`, cx + 5, cy); cy += 6; }
  if (clientEmail) { doc.text(clientEmail, cx + 5, cy); }

  return y + bh + 10;
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
    styles: { font:"helvetica", fontSize:9, cellPadding:{top:5,right:6,bottom:5,left:6}, lineWidth:0.1, lineColor:BORDER },
    headStyles: { fillColor:RED, textColor:WHITE, fontStyle:"bold", fontSize:9, cellPadding:{top:6,right:6,bottom:6,left:6} },
    columnStyles: {
      0: { cellWidth:"auto" },
      1: { cellWidth:18, halign:"center" },
      2: { cellWidth:38, halign:"right" },
      3: { cellWidth:36, halign:"right", fontStyle:"bold" },
    },
    alternateRowStyles: { fillColor:[253,248,247] },
    tableLineColor: BORDER, tableLineWidth: 0.2,
  });
  return doc.lastAutoTable.finalY + 8;
}

function drawFooterBlocs(doc, y) {
  const fw = (CW - 8) / 2;

  // RIB
  doc.setFillColor(248,248,248); doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, fw, 28, 2, 2, "FD");
  doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(...RED);
  doc.text("COORDONNÉES BANCAIRES", ML + 5, y + 7);
  doc.setLineWidth(0.2); doc.line(ML + 4, y + 9, ML + fw - 4, y + 9);
  doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...DARK);
  doc.text("IBAN :", ML + 5, y + 16);
  doc.setFont("helvetica","normal"); doc.text(ASSO.iban, ML + 18, y + 16);
  doc.setFont("helvetica","bold");   doc.text("BIC :", ML + 5, y + 23);
  doc.setFont("helvetica","normal"); doc.text(ASSO.bic, ML + 16, y + 23);

  // Conditions
  const cx = ML + fw + 8;
  doc.setFillColor(248,248,248); doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
  doc.roundedRect(cx, y, fw, 28, 2, 2, "FD");
  doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(...RED);
  doc.text("CONDITIONS DE RÈGLEMENT", cx + 5, y + 7);
  doc.setLineWidth(0.2); doc.line(cx + 4, y + 9, cx + fw - 4, y + 9);
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(80,80,80);
  const condLines = doc.splitTextToSize(ASSO.conditions, fw - 10);
  doc.text(condLines, cx + 5, y + 16);

  return y + 36;
}

function drawTVAMention(doc, y) {
  doc.setFillColor(254,242,242); doc.setDrawColor(...RED); doc.setLineWidth(0.8);
  doc.rect(ML, y, CW, 14, "FD");
  doc.setFillColor(...RED); doc.rect(ML, y, 3, 14, "F");
  doc.setFont("helvetica","bolditalic"); doc.setFontSize(7.5); doc.setTextColor(100,40,40);
  const lines = doc.splitTextToSize(`\u26a0  ${ASSO.tvaMention}`, CW - 12);
  doc.text(lines, ML + 7, y + 5.5);
  return y + 22;
}

function drawPageFooter(doc) {
  const PH = 297;
  doc.setFillColor(...RED); doc.rect(0, PH - 6, PW, 6, "F");
  doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(...MUTED);
  doc.text(`${ASSO.nom}  ·  ${ASSO.statut}  ·  SIRET ${ASSO.siret}`, PW/2, PH - 8, { align:"center" });
}

// ══════════════════════════════════════════════════════════════════
//  BUILD FACTURE PDF
// ══════════════════════════════════════════════════════════════════
function buildFacturePDF(numDevis, numFacture, dateDoc, clientOrg, clientSiren, clientCont, clientEmail) {
  const doc   = newDoc();
  const total = lignes.reduce((s,l) => s + l.quantite * l.prixUnitaire, 0);

  drawTopStripe(doc);
  let y = drawHeader(doc, 12);
  y = drawSeparator(doc, y);

  // Bande FACTURE
  doc.setFillColor(...DARK); doc.roundedRect(ML, y, CW, 18, 2, 2, "F");
  doc.setFont("helvetica","bold"); doc.setFontSize(18); doc.setTextColor(...WHITE);
  doc.text("FACTURE", ML + 8, y + 12);
  const rx = PW - MR - 6;
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(200,200,200);
  doc.text("N° Facture :", rx - 22, y + 7, {align:"right"});
  doc.text("N° Devis :",   rx - 22, y + 12, {align:"right"});
  doc.text("Date :",       rx - 22, y + 17, {align:"right"});
  doc.setFont("helvetica","bold"); doc.setTextColor(...WHITE);
  doc.text(numFacture || "—",         rx, y + 7,  {align:"right"});
  doc.text(numDevis   || "—",         rx, y + 12, {align:"right"});
  doc.text(formatDateFR(dateDoc),     rx, y + 17, {align:"right"});
  y += 26;

  y = drawClientBloc(doc, y, clientOrg, clientSiren, clientCont, clientEmail, "ÉMETTEUR", "FACTURÉ À");
  y = drawTable(doc, y, lignes);

  // Total
  const acompte = total * 0.40;
  const solde   = total * 0.60;
  const tw = 80, tx = PW - MR - tw, th = 32;
  doc.setFillColor(...DARK); doc.roundedRect(tx, y, tw, th, 2, 2, "F");
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(160,160,160);
  doc.text("Acompte (40%) :", tx + 4, y + 9);
  doc.text("Solde (60%) :",   tx + 4, y + 17);
  doc.setFont("helvetica","bold"); doc.setTextColor(...WHITE);
  doc.text(formatEur(acompte), tx + tw - 4, y + 9,  {align:"right"});
  doc.text(formatEur(solde),   tx + tw - 4, y + 17, {align:"right"});
  doc.setDrawColor(80,80,80); doc.setLineWidth(0.2);
  doc.line(tx + 4, y + 20, tx + tw - 4, y + 20);
  doc.setFontSize(11); doc.text("TOTAL TTC :", tx + 4, y + 28);
  doc.text(formatEur(total), tx + tw - 4, y + 28, {align:"right"});
  y += th + 10;

  y = drawFooterBlocs(doc, y);
  drawTVAMention(doc, y);
  drawPageFooter(doc);

  const safe = clientOrg.replace(/[^a-z0-9]/gi,"_").substring(0,30);
  const num  = numFacture.replace(/[^a-z0-9]/gi,"-");
  doc.save(`Facture_${num}_${safe}.pdf`);
}

// ══════════════════════════════════════════════════════════════════
//  BUILD DEVIS PDF
// ══════════════════════════════════════════════════════════════════
function buildDevisPDF(numDevis, dateDoc, clientOrg, clientSiren, clientCont, clientEmail) {
  const doc   = newDoc();
  const total = lignes.reduce((s,l) => s + l.quantite * l.prixUnitaire, 0);
  const PH    = 297;

  drawTopStripe(doc);
  let y = drawHeader(doc, 12);
  y = drawSeparator(doc, y);

  // Bande DEVIS
  doc.setFillColor(...DARK); doc.roundedRect(ML, y, CW, 18, 2, 2, "F");
  doc.setFont("helvetica","bold"); doc.setFontSize(18); doc.setTextColor(...WHITE);
  doc.text("DEVIS", ML + 8, y + 12);
  const rx = PW - MR - 6;
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(200,200,200);
  doc.text("N° Devis :",  rx - 22, y + 7,  {align:"right"});
  doc.text("Date :",      rx - 22, y + 12, {align:"right"});
  doc.text("Valable jusqu'au :", rx - 22, y + 17, {align:"right"});
  doc.setFont("helvetica","bold"); doc.setTextColor(...WHITE);
  doc.text(numDevis || "—",           rx, y + 7,  {align:"right"});
  doc.text(formatDateFR(dateDoc),     rx, y + 12, {align:"right"});
  doc.setTextColor(...RED);
  doc.text(dateValidite(dateDoc),     rx, y + 17, {align:"right"});
  y += 26;

  y = drawClientBloc(doc, y, clientOrg, clientSiren, clientCont, clientEmail, "ÉMETTEUR", "ADRESSÉ À");
  y = drawTable(doc, y, lignes);

  // Total (simplifié pour devis : juste le montant total)
  const tw = 80, tx = PW - MR - tw, th = 22;
  doc.setFillColor(...DARK); doc.roundedRect(tx, y, tw, th, 2, 2, "F");
  doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(...WHITE);
  doc.text("TOTAL :", tx + 4, y + 14);
  doc.text(formatEur(total), tx + tw - 4, y + 14, {align:"right"});
  y += th + 10;

  // Mention TVA
  y = drawTVAMention(doc, y);

  // ── Bloc "Bon pour accord" ────────────────────────────────────
  // Vérif espace
  if (y + 60 > PH - 20) { doc.addPage(); y = 20; }

  // Encadré mention
  doc.setFillColor(254,249,245); doc.setDrawColor(...RED); doc.setLineWidth(0.4);
  doc.roundedRect(ML, y, CW, 16, 2, 2, "FD");
  doc.setFont("helvetica","italic"); doc.setFontSize(9); doc.setTextColor(80,40,30);
  const mentionText = "Si ce devis vous convient, merci de nous le retourner signé, précédé de la mention « Bon pour accord ».";
  const mentionLines = doc.splitTextToSize(mentionText, CW - 12);
  doc.text(mentionLines, ML + 6, y + 6);

  y += 22;

  // Zones date + signature côte à côte
  const zw = (CW - 8) / 2;
  const zh = 32;

  // Zone Date
  doc.setFillColor(252,252,252); doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, zw, zh, 2, 2, "FD");
  doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...DARK);
  doc.text("Date :", ML + 5, y + 8);
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
  doc.text("Le ........................................", ML + 5, y + 18);

  // Zone Signature
  const sx = ML + zw + 8;
  doc.setFillColor(252,252,252); doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
  doc.roundedRect(sx, y, zw, zh, 2, 2, "FD");
  doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...DARK);
  doc.text("Signature :", sx + 5, y + 8);
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
  doc.text("Bon pour accord", sx + 5, y + 18);
  // Ligne de signature
  doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
  doc.line(sx + 5, y + 30, sx + zw - 5, y + 30);

  y += zh + 10;

  drawPageFooter(doc);

  const safe = clientOrg.replace(/[^a-z0-9]/gi,"_").substring(0,30);
  const num  = numDevis.replace(/[^a-z0-9]/gi,"-");
  doc.save(`Devis_${num}_${safe}.pdf`);
}
