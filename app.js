/* ══════════════════════════════════════════════════════════════════
   Aix en Vue – Générateur de Factures
   app.js – Logique métier + génération PDF (jsPDF)
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

// ── État ───────────────────────────────────────────────────────────
let lignes = [];
let logoBase64 = null;

// ── Init ───────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Date du jour par défaut
  document.getElementById("dateFacture").value = new Date().toISOString().split("T")[0];

  // Pré-charger le logo en base64
  loadLogoBase64();

  // Première ligne
  addLigne();

  // Boutons
  document.getElementById("btnAdd").addEventListener("click", addLigne);
  document.getElementById("btnGenerate").addEventListener("click", genererPDF);
});

// ── Chargement logo ────────────────────────────────────────────────
function loadLogoBase64() {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width  = img.naturalWidth  || 200;
      canvas.height = img.naturalHeight || 200;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      logoBase64 = canvas.toDataURL("image/png");
    } catch (e) {
      console.warn("Logo non chargeable (CORS) :", e);
      logoBase64 = null;
    }
  };
  img.onerror = () => { logoBase64 = null; };
  img.src = ASSO.logoUrl + "?t=" + Date.now();
  // Met aussi à jour le header HTML
  const headerImg = document.getElementById("logoImg");
  if (headerImg) headerImg.src = ASSO.logoUrl;
}

// ── Gestion des lignes ─────────────────────────────────────────────
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
  if (field === "designation") {
    l.designation = value;
  } else if (field === "quantite") {
    l.quantite = Math.max(1, parseFloat(value) || 1);
  } else if (field === "prixUnitaire") {
    l.prixUnitaire = Math.max(0, parseFloat(value) || 0);
  }
  updateLigneTotal(id);
  updateTotaux();
}

function updateLigneTotal(id) {
  const l = lignes.find(l => l.id === id);
  if (!l) return;
  const el = document.getElementById(`total-${id}`);
  if (el) el.textContent = formatEur(l.quantite * l.prixUnitaire);
}

function renderLignes() {
  const container = document.getElementById("lignes-container");
  container.innerHTML = "";
  lignes.forEach(l => {
    const row = document.createElement("div");
    row.className = "ligne-row";
    row.id = `ligne-${l.id}`;
    row.innerHTML = `
      <input type="text"   class="col-des"  placeholder="Description de la prestation"
             value="${escHtml(l.designation)}"
             oninput="updateLigne(${l.id}, 'designation', this.value)" />
      <input type="number" class="col-qty"  min="1" step="1"
             value="${l.quantite}"
             oninput="updateLigne(${l.id}, 'quantite', this.value)" />
      <input type="number" class="col-pu"   min="0" step="10"
             value="${l.prixUnitaire}"
             oninput="updateLigne(${l.id}, 'prixUnitaire', this.value)" />
      <div class="ligne-total col-tot" id="total-${l.id}">${formatEur(l.quantite * l.prixUnitaire)}</div>
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

// ── Utilitaires ────────────────────────────────────────────────────
function formatEur(val) {
  return val.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showAlert(msg) {
  const el = document.getElementById("alertMsg");
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

function formatDateFR(dateStr) {
  if (!dateStr) return new Date().toLocaleDateString("fr-FR");
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// ── Génération PDF ─────────────────────────────────────────────────
function genererPDF() {
  // Validation
  const numFacture = document.getElementById("numFacture").value.trim();
  const clientOrg  = document.getElementById("clientOrg").value.trim();

  if (!numFacture) { showAlert("⚠️ Veuillez renseigner le numéro de facture."); return; }
  if (!clientOrg)  { showAlert("⚠️ Veuillez renseigner le nom de l'organisation cliente."); return; }
  if (lignes.every(l => !l.designation.trim())) {
    showAlert("⚠️ Ajoutez au moins une prestation avec une désignation.");
    return;
  }

  const btn = document.getElementById("btnGenerate");
  btn.classList.add("loading");
  btn.textContent = "Génération…";

  // Légère pause pour l'UI
  setTimeout(() => {
    try {
      buildPDF();
    } finally {
      btn.classList.remove("loading");
      btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2v10M6 8l4 4 4-4M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Générer la facture PDF`;
    }
  }, 50);
}

function buildPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const numFacture  = document.getElementById("numFacture").value.trim();
  const numDevis    = document.getElementById("numDevis").value.trim();
  const dateFacture = document.getElementById("dateFacture").value;
  const clientOrg   = document.getElementById("clientOrg").value.trim();
  const clientSiren = document.getElementById("clientSiren").value.trim();
  const clientCont  = document.getElementById("clientContact").value.trim();
  const clientEmail = document.getElementById("clientEmail").value.trim();

  const total    = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  const acompte  = total * 0.40;
  const solde    = total * 0.60;

  // ── Couleurs & polices ────────────────────────────────────────────
  const RED    = [192, 57, 43];
  const DARK   = [30, 30, 30];
  const WHITE  = [255, 255, 255];
  const LIGHT  = [250, 248, 248];
  const BORDER = [220, 220, 220];
  const MUTED  = [120, 120, 120];

  const PW = 210; // page width mm
  const PH = 297;
  const ML = 16;  // margin left
  const MR = 16;  // margin right
  const CW = PW - ML - MR; // content width

  let y = 0;

  // ══ BANDE ROUGE HAUT ════════════════════════════════════════════
  doc.setFillColor(...RED);
  doc.rect(0, 0, PW, 6, "F");

  y = 12;

  // ══ LOGO (si disponible) ════════════════════════════════════════
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", ML, y, 36, 22, undefined, "FAST");
    } catch(e) { /* ignore */ }
  }

  // ══ INFOS ASSO (droite) ══════════════════════════════════════════
  const rx = PW - MR;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.text(ASSO.nom, rx, y + 4, { align: "right" });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...RED);
  doc.text(ASSO.sousTitre, rx, y + 9, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(ASSO.statut, rx, y + 14, { align: "right" });
  doc.text(`${ASSO.adresse} – ${ASSO.cpVille}`, rx, y + 19, { align: "right" });
  doc.text(`${ASSO.tel}   ${ASSO.email}`, rx, y + 24, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(150, 150, 150);
  doc.text(`SIRET : ${ASSO.siret}`, rx, y + 29, { align: "right" });

  y += 34;

  // ══ LIGNE SÉPARATRICE ════════════════════════════════════════════
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.6);
  doc.line(ML, y, PW - MR, y);
  y += 8;

  // ══ BANDE "FACTURE" ════════════════════════════════════════════
  doc.setFillColor(...DARK);
  doc.roundedRect(ML, y, CW, 18, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...WHITE);
  doc.text("FACTURE", ML + 8, y + 12);

  // Références (droite dans la bande)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  const refX = PW - MR - 6;
  doc.text(`N° Facture :`, refX - 22, y + 7, { align: "right" });
  doc.text(`N° Devis :`,   refX - 22, y + 12, { align: "right" });
  doc.text(`Date :`,       refX - 22, y + 17, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text(numFacture || "—",             refX, y + 7,  { align: "right" });
  doc.text(numDevis   || "—",             refX, y + 12, { align: "right" });
  doc.text(formatDateFR(dateFacture),     refX, y + 17, { align: "right" });

  y += 26;

  // ══ BLOCS ÉMETTEUR / CLIENT ═══════════════════════════════════════
  const bw = (CW - 8) / 2;
  const bh = 32;

  // Émetteur
  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, bw, bh, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...RED);
  doc.text("ÉMETTEUR", ML + 5, y + 6);

  doc.setLineWidth(0.2);
  doc.setDrawColor(...BORDER);
  doc.line(ML + 4, y + 8, ML + bw - 4, y + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(ASSO.nom, ML + 5, y + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(ASSO.adresse, ML + 5, y + 20);
  doc.text(ASSO.cpVille, ML + 5, y + 25);
  doc.text(`SIRET : ${ASSO.siret}`, ML + 5, y + 30);

  // Client
  const cx = ML + bw + 8;
  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(cx, y, bw, bh, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...RED);
  doc.text("FACTURÉ À", cx + 5, y + 6);

  doc.setLineWidth(0.2);
  doc.setDrawColor(...BORDER);
  doc.line(cx + 4, y + 8, cx + bw - 4, y + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(clientOrg || "—", cx + 5, y + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  let cy2 = y + 20;
  if (clientSiren) { doc.text(`SIREN : ${clientSiren}`, cx + 5, cy2); cy2 += 6; }
  if (clientCont)  { doc.text(`Contact : ${clientCont}`, cx + 5, cy2); cy2 += 6; }
  if (clientEmail) { doc.text(clientEmail, cx + 5, cy2); }

  y += bh + 10;

  // ══ TABLEAU DES PRESTATIONS ════════════════════════════════════
  const tableBody = lignes
    .filter(l => l.designation.trim())
    .map(l => [
      l.designation,
      String(l.quantite),
      formatEur(l.prixUnitaire),
      formatEur(l.quantite * l.prixUnitaire),
    ]);

  if (tableBody.length === 0) {
    tableBody.push(["—", "—", "—", "—"]);
  }

  doc.autoTable({
    startY: y,
    head: [["Désignation", "Qté", "Prix forfaitaire", "Total"]],
    body: tableBody,
    margin: { left: ML, right: MR },
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: { top: 5, right: 6, bottom: 5, left: 6 },
      lineWidth: 0.1,
      lineColor: BORDER,
    },
    headStyles: {
      fillColor: RED,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: { top: 6, right: 6, bottom: 6, left: 6 },
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 18, halign: "center" },
      2: { cellWidth: 38, halign: "right" },
      3: { cellWidth: 36, halign: "right", fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: [253, 248, 247] },
    tableLineColor: BORDER,
    tableLineWidth: 0.2,
  });

  y = doc.lastAutoTable.finalY + 8;

  // ══ BLOC TOTAL ═════════════════════════════════════════════════
  const tw = 80;
  const tx = PW - MR - tw;
  const th = 32;

  doc.setFillColor(...DARK);
  doc.roundedRect(tx, y, tw, th, 2, 2, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text("Acompte (40%) :", tx + 4, y + 9);
  doc.text("Solde (60%) :",   tx + 4, y + 17);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text(formatEur(acompte), tx + tw - 4, y + 9,  { align: "right" });
  doc.text(formatEur(solde),   tx + tw - 4, y + 17, { align: "right" });

  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.2);
  doc.line(tx + 4, y + 20, tx + tw - 4, y + 20);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.text("TOTAL TTC :", tx + 4, y + 28);
  doc.text(formatEur(total), tx + tw - 4, y + 28, { align: "right" });

  y += th + 10;

  // ══ FOOTER : RIB + CONDITIONS ══════════════════════════════════
  // Vérif espace restant
  if (y + 55 > PH - 16) {
    doc.addPage();
    y = 20;
  }

  const fw = (CW - 8) / 2;

  // RIB
  doc.setFillColor(248, 248, 248);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, fw, 28, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...RED);
  doc.text("COORDONNÉES BANCAIRES", ML + 5, y + 7);
  doc.setLineWidth(0.2);
  doc.line(ML + 4, y + 9, ML + fw - 4, y + 9);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  doc.text("IBAN :", ML + 5, y + 16);
  doc.setFont("helvetica", "normal");
  doc.text(ASSO.iban, ML + 18, y + 16);

  doc.setFont("helvetica", "bold");
  doc.text("BIC :", ML + 5, y + 23);
  doc.setFont("helvetica", "normal");
  doc.text(ASSO.bic, ML + 16, y + 23);

  // Conditions de règlement
  const condX = ML + fw + 8;
  doc.setFillColor(248, 248, 248);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(condX, y, fw, 28, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...RED);
  doc.text("CONDITIONS DE RÈGLEMENT", condX + 5, y + 7);
  doc.setLineWidth(0.2);
  doc.line(condX + 4, y + 9, condX + fw - 4, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const condLines = doc.splitTextToSize(ASSO.conditions, fw - 10);
  doc.text(condLines, condX + 5, y + 16);

  y += 36;

  // ══ MENTION TVA ════════════════════════════════════════════════
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(7.5);
  const tvaLines = doc.splitTextToSize(`Aix en vue étant une association régie par la Loi 1901, les prestations ne sont pas assujetties à TVA.`, CW - 14);
  const tvaLineHeight = 4.5;
  const tvaPadding    = 8;  // top + bottom padding
  const tvaH = tvaLines.length * tvaLineHeight + tvaPadding;

  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.8);
  doc.rect(ML, y, CW, tvaH, "FD");
  // trait rouge gauche
  doc.setFillColor(...RED);
  doc.rect(ML, y, 3, tvaH, "F");

  doc.setTextColor(100, 40, 40);
  doc.text(tvaLines, ML + 7, y + 5.5, { lineHeightFactor: 1.4 });

  // ══ PIED DE PAGE ═══════════════════════════════════════════════
  const fyBot = PH - 10;
  doc.setFillColor(...RED);
  doc.rect(0, PH - 6, PW, 6, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(
    `${ASSO.nom}  ·  ${ASSO.statut}  ·  SIRET ${ASSO.siret}`,
    PW / 2, fyBot - 3, { align: "center" }
  );

  // ── Sauvegarde ──────────────────────────────────────────────────
  const safeName = clientOrg.replace(/[^a-z0-9]/gi, "_").substring(0, 30);
  const safeNum  = numFacture.replace(/[^a-z0-9]/gi, "-");
  doc.save(`Facture_${safeNum}_${safeName}.pdf`);
}
