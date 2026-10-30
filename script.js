let locataires = JSON.parse(localStorage.getItem("badloyers_locataires")) || [];
let paiements = JSON.parse(localStorage.getItem("badloyers_paiements")) || [];

function sauvegarder() {
  localStorage.setItem("badloyers_locataires", JSON.stringify(locataires));
  localStorage.setItem("badloyers_paiements", JSON.stringify(paiements));
}

function moisActuel() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function montant(n) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

function nomMois(valeur) {
  const [annee, mois] = valeur.split("-");
  return new Date(Number(annee), Number(mois) - 1, 1)
    .toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function dateFr(timestamp) {
  return new Date(timestamp).toLocaleDateString("fr-FR");
}

function proteger(texte) {
  const div = document.createElement("div");
  div.textContent = texte;
  return div.innerHTML;
}

function payePourMois(id, mois) {
  return paiements
    .filter(p => p.idLocataire === id && p.mois === mois)
    .reduce((total, p) => total + p.montant, 0);
}

function afficher() {
  const mois = moisActuel();
  let encaisse = 0;
  let impayes = 0;
  const liste = document.getElementById("liste-locataires");
  liste.innerHTML = "";

  if (locataires.length === 0) {
    liste.innerHTML = '<p class="vide">Aucun locataire pour le moment. Ajoutez-en un !</p>';
  }

  locataires.forEach(l => {
    const paye = payePourMois(l.id, mois);
    const reste = Math.max(l.loyer - paye, 0);
    encaisse += paye;
    impayes += reste;

    liste.innerHTML += `
      <div class="locataire">
        <div class="info">
          <h4>${proteger(l.nom)}</h4>
          <p>🏠 ${proteger(l.logement)} · 📞 ${proteger(l.telephone)}</p>
          <p>Loyer : ${montant(l.loyer)} · Payé ce mois : ${montant(paye)}</p>
        </div>
        <div class="droite">
          <span class="badge ${reste === 0 ? "ok" : "ko"}">
            ${reste === 0 ? "Payé ✅" : "Reste " + montant(reste)}
          </span>
          <div class="groupe-boutons">
            <button class="mini" onclick="ouvrirHistorique(${l.id})">🧾 Historique</button>
            ${reste > 0 ? `<button class="mini wa" onclick="relancer(${l.id})">📲 Relancer</button>` : ""}
            <button class="supprimer" onclick="supprimerLocataire(${l.id})">🗑️</button>
          </div>
        </div>
      </div>`;
  });

  document.getElementById("total-encaisse").textContent = montant(encaisse);
  document.getElementById("total-impayes").textContent = montant(impayes);
  document.getElementById("total-locataires").textContent = locataires.length;
}

function ouvrir(idFenetre) {
  document.getElementById(idFenetre).classList.add("ouvert");
}

function fermerTout() {
  document.querySelectorAll(".fond").forEach(f => f.classList.remove("ouvert"));
}

function supprimerLocataire(id) {
  if (confirm("Supprimer ce locataire et ses paiements ?")) {
    locataires = locataires.filter(l => l.id !== id);
    paiements = paiements.filter(p => p.idLocataire !== id);
    sauvegarder();
    afficher();
  }
}

function relancer(id) {
  const l = locataires.find(x => x.id === id);
  const mois = moisActuel();
  const reste = Math.max(l.loyer - payePourMois(l.id, mois), 0);
  let tel = l.telephone.replace(/\D/g, "");
  if (!tel.startsWith("223")) {
    tel = "223" + tel;
  }
  const message = "Bonjour " + l.nom + ", ceci est un rappel de BADLOYERS : il reste "
    + montant(reste) + " à payer pour le loyer de " + nomMois(mois)
    + " (" + l.logement + "). Merci de régulariser. 🙏";
  window.open("https://wa.me/" + tel + "?text=" + encodeURIComponent(message), "_blank");
}

function ouvrirHistorique(id) {
  const l = locataires.find(x => x.id === id);
  document.getElementById("titre-historique").textContent = "Paiements de " + l.nom;
  const zone = document.getElementById("liste-historique");
  const liste = paiements
    .filter(p => p.idLocataire === id)
    .sort((a, b) => b.id - a.id);

  zone.innerHTML = "";
  if (liste.length === 0) {
    zone.innerHTML = '<p class="vide">Aucun paiement enregistré.</p>';
  }

  liste.forEach(p => {
    zone.innerHTML += `
      <div class="ligne-paiement">
        <div>
          <strong>${montant(p.montant)}</strong>
          <p>${nomMois(p.mois)} · saisi le ${dateFr(p.id)}</p>
        </div>
        <div class="groupe-boutons">
          <button class="mini" onclick="voirQuittance(${p.id})">🧾 Quittance</button>
          <button class="supprimer" onclick="supprimerPaiement(${p.id}, ${id})">🗑️</button>
        </div>
      </div>`;
  });

  ouvrir("modal-historique");
}

function supprimerPaiement(idPaiement, idLocataire) {
  if (confirm("Supprimer ce paiement ?")) {
    paiements = paiements.filter(p => p.id !== idPaiement);
    sauvegarder();
    afficher();
    ouvrirHistorique(idLocataire);
  }
}

function voirQuittance(idPaiement) {
  const p = paiements.find(x => x.id === idPaiement);
  const l = locataires.find(x => x.id === p.idLocataire);
  const reste = Math.max(l.loyer - payePourMois(l.id, p.mois), 0);

  document.getElementById("recu").innerHTML = `
    <div class="recu">
      <h2>QUITTANCE DE LOYER</h2>
      <p class="marque">BADLOYERS · Bamako, Mali</p>
      <p><strong>N° :</strong> ${String(p.id).slice(-6)}</p>
      <p><strong>Reçu de :</strong> ${proteger(l.nom)}</p>
      <p><strong>Logement :</strong> ${proteger(l.logement)}</p>
      <p><strong>Montant reçu :</strong> ${montant(p.montant)}</p>
      <p><strong>Pour le mois de :</strong> ${nomMois(p.mois)}</p>
      <p><strong>Loyer mensuel :</strong> ${montant(l.loyer)}</p>
      <p><strong>Reste à payer :</strong> ${montant(reste)}</p>
      <p><strong>Date :</strong> ${dateFr(p.id)}</p>
      <p class="signature">Signature du bailleur : ____________</p>
    </div>`;

  fermerTout();
  ouvrir("modal-quittance");
}

document.getElementById("btn-locataire").addEventListener("click", () => {
  ouvrir("modal-locataire");
});

document.getElementById("btn-paiement").addEventListener("click", () => {
  if (locataires.length === 0) {
    alert("Ajoutez d'abord un locataire.");
    return;
  }
  const choix = document.getElementById("choix-locataire");
  choix.innerHTML = "";
  locataires.forEach(l => {
    const option = document.createElement("option");
    option.value = l.id;
    option.textContent = l.nom + " - " + l.logement;
    choix.appendChild(option);
  });
  choix.selectedIndex = 0;
  document.getElementById("mois").value = moisActuel();
  ouvrir("modal-paiement");
});

document.getElementById("btn-imprimer").addEventListener("click", () => {
  window.print();
});

document.querySelectorAll("[data-fermer]").forEach(bouton => {
  bouton.addEventListener("click", fermerTout);
});

document.getElementById("form-locataire").addEventListener("submit", e => {
  e.preventDefault();
  locataires.push({
    id: Date.now(),
    nom: document.getElementById("nom").value.trim(),
    telephone: document.getElementById("telephone").value.trim(),
    logement: document.getElementById("logement").value.trim(),
    loyer: Number(document.getElementById("loyer").value)
  });
  sauvegarder();
  afficher();
  e.target.reset();
  fermerTout();
});

document.getElementById("form-paiement").addEventListener("submit", e => {
  e.preventDefault();
  paiements.push({
    id: Date.now(),
    idLocataire: Number(document.getElementById("choix-locataire").value),
    montant: Number(document.getElementById("montant").value),
    mois: document.getElementById("mois").value
  });
  sauvegarder();
  afficher();
  e.target.reset();
  fermerTout();
});

afficher();

// ===== Code d'accès =====
const ecranConnexion = document.getElementById("ecran-connexion");

function coder(texte) {
  return btoa(encodeURIComponent(texte));
}

function afficherConnexion() {
  const existe = localStorage.getItem("badloyers_code");
  document.getElementById("texte-connexion").textContent = existe
    ? "Entrez votre code d'accès"
    : "Créez votre code d'accès";
  document.getElementById("code").value = "";
  document.getElementById("erreur-connexion").textContent = "";
  ecranConnexion.classList.remove("cache");
}

function validerConnexion() {
  const saisi = document.getElementById("code").value.trim();
  const erreur = document.getElementById("erreur-connexion");
  const enregistre = localStorage.getItem("badloyers_code");

  if (!enregistre) {
    if (saisi.length < 4) {
      erreur.textContent = "Le code doit avoir au moins 4 caractères.";
      return;
    }
    localStorage.setItem("badloyers_code", coder(saisi));
  } else if (coder(saisi) !== enregistre) {
    erreur.textContent = "Code incorrect.";
    return;
  }

  sessionStorage.setItem("badloyers_ok", "1");
  ecranConnexion.classList.add("cache");
}

document.getElementById("btn-connexion").addEventListener("click", validerConnexion);

document.getElementById("code").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    validerConnexion();
  }
});

document.getElementById("btn-verrouiller").addEventListener("click", () => {
  sessionStorage.removeItem("badloyers_ok");
  afficherConnexion();
});

if (!sessionStorage.getItem("badloyers_ok")) {
  afficherConnexion();
}

// ===== Export Excel =====
function exporter() {
  const lignes = [["Locataire", "Téléphone", "Logement", "Loyer mensuel", "Mois", "Montant payé", "Date de saisie"]];

  locataires.forEach(l => {
    const liste = paiements.filter(p => p.idLocataire === l.id);
    if (liste.length === 0) {
      lignes.push([l.nom, l.telephone, l.logement, l.loyer, "", "", ""]);
    }
    liste.forEach(p => {
      lignes.push([l.nom, l.telephone, l.logement, l.loyer, p.mois, p.montant, dateFr(p.id)]);
    });
  });

  const csv = lignes
    .map(ligne => ligne.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(";"))
    .join("\r\n");

  const fichier = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(fichier);
  lien.download = "badloyers_export.csv";
  lien.click();
  URL.revokeObjectURL(lien.href);
}

document.getElementById("btn-export").addEventListener("click", exporter);