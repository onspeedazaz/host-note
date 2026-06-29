const STORAGE_KEY = "host-note-pwa-v1";
const monthNames = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const state = {
  data: loadData(),
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
};

const els = {
  monthSelect: document.querySelector("#monthSelect"),
  yearInput: document.querySelector("#yearInput"),
  dailyRows: document.querySelector("#dailyRows"),
  rowTemplate: document.querySelector("#rowTemplate"),
  monthTotal: document.querySelector("#monthTotal"),
  activeDays: document.querySelector("#activeDays"),
  averageDay: document.querySelector("#averageDay"),
  bestDay: document.querySelector("#bestDay"),
  grandTotal: document.querySelector("#grandTotal"),
  monthGrid: document.querySelector("#monthGrid"),
  yearLabel: document.querySelector("#yearLabel"),
  todayButton: document.querySelector("#todayButton"),
  exportButton: document.querySelector("#exportButton"),
  clearMonthButton: document.querySelector("#clearMonthButton"),
};

setup();

function setup() {
  monthNames.forEach((name, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = name;
    els.monthSelect.append(option);
  });

  els.monthSelect.value = String(state.month);
  els.yearInput.value = String(state.year);

  els.monthSelect.addEventListener("change", () => {
    state.month = Number(els.monthSelect.value);
    render();
  });

  els.yearInput.addEventListener("change", () => {
    state.year = clampYear(els.yearInput.value);
    els.yearInput.value = String(state.year);
    render();
  });

  els.todayButton.addEventListener("click", goToToday);
  els.exportButton.addEventListener("click", exportCsv);
  els.clearMonthButton.addEventListener("click", clearCurrentMonth);

  render();
  registerServiceWorker();
}

function render() {
  renderRows();
  renderSummary();
  renderMonthGrid();
}

function renderRows() {
  els.dailyRows.textContent = "";
  const today = new Date();
  const isCurrentMonth = state.year === today.getFullYear() && state.month === today.getMonth();

  for (let day = 1; day <= 31; day += 1) {
    const fragment = els.rowTemplate.content.cloneNode(true);
    const row = fragment.querySelector("tr");
    const dayCell = fragment.querySelector(".day-cell");
    const entry = getEntry(day);

    row.dataset.day = String(day);
    if (isCurrentMonth && day === today.getDate()) {
      row.classList.add("today");
    }

    dayCell.textContent = String(day);

    fragment.querySelectorAll("[data-round]").forEach((input) => {
      const index = Number(input.dataset.round);
      input.value = entry.rounds[index] ? String(entry.rounds[index]) : "";
      input.addEventListener("input", () => updateRound(day, index, input.value));
    });

    const noteInput = fragment.querySelector("[data-note]");
    noteInput.value = entry.note || "";
    noteInput.addEventListener("input", () => updateNote(day, noteInput.value));

    fragment.querySelector(".row-total").textContent = formatNumber(sumRounds(entry.rounds));
    els.dailyRows.append(fragment);
  }
}

function renderSummary() {
  const totals = getCurrentMonthTotals();
  const roundTotals = totals.roundTotals;
  const grandTotal = roundTotals.reduce((sum, value) => sum + value, 0);
  const activeDays = totals.days.filter((day) => day.total > 0).length;
  const bestDay = totals.days.reduce(
    (best, day) => (day.total > best.total ? day : best),
    { day: "-", total: 0 },
  );
  const average = activeDays ? Math.round(grandTotal / activeDays) : 0;

  els.monthTotal.textContent = formatMoney(grandTotal);
  els.activeDays.textContent = formatNumber(activeDays);
  els.averageDay.textContent = formatMoney(average);
  els.bestDay.textContent = bestDay.total ? `${bestDay.day} (${formatMoney(bestDay.total)})` : "-";
  els.grandTotal.textContent = formatMoney(grandTotal);

  roundTotals.forEach((total, index) => {
    document.querySelector(`#roundTotal${index}`).textContent = formatMoney(total);
  });

  document.querySelectorAll("#dailyRows tr").forEach((row) => {
    const day = Number(row.dataset.day);
    row.querySelector(".row-total").textContent = formatMoney(sumRounds(getEntry(day).rounds));
  });
}

function renderMonthGrid() {
  els.monthGrid.textContent = "";
  els.yearLabel.textContent = String(state.year);

  monthNames.forEach((name, index) => {
    const card = document.createElement("article");
    card.className = "month-card";
    if (index === state.month) {
      card.classList.add("current");
    }

    const label = document.createElement("span");
    label.textContent = name;

    const total = document.createElement("strong");
    total.textContent = formatMoney(getMonthTotal(index));

    card.append(label, total);
    card.addEventListener("click", () => {
      state.month = index;
      els.monthSelect.value = String(index);
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    els.monthGrid.append(card);
  });
}

function updateRound(day, roundIndex, rawValue) {
  const entry = getEntry(day);
  entry.rounds[roundIndex] = normalizeNumber(rawValue);
  saveData();
  renderSummary();
  renderMonthGrid();
}

function updateNote(day, value) {
  getEntry(day).note = value.trimStart();
  saveData();
}

function getEntry(day) {
  const monthData = getMonthData();
  if (!monthData[day]) {
    monthData[day] = { rounds: [0, 0, 0, 0, 0, 0], note: "" };
  }

  if (!Array.isArray(monthData[day].rounds)) {
    monthData[day].rounds = [0, 0, 0, 0, 0, 0];
  }

  while (monthData[day].rounds.length < 6) {
    monthData[day].rounds.push(0);
  }

  return monthData[day];
}

function getMonthData(month = state.month, year = state.year) {
  const yearKey = String(year);
  const monthKey = String(month);

  if (!state.data[yearKey]) {
    state.data[yearKey] = {};
  }

  if (!state.data[yearKey][monthKey]) {
    state.data[yearKey][monthKey] = {};
  }

  return state.data[yearKey][monthKey];
}

function getCurrentMonthTotals() {
  const roundTotals = [0, 0, 0, 0, 0, 0];
  const days = [];

  for (let day = 1; day <= 31; day += 1) {
    const rounds = getEntry(day).rounds;
    rounds.forEach((value, index) => {
      roundTotals[index] += normalizeNumber(value);
    });
    days.push({ day, total: sumRounds(rounds) });
  }

  return { roundTotals, days };
}

function getMonthTotal(month) {
  const monthData = getMonthData(month, state.year);
  let total = 0;

  for (let day = 1; day <= 31; day += 1) {
    const entry = monthData[day];
    if (entry) {
      total += sumRounds(entry.rounds || []);
    }
  }

  return total;
}

function sumRounds(rounds) {
  return rounds.reduce((sum, value) => sum + normalizeNumber(value), 0);
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function formatNumber(value) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(value);
}

function formatMoney(value) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(value);
}

function clampYear(value) {
  const year = Number(value);
  if (!Number.isFinite(year)) {
    return new Date().getFullYear();
  }
  return Math.min(2100, Math.max(2000, Math.round(year)));
}

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function goToToday() {
  const today = new Date();
  state.year = today.getFullYear();
  state.month = today.getMonth();
  els.yearInput.value = String(state.year);
  els.monthSelect.value = String(state.month);
  render();

  const row = document.querySelector(`#dailyRows tr[data-day="${today.getDate()}"]`);
  row?.scrollIntoView({ behavior: "smooth", block: "center", inline: "start" });
}

function exportCsv() {
  const header = ["วันที่", "รอบ 1", "รอบ 2", "รอบ 3", "รอบ 4", "รอบ 5", "รอบ 6", "รวม", "โน้ต"];
  const rows = [header];

  for (let day = 1; day <= 31; day += 1) {
    const entry = getEntry(day);
    rows.push([
      day,
      ...entry.rounds.map((value) => normalizeNumber(value)),
      sumRounds(entry.rounds),
      entry.note || "",
    ]);
  }

  rows.push(["รวม", ...getCurrentMonthTotals().roundTotals, getMonthTotal(state.month), ""]);

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `host-note-${state.year}-${String(state.month + 1).padStart(2, "0")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function clearCurrentMonth() {
  const label = `${monthNames[state.month]} ${state.year}`;
  if (!confirm(`ล้างข้อมูลเดือน ${label}?`)) {
    return;
  }

  state.data[String(state.year)][String(state.month)] = {};
  saveData();
  render();
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}
