const JOUR_ECHEANCE = 5;
const JOURS_RAPPEL = 5;
const UN_JOUR = 24 * 60 * 60 * 1000;

let locataires = JSON.parse(localStorage.getItem("badloyers_locataires")) || [];
let paiements = JSON.parse(localStorage.getItem("badloyers_paiements")) || [];
let filtreActif = "tous";

function sauvegarder() {
  localStorage.setItem("badloyers_locataires", JSON.stringify(locataires));
  localStorage.setItem("badloyers_paiements", JSON.stringify(paiements));
}

function aujourdhui() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function cleMois(date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
}

function moisActuel() {
  return cleMois(new Date());
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

function dateLongue(date) {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function pluriel(n, mot) {
  return n + " " + mot + (n > 1 ? "s" : "");
}

function proteger(texte) {
  const div = document.createElement("div");
  div.textContent = texte;
  return div.innerHTML;
}

function initiales(nom) {
  return nom.split(" ").filter(Boolean).slice(0, 2)
    .map(m => m[0].toUpperCase()).join("");
}

function payePourMois(id, mois) {
  return paiements
    .filter(p => p.idLocataire === id && p.mois === mois)
    .reduce((total, p) => total + p.montant, 0);
}

function prochaineEcheance() {
  const t = aujourdhui();
  let e = new Date(t.getFullYear(), t.getMonth(), JOUR_ECHEANCE);
  if (t > e) {
    e = new Date(t.getFullYear(), t.getMonth() + 1, JOUR_ECHEANCE);
  }
  return e;
}

function etatRappel(l) {
  const t = aujourdhui();
  const echeanceCourante = new Date(t.getFullYear(), t.getMonth(), JOUR_ECHEANCE);
  const moisCourant = cleMois(t);
  const resteCourant = Math.max(l.loyer - payePourMois(l.id, moisCourant), 0);

  if (t > echeanceCourante && resteCourant > 0) {
    return {
      type: "retard",
      jours: Math.round((t - echeanceCourante) / UN_JOUR),
      mois: moisCourant,
      reste: resteCourant,
      echeance: echeanceCourante
    };
  }

  const prochaine = prochaineEcheance();
  const moisProchain = cleMois(prochaine);
  const resteProchain = Math.max(l.loyer - payePourMois(l.id, moisProchain), 0);
  const jours = Math.round((prochaine - t) / UN_JOUR);

  if (jours <= JOURS_RAPPEL && resteProchain > 0) {
    return {
      type: "rappel",
      jours: jours,
      mois: moisProchain,
      reste: resteProchain,
      echeance: prochaine
    };
  }
  return null;
}

function afficher() {
  const mois = moisActuel();
  const recherche = document.getElementById("recherche").value.trim().toLowerCase();
  let encaisse = 0;
  let impayes = 0;
  let totalLoyers = 0;
  let nbRappels = 0;
  let html = "";

  locataires.forEach(l => {
    const paye = payePourMois(l.id, mois);
    const reste = Math.max(l.loyer - paye, 0);
    const etat = etatRappel(l);
    encaisse += paye;
    impayes += reste;
    totalLoyers += l.loyer;
    if (etat) {
      nbRappels++;
    }

    const texte = (l.nom + " " + l.logement + " " + l.telephone).toLowerCase();
    if (recherche && !texte.includes(recherche)) return;
    if (filtreActif === "impayes" && reste === 0) return;
    if (filtreActif === "payes" && reste > 0) return;
    if (filtreActif === "rappel" && !etat) return;

    const pourcent = Math.min(100, Math.round((paye / l.loyer) * 100));
    let etiquette = "";
    if (etat && etat.type === "retard") {
      etiquette = `<span class="etiquette retard">⚠️ En retard de ${pluriel(etat.jours, "jour")}</span>`;
    } else if (etat && etat.type === "rappel") {
      etiquette = `<span class="etiquette rappel">🔔 ${etat.jours === 0 ? "Échéance aujourd'hui" : "Échéance dans " + pluriel(etat.jours, "jour")}</span>`;
    }

    const boutonsContact = (etat || reste > 0) ? `
      <button class="mini wa" onclick="envoyer(${l.id}, 'whatsapp')">💬 WhatsApp</button>
      <button class="mini sms" onclick="envoyer(${l.id}, 'sms')">📱 SMS</button>
      <button class="mini mail" onclick="envoyer(${l.id}, 'email')">✉️ E-mail</button>` : "";

    html += `
      <div class="locataire">
        <div class="avatar">${proteger(initiales(l.nom))}</div>
        <div class="corps">
          <div class="ligne-haut">
            <h4>${proteger(l.nom)}</h4>
            <span class="badge ${reste === 0 ? "ok" : "ko"}">${reste === 0 ? "Payé ✅" : "Reste " + montant(reste)}</span>
          </div>
          <p>🏠 ${proteger(l.logement)}</p>
          <p>📞 ${proteger(l.telephone)}${l.email ? " · ✉️ " + proteger(l.email) : ""}</p>
          <p>Loyer : ${montant(l.loyer)} · Payé ce mois : ${montant(paye)}</p>
          <div class="mini-barre"><div style="width:${pourcent}%"></div></div>
          ${etiquette}
          <div class="groupe-boutons">
            <button class="mini" onclick="ouvrirHistorique(${l.id})">🧾 Historique</button>
            <button class="mini" onclick="modifierLocataire(${l.id})">✏️ Modifier</button>
            ${boutonsContact}
            <button class="supprimer" onclick="supprimerLocataire(${l.id})">🗑️</button>
          </div>
        </div>
      </div>`;
  });

  if (locataires.length === 0) {
    html = '<p class="vide">Aucun locataire pour le moment. Ajoutez-en un !</p>';
  } else if (html === "") {
    html = '<p class="vide">Aucun résultat pour cette recherche.</p>';
  }
  document.getElementById("liste-locataires").innerHTML = html;

  const taux = totalLoyers > 0 ? Math.min(100, Math.round((encaisse / totalLoyers) * 100)) : 0;
  document.getElementById("total-encaisse").textContent = montant(encaisse);
  document.getElementById("total-impayes").textContent = montant(impayes);
  document.getElementById("total-locataires").textContent = locataires.length;
  document.getElementById("taux").textContent = taux + " %";
  document.getElementById("barre").style.width = taux + "%";

  const prochaine = prochaineEcheance();
  const jours = Math.round((prochaine - aujourdhui()) / UN_JOUR);
  document.getElementById("prochaine-echeance").textContent =
    prochaine.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  document.getElementById("bandeau-echeance").textContent =
    "📅 Échéance le " + dateLongue(prochaine) + " · "
    + (jours === 0 ? "aujourd'hui" : "dans " + pluriel(jours, "jour"))
    + (nbRappels > 0 ? " · 🔔 " + pluriel(nbRappels, "rappel") + " à envoyer" : "");
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

function modifierLocataire(id) {
  const l = locataires.find(x => x.id === id);
  document.getElementById("titre-locataire").textContent = "Modifier le locataire";
  document.getElementById("id-edition").value = l.id;
  document.getElementById("nom").value = l.nom;
  document.getElementById("telephone").value = l.telephone;
  document.getElementById("email").value = l.email || "";
  document.getElementById("logement").value = l.logement;
  document.getElementById("loyer").value = l.loyer;
  ouvrir("modal-locataire");
}

function numeroInternational(telephone) {
  let chiffres = telephone.replace(/\D/g, "");
  if (chiffres.startsWith("00")) {
    chiffres = chiffres.slice(2);
  }
  if (chiffres.length === 8) {
    chiffres = "223" + chiffres;
  }
  return chiffres;
}

function construireMessage(l, etat) {
  const mois = etat ? etat.mois : moisActuel();
  const reste = etat ? etat.reste : Math.max(l.loyer - payePourMois(l.id, mois), 0);

  if (etat && etat.type === "rappel") {
    return "Bonjour " + l.nom + ", petit rappel de BADLOYERS : le loyer de " + nomMois(mois)
      + " (" + l.logement + "), d'un montant de " + montant(reste)
      + ", est à payer le " + dateLongue(etat.echeance) + ". Merci d'avance. 🙏";
  }
  return "Bonjour " + l.nom + ", sauf erreur, le loyer de " + nomMois(mois)
    + " (" + l.logement + ") n'a pas encore été réglé. Il reste " + montant(reste)
    + " à payer. Merci de régulariser dès que possible. 🙏";
}

function envoyer(id, canal) {
  const l = locataires.find(x => x.id === id);
  const message = construireMessage(l, etatRappel(l));
  const numero = numeroInternational(l.telephone);

  if (canal === "whatsapp") {
    window.open("https://wa.me/" + numero + "?text=" + encodeURIComponent(message), "_blank");
  } else if (canal === "sms") {
    window.location.href = "sms:+" + numero + "?body=" + encodeURIComponent(message);
  } else if (canal === "email") {
    if (!l.email) {
      alert("Ajoutez d'abord l'e-mail de ce locataire avec le bouton Modifier.");
      return;
    }
    window.location.href = "mailto:" + l.email
      + "?subject=" + encodeURIComponent("Rappel de loyer - BADLOYERS")
      + "&body=" + encodeURIComponent(message);
  }
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
  document.getElementById("form-locataire").reset();
  document.getElementById("id-edition").value = "";
  document.getElementById("titre-locataire").textContent = "Nouveau locataire";
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

document.getElementById("recherche").addEventListener("input", afficher);

document.querySelectorAll(".filtre").forEach(bouton => {
  bouton.addEventListener("click", () => {
    filtreActif = bouton.dataset.filtre;
    document.querySelectorAll(".filtre").forEach(b => b.classList.remove("actif"));
    bouton.classList.add("actif");
    afficher();
  });
});

document.getElementById("form-locataire").addEventListener("submit", e => {
  e.preventDefault();
  const idEdition = Number(document.getElementById("id-edition").value);
  const donnees = {
    nom: document.getElementById("nom").value.trim(),
    telephone: document.getElementById("telephone").value.trim(),
    email: document.getElementById("email").value.trim(),
    logement: document.getElementById("logement").value.trim(),
    loyer: Number(document.getElementById("loyer").value)
  };

  if (idEdition) {
    const l = locataires.find(x => x.id === idEdition);
    Object.assign(l, donnees);
  } else {
    locataires.push(Object.assign({ id: Date.now() }, donnees));
  }

  sauvegarder();
  afficher();
  e.target.reset();
  document.getElementById("id-edition").value = "";
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
  const lignes = [["Locataire", "Téléphone", "E-mail", "Logement", "Loyer mensuel", "Mois", "Montant payé", "Date de saisie"]];

  locataires.forEach(l => {
    const liste = paiements.filter(p => p.idLocataire === l.id);
    if (liste.length === 0) {
      lignes.push([l.nom, l.telephone, l.email || "", l.logement, l.loyer, "", "", ""]);
    }
    liste.forEach(p => {
      lignes.push([l.nom, l.telephone, l.email || "", l.logement, l.loyer, p.mois, p.montant, dateFr(p.id)]);
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