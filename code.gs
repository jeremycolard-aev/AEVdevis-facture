function doGet(e) {
  // ID de votre Spreadsheet
  var spreadsheetId = "1XA_G7dIh5ZbiQbKsjEbZAqtI9sppebJ3lKCrJNNnfl4";
  
  // 1. Gestion des actions spécifiques (Ex: Suppression d'un document)
  if (e && e.parameter && e.parameter.action) {
    if (e.parameter.action === "deleteDocument") {
      return deleteDocumentRow(spreadsheetId, e.parameter.id);
    }
  }
  
  // 2. Action par défaut : Récupération globale des données (Contacts + Documents)
  return getAllData(spreadsheetId);
}

function doPost(e) {
  // ID de votre Spreadsheet
  var spreadsheetId = "1XA_G7dIh5ZbiQbKsjEbZAqtI9sppebJ3lKCrJNNnfl4";
  
  try {
    var postData = JSON.parse(e.postData.contents);
    if (postData.action === "createDocument") {
      return createDocument(spreadsheetId, postData);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Récupère et filtre les données des feuilles "contact" et "document"
 */
function getAllData(spreadsheetId) {
  try {
    var ss = SpreadsheetApp.openById(spreadsheetId);
    var responseData = { contacts: [], documents: [] };
    
    // ---- SECTION 1 : LES CONTACTS ----
    var contactSheet = ss.getSheetByName("contact");
    if (contactSheet) {
      var contactValues = contactSheet.getDataRange().getValues();
      for (var i = 1; i < contactValues.length; i++) {
        var row = contactValues[i];
        if (!row[0] && !row[1] && !row[2]) continue; // Ignore les lignes vides
        
        responseData.contacts.push({
          id: row[0] ? row[0].toString().trim() : "",
          organisation: row[1] ? row[1].toString().trim() : "",
          nom: row[2] ? row[2].toString().trim() : "",
          mobile: row[3] ? row[3].toString().trim() : "",
          email: row[4] ? row[4].toString().trim() : "",
          adresse: row[7] ? row[7].toString().trim() : "",
          siret: row[8] ? row[8].toString().trim() : ""
        });
      }
      // Tri par organisation
      responseData.contacts.sort(function(a, b) {
        if (!a.organisation) return 1;
        if (!b.organisation) return -1;
        return a.organisation.localeCompare(b.organisation, 'fr', { sensitivity: 'base' });
      });
    }
    
    // ---- SECTION 2 : LES DOCUMENTS ----
    var docSheet = ss.getSheetByName("document");
    if (docSheet) {
      var docValues = docSheet.getDataRange().getValues();
      for (var j = 1; j < docValues.length; j++) {
        var dRow = docValues[j];
        var dossierId = dRow[4] ? dRow[4].toString().trim() : "";
        
        // Filtrage strict par type de dossier requis
        var typeDoc = "";
        if (dossierId === "803297a7") {
          typeDoc = "Devis";
        } else if (dossierId === "2fa31b91") {
          typeDoc = "Facture";
        } else {
          continue; // On ignore totalement les autres dossiers
        }
        
        responseData.documents.push({
          id: dRow[0] ? dRow[0].toString().trim() : "",
          titre: dRow[1] ? dRow[1].toString().trim() : "",
          url: dRow[3] ? dRow[3].toString().trim() : "",
          type: typeDoc,
          datetime: dRow[5] ? dRow[5].toString().trim() : ""
        });
      }
      
      // Tri optionnel des documents du plus récent au plus ancien
      responseData.documents.sort(function(a, b) {
        return b.datetime.localeCompare(a.datetime);
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify(responseData))
                         .setMimeType(ContentService.MimeType.JSON);
                         
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Crée un fichier PDF sur Google Drive et ajoute sa ligne correspondante dans la feuille "document"
 */
function createDocument(spreadsheetId, data) {
  try {
    var title = data.title;
    var base64Data = data.pdfBase64;
    var type = data.type; // "devis" ou "facture"
    
    // Convertir le Base64 en Blob PDF
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), "application/pdf", title + ".pdf");
    
    // Dossier Drive de destination
    var folderId = "1uG70nZ3sWbI--EEMtRMaDnNe32y6yE42";
    var folder = DriveApp.getFolderById(folderId);
    
    // Créer le fichier sur Drive et accorder les droits de lecture publique via le lien
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var fileUrl = file.getUrl();
    
    // Ajouter une ligne dans la feuille "document"
    var ss = SpreadsheetApp.openById(spreadsheetId);
    var sheet = ss.getSheetByName("document");
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "La feuille 'document' est introuvable." }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    var uniqueId = Utilities.getUuid().substring(0, 8); // ID unique court
    var folderCode = type === "devis" ? "803297a7" : "2fa31b91";
    
    // Date et heure actuelle (format: dd/MM/yyyy HH:mm:ss) dans le fuseau horaire de Paris
    var formattedDate = Utilities.formatDate(new Date(), "Europe/Paris", "dd/MM/yyyy HH:mm:ss");
    
    sheet.appendRow([
      uniqueId,       // A: uniqueid
      title,          // B: titre
      "",             // C: laisser vide
      fileUrl,        // D: url du pdf
      folderCode,     // E: dossier
      formattedDate   // F: datetime
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      id: uniqueId, 
      url: fileUrl, 
      datetime: formattedDate 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Supprime une ligne de document basée sur son ID unique (Colonne A)
 */
function deleteDocumentRow(spreadsheetId, docId) {
  try {
    if (!docId) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "ID du document manquant." }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    var ss = SpreadsheetApp.openById(spreadsheetId);
    var sheet = ss.getSheetByName("document");
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "La feuille 'document' est introuvable." }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    var values = sheet.getDataRange().getValues();
    var hasBeenDeleted = false;
    
    // Recherche de l'ID en partant du bas vers le haut
    for (var i = values.length - 1; i >= 1; i--) {
      if (values[i][0].toString().trim() === docId.toString().trim()) {
        sheet.deleteRow(i + 1); // L'index dans l'API Sheet commence à 1 (le tableau values commence à 0)
        hasBeenDeleted = true;
        break; // Stop dès qu'on a trouvé et supprimé l'élément
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: hasBeenDeleted, 
      error: hasBeenDeleted ? null : "Aucun document trouvé avec l'ID : " + docId 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}
