import { db, isConfigured } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

const DEFAULTS = {
  work: 25,
  short: 5,
  long: 15,
  longEvery: 4
};

let settings = { ...DEFAULTS };
let mode = "work";
let remaining = settings.work * 60;
let totalAtStart = remaining;
let running = false;
let intervalId = null;
let completedWork = 0;
let completedBreaks = 0;
let focusMinutes = 0;
let history = [];
let toastTimeout;

const todayKey = () => {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const storageKey = () => `pomodoro:${todayKey()}`;

function showToast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    $("toast").classList.remove("show");
  }, 2800);
}

function minutesForMode(m) {
  return m === "work"
    ? settings.work
    : m === "short"
      ? settings.short
      : settings.long;
}

function labelForMode(m) {
  return m === "work"
    ? "WAKTU FOKUS"
    : m === "short"
      ? "ISTIRAHAT PENDEK"
      : "ISTIRAHAT PANJANG";
}

function renderTimer() {
  const min = Math.floor(remaining / 60);
  const sec = remaining % 60;

  $("timer").textContent =
    `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;

  $("sessionLabel").textContent = labelForMode(mode);

  $("timerHint").textContent =
    mode === "work"
      ? "Satu tugas dalam satu waktu."
      : "Jauhkan diri sejenak, lalu kembali segar.";

  $("startPauseBtn").textContent = running ? "Jeda" : "Mulai";

  const progress =
    totalAtStart > 0
      ? ((totalAtStart - remaining) / totalAtStart) * 100
      : 0;

  $("progressBar").style.width =
    `${Math.max(0, Math.min(100, progress))}%`;

  document.title = `${$("timer").textContent} · Pomodoro Tracker`;
}

function stopTimer() {
  running = false;

  if (intervalId) {
    clearInterval(intervalId);
  }

  intervalId = null;
  renderTimer();
}

function startTimer() {
  if (running) return;

  running = true;
  renderTimer();

  intervalId = setInterval(() => {
    remaining--;
    renderTimer();

    if (remaining <= 0) {
      finishSession();
    }
  }, 1000);
}

function switchMode(nextMode, reset = true) {
  stopTimer();

  mode = nextMode;

  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });

  if (reset) {
    remaining = minutesForMode(mode) * 60;
    totalAtStart = remaining;
  }

  renderTimer();
}

function loadLocalStats() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(storageKey()) || "null"
    );

    if (saved) {
      completedWork = saved.completedWork || 0;
      completedBreaks = saved.completedBreaks || 0;
      focusMinutes = saved.focusMinutes || 0;
      history = Array.isArray(saved.history) ? saved.history : [];
    }
  } catch (error) {
    console.warn("Data lokal tidak dapat dibaca", error);
  }

  renderStats();
}

function saveLocalStats() {
  localStorage.setItem(
    storageKey(),
    JSON.stringify({
      completedWork,
      completedBreaks,
      focusMinutes,
      history
    })
  );

  renderStats();
}

function renderStats() {
  $("completedCount").textContent = completedWork;
  $("focusMinutesCount").textContent = focusMinutes;
  $("breakCount").textContent = completedBreaks;

  const list = $("historyList");
  list.innerHTML = "";

  if (!history.length) {
    list.innerHTML =
      '<p class="empty-state">Belum ada sesi selesai. Mulai fokus pertamamu!</p>';
    return;
  }

  [...history].reverse().slice(0, 12).forEach((item) => {
    const row = document.createElement("div");
    row.className = "history-item";

    const left = document.createElement("div");

    const strong = document.createElement("strong");
    strong.textContent = item.type;

    const sub = document.createElement("span");
    sub.textContent = item.dateLabel;

    left.append(strong, sub);

    const right = document.createElement("span");
    right.className = "history-time";
    right.textContent = `${item.minutes} menit`;

    row.append(left, right);
    list.appendChild(row);
  });
}

async function saveSessionToFirebase(item) {
  if (!db) return;

  try {
    await addDoc(collection(db, "pomodoroSessions"), {
      ...item,
      day: todayKey(),
      createdAt: new Date().toISOString(),
      app: "PomodoroTracker"
    });

    $("statsNote").textContent =
      "Statistik disimpan di perangkat ini dan disinkronkan ke cloud.";
  } catch (error) {
    console.error("Gagal menyimpan ke Firestore:", error);

    $("statsNote").textContent =
      "Statistik lokal tetap tersimpan. Sinkronisasi cloud belum berhasil.";
  }
}

async function refreshFirebaseStats() {
  if (!db || !isConfigured) {
    $("statsNote").textContent =
      "Statistik disimpan di perangkat ini.";
    return;
  }

  try {
    const q = query(
      collection(db, "pomodoroSessions"),
      where("day", "==", todayKey()),
      orderBy("createdAt", "asc")
    );

    const snap = await getDocs(q);

    let work = 0;
    let breaks = 0;
    let mins = 0;

    snap.forEach((docSnap) => {
      const s = docSnap.data();

      if (s.mode === "work") {
        work++;
        mins += Number(s.minutes || 0);
      } else {
        breaks++;
      }
    });

    $("statsNote").textContent =
      `Data cloud hari ini: ${work} sesi fokus, ${mins} menit fokus, ${breaks} sesi istirahat.`;
  } catch (error) {
    console.error("Gagal membaca Firestore:", error);

    $("statsNote").textContent =
      "Statistik lokal tetap tersedia. Data cloud belum dapat dibaca.";
  }
}

async function finishSession() {
  stopTimer();

  const duration = minutesForMode(mode);

  const item = {
    mode,
    type:
      mode === "work"
        ? "Sesi fokus selesai"
        : mode === "short"
          ? "Istirahat pendek selesai"
          : "Istirahat panjang selesai",
    minutes: duration,
    dateLabel: new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit"
    })
  };

  if (mode === "work") {
    completedWork++;
    focusMinutes += duration;
  } else {
    completedBreaks++;
  }

  history.push(item);
  saveLocalStats();

  await saveSessionToFirebase(item);

  notifyUser(`${item.type}!`);
  showToast(`${item.type}! Bagus, lanjutkan.`);

  if (mode === "work") {
    const next =
      completedWork % settings.longEvery === 0
        ? "long"
        : "short";

    switchMode(next);
  } else {
    switchMode("work");
  }
}

function notifyUser(message) {
  if (
    window.cordova &&
    window.cordova.plugins &&
    window.cordova.plugins.notification &&
    window.cordova.plugins.notification.local
  ) {
    window.cordova.plugins.notification.local.schedule({
      title: "Pomodoro Tracker",
      text: message,
      trigger: { in: 1 },
      foreground: true
    });
  } else if ("Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification("Pomodoro Tracker", {
        body: message
      });
    } else if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }
}

function saveSettings() {
  const work = Number($("workMinutes").value);
  const short = Number($("shortMinutes").value);
  const long = Number($("longMinutes").value);
  const longEvery = Number($("longEvery").value);

  if (
    ![work, short, long, longEvery].every(Number.isFinite) ||
    work < 1 ||
    short < 1 ||
    long < 1 ||
    longEvery < 2 ||
    work > 180 ||
    short > 60 ||
    long > 90 ||
    longEvery > 12
  ) {
    showToast("Periksa angka pengaturan. Nilai di luar batas tidak diperbolehkan.");
    return;
  }

  settings = {
    work,
    short,
    long,
    longEvery
  };

  localStorage.setItem("pomodoroSettings", JSON.stringify(settings));

  switchMode(mode);
  showToast("Pengaturan berhasil disimpan.");
}

function loadSettings() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("pomodoroSettings") || "null"
    );

    if (saved) {
      settings = { ...DEFAULTS, ...saved };
    }
  } catch (error) {
    console.warn("Pengaturan lokal tidak dapat dibaca", error);
  }

  $("workMinutes").value = settings.work;
  $("shortMinutes").value = settings.short;
  $("longMinutes").value = settings.long;
  $("longEvery").value = settings.longEvery;
}

document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    switchMode(btn.dataset.mode);
  });
});

$("startPauseBtn").addEventListener("click", () => {
  running ? stopTimer() : startTimer();
});

$("resetBtn").addEventListener("click", () => {
  stopTimer();
  remaining = minutesForMode(mode) * 60;
  totalAtStart = remaining;
  renderTimer();
});

$("skipBtn").addEventListener("click", () => {
  switchMode(mode === "work" ? "short" : "work");
});

$("saveSettingsBtn").addEventListener("click", saveSettings);

$("refreshStatsBtn").addEventListener("click", refreshFirebaseStats);

window.addEventListener("beforeunload", () => {
  if (intervalId) clearInterval(intervalId);
});

loadSettings();
loadLocalStats();

remaining = minutesForMode(mode) * 60;
totalAtStart = remaining;

renderTimer();

$("statsNote").textContent = "Statistik disimpan di perangkat ini.";

if (isConfigured && db) {
  refreshFirebaseStats();
}

document.addEventListener(
  "deviceready",
  () => {
    if (window.cordova?.plugins?.notification?.local) {
      window.cordova.plugins.notification.local.hasPermission(
        (granted) => {
          if (!granted) {
            window.cordova.plugins.notification.local.requestPermission();
          }
        }
      );
    }
  },
  false
);
