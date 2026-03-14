import { db, tebexUrl, magicLinks, initFirebaseAuth } from "./js_firebase_config.js";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const WEAPONS = [
  { name: "SNS Pistol", rarity: "Commun", chance: 40, className: "rarity-common" },
  { name: "Pistol", rarity: "Commun", chance: 40, className: "rarity-common" },
  { name: "Vintage Pistol", rarity: "Rare", chance: 15, className: "rarity-rare" },
  { name: "Perico Pistol", rarity: "Rare", chance: 15, className: "rarity-rare" },
  { name: "MiniSMG", rarity: "Légendaire", chance: 5, className: "rarity-legendary" },
  { name: "MicroSMG", rarity: "Légendaire", chance: 5, className: "rarity-legendary" },
  { name: "AK Compact", rarity: "Ultime", chance: 1, className: "rarity-ultimate" }
];

const track = document.getElementById("caseTrack");
const openBtn = document.getElementById("openCaseBtn");
const result = document.getElementById("caseResult");
const historyList = document.getElementById("caseHistory");
const accessPanel = document.getElementById("accessPanel");
const paidCodeInput = document.getElementById("paidCodeInput");
const unlockCaseBtn = document.getElementById("unlockCaseBtn");
const accessMessage = document.getElementById("accessMessage");
const tebexBuyBtn = document.getElementById("tebexBuyBtn");

let rolling = false;
let hasAccess = false;
let accessType = "locked";
let activeCodeId = null;

function isMagicAccess() {
  const params = new URLSearchParams(window.location.search);
  const vip = params.get("vip");
  return magicLinks.includes(vip);
}

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + item.chance, 0);
  let rand = Math.random() * total;
  for (const item of items) {
    rand -= item.chance;
    if (rand <= 0) return item;
  }
  return items[items.length - 1];
}

function createCard(item) {
  const card = document.createElement("div");
  card.className = `case-card ${item.className}`;
  card.innerHTML = `
    <div class="weapon-name">${item.name}</div>
    <div class="weapon-rarity">${item.rarity}</div>
    <div class="weapon-chance">${item.chance}% de chance</div>
  `;
  return card;
}

function generateRollItems(winningItem, totalItems = 80) {
  const items = [];
  for (let i = 0; i < totalItems; i++) {
    items.push(WEAPONS[Math.floor(Math.random() * WEAPONS.length)]);
  }
  const winningIndex = totalItems - 10;
  items[winningIndex] = winningItem;
  return { items, winningIndex };
}

function updateHistoryUI(item) {
  const li = document.createElement("li");
  li.innerHTML = `<strong>${item.name}</strong> — ${item.rarity}`;
  historyList.prepend(li);

  while (historyList.children.length > 6) {
    historyList.removeChild(historyList.lastChild);
  }
}

async function saveDrop(item, mode) {
  try {
    await addDoc(collection(db, "crateDrops"), {
      weapon: item.name,
      rarity: item.rarity,
      mode,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Erreur sauvegarde drop :", error);
  }
}

function showPreview() {
  track.innerHTML = "";
  const previewItems = [
    WEAPONS[0], WEAPONS[1], WEAPONS[2], WEAPONS[3], WEAPONS[4],
    WEAPONS[5], WEAPONS[6], WEAPONS[1], WEAPONS[0], WEAPONS[2], WEAPONS[4]
  ];
  previewItems.forEach(item => track.appendChild(createCard(item)));
  track.style.transition = "none";
  track.style.transform = "translateX(0)";
}

function grantAccess(type, codeId = null) {
  hasAccess = true;
  accessType = type;
  activeCodeId = codeId;
  openBtn.disabled = false;

  if (type === "magic") {
    result.innerHTML = "Accès spécial BadSide activé. Tu peux ouvrir la caisse.";
    if (accessPanel) accessPanel.style.display = "none";
  } else {
    result.innerHTML = "Code validé. Tu peux ouvrir 1 caisse.";
  }
}

function lockAccess() {
  hasAccess = false;
  accessType = "locked";
  activeCodeId = null;
  openBtn.disabled = true;
  result.innerHTML = "Paiement requis pour ouvrir cette caisse.";
}

async function unlockWithCode(codeId) {
  try {
    const ref = doc(db, "crateCodes", codeId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      accessMessage.textContent = "Code introuvable.";
      return;
    }

    const data = snap.data();

    if (!data.active) {
      accessMessage.textContent = "Code inactif.";
      return;
    }

    if ((data.usesRemaining || 0) <= 0) {
      accessMessage.textContent = "Code déjà utilisé.";
      return;
    }

    accessMessage.textContent = "Code valide.";
    grantAccess("paid", codeId);
  } catch (error) {
    console.error(error);
    accessMessage.textContent = "Erreur Firebase.";
  }
}

async function consumeCode(codeId) {
  const ref = doc(db, "crateCodes", codeId);
  await updateDoc(ref, {
    usesRemaining: increment(-1)
  });
}

async function openCase() {
  if (!hasAccess || rolling) return;

  rolling = true;
  openBtn.disabled = true;
  result.classList.remove("jackpot");
  result.textContent = "Ouverture en cours...";

  track.style.transition = "none";
  track.style.transform = "translateX(0)";
  track.innerHTML = "";

  const winningItem = weightedPick(WEAPONS);
  const { items, winningIndex } = generateRollItems(winningItem);

  items.forEach(item => track.appendChild(createCard(item)));

  const cards = track.querySelectorAll(".case-card");
  const targetCard = cards[winningIndex];
  const windowEl = document.querySelector(".case-window");

  const cardWidth = targetCard.offsetWidth;
  const windowWidth = windowEl.offsetWidth;
  const gap = 16;
  const randomOffset = Math.floor(Math.random() * 40) - 20;

  const targetX =
    (winningIndex * (cardWidth + gap)) - (windowWidth / 2) + (cardWidth / 2) + randomOffset;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      track.style.transition = "transform 5.5s cubic-bezier(0.08, 0.8, 0.12, 1)";
      track.style.transform = `translateX(-${targetX}px)`;
    });
  });

  setTimeout(async () => {
    targetCard.classList.add("winner");

    if (winningItem.name === "AK Compact") {
      result.classList.add("jackpot");
      result.innerHTML = `🔥 JACKPOT — <strong>${winningItem.name}</strong> <span style="opacity:.75">(${winningItem.rarity})</span>`;
    } else {
      result.innerHTML = `Tu as obtenu : <strong>${winningItem.name}</strong> <span style="opacity:.75">(${winningItem.rarity})</span>`;
    }

    updateHistoryUI(winningItem);
    await saveDrop(winningItem, accessType);

    if (accessType === "paid" && activeCodeId) {
      try {
        await consumeCode(activeCodeId);
      } catch (error) {
        console.error("Erreur consommation code :", error);
      }
      lockAccess();
      if (accessPanel) accessPanel.style.display = "block";
      if (accessMessage) accessMessage.textContent = "Code consommé. Il faut un nouveau code.";
    } else {
      openBtn.disabled = false;
    }

    rolling = false;
  }, 5700);
}

async function init() {
  await initFirebaseAuth();
  showPreview();
  lockAccess();

  if (isMagicAccess()) {
    grantAccess("magic");
  }

  if (unlockCaseBtn) {
    unlockCaseBtn.addEventListener("click", async () => {
      const code = paidCodeInput.value.trim().toUpperCase();
      if (!code) {
        accessMessage.textContent = "Entre un code.";
        return;
      }
      await unlockWithCode(code);
    });
  }

  if (tebexBuyBtn) {
    tebexBuyBtn.href = tebexUrl;
  }

  openBtn.addEventListener("click", openCase);
}

init();
