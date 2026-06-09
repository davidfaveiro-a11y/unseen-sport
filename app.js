const STORAGE_KEY = "unseen-sport-data-v1";

let state = loadState();

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function daysAgo(count) {
  const date = new Date();
  date.setDate(date.getDate() - count);
  return date.toISOString();
}

function uid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function freshSeedData() {
  return {
    templates: [
      {
        id: uid(),
        name: "Full body debutante",
        goal: "Reprise",
        exercises: ["Presse a cuisses", "Developpe couche halteres", "Tirage vertical", "Souleve de terre roumain", "Gainage"],
      },
      {
        id: uid(),
        name: "Haut du corps",
        goal: "Hypertrophie",
        exercises: ["Developpe couche", "Rowing assis", "Developpe epaules", "Tirage vertical", "Curl biceps", "Extension triceps"],
      },
      {
        id: uid(),
        name: "Bas du corps",
        goal: "Force",
        exercises: ["Squat", "Souleve de terre roumain", "Fentes marchees", "Leg curl", "Mollets debout"],
      },
      {
        id: uid(),
        name: "Maison sans machine",
        goal: "Endurance",
        exercises: ["Squat goblet", "Pompes", "Rowing haltere", "Hip thrust", "Planche laterale"],
      },
    ],
    active: null,
    history: [
      {
        id: uid(),
        name: "Full body debutante",
        date: daysAgo(9),
        exercises: [
          exercise("Presse a cuisses", [[12, 45], [12, 50], [10, 55]]),
          exercise("Developpe couche halteres", [[10, 10], [10, 12], [8, 12]]),
          exercise("Tirage vertical", [[12, 25], [12, 30], [10, 30]]),
        ],
      },
      {
        id: uid(),
        name: "Haut du corps",
        date: daysAgo(4),
        exercises: [
          exercise("Developpe couche", [[8, 30], [8, 32.5], [6, 35]]),
          exercise("Rowing assis", [[10, 30], [10, 35], [9, 35]]),
          exercise("Developpe epaules", [[10, 12], [8, 14], [8, 14]]),
        ],
      },
    ],
  };
}

function exercise(name, sets) {
  return {
    id: uid(),
    name,
    sets: sets.map(([reps, weight]) => ({ id: uid(), reps, weight })),
  };
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return freshSeedData();

  try {
    return JSON.parse(saved);
  } catch {
    return freshSeedData();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatKg(value) {
  return `${Math.round(value).toLocaleString("fr-FR")} kg`;
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function workoutTotals(workout) {
  const sets = workout.exercises.flatMap((item) => item.sets);
  return {
    reps: sets.reduce((sum, set) => sum + Number(set.reps || 0), 0),
    volume: sets.reduce((sum, set) => sum + Number(set.reps || 0) * Number(set.weight || 0), 0),
    sets: sets.length,
  };
}

function allFinishedWorkouts() {
  return state.history;
}

function computeStats() {
  const workouts = allFinishedWorkouts();
  const totals = workouts.reduce(
    (acc, workout) => {
      const stats = workoutTotals(workout);
      acc.volume += stats.volume;
      acc.reps += stats.reps;
      return acc;
    },
    { volume: 0, reps: 0 }
  );

  const records = new Map();
  workouts.forEach((workout) => {
    workout.exercises.forEach((item) => {
      item.sets.forEach((set) => {
        const previous = records.get(item.name) || 0;
        records.set(item.name, Math.max(previous, Number(set.weight || 0)));
      });
    });
  });

  const best = [...records.entries()].sort((a, b) => b[1] - a[1])[0];
  return { ...totals, sessions: workouts.length, records, best };
}

function render() {
  renderDashboard();
  renderTemplates();
  renderHistory();
  renderStats();
}

function renderDashboard() {
  const stats = computeStats();
  $("#metricVolume").textContent = formatKg(stats.volume);
  $("#metricReps").textContent = stats.reps.toLocaleString("fr-FR");
  $("#metricSessions").textContent = stats.sessions;
  $("#metricBest").textContent = stats.best ? `${stats.best[0]} (${stats.best[1]} kg)` : "-";

  const activeRoot = $("#activeWorkout");
  activeRoot.innerHTML = "";

  if (!state.active) {
    activeRoot.innerHTML = '<div class="empty">Choisis une seance de base ou cree la tienne pour commencer.</div>';
    $("#finishSession").disabled = true;
  } else {
    $("#finishSession").disabled = false;
    const title = document.createElement("h3");
    title.textContent = state.active.name;
    activeRoot.append(title);
    state.active.exercises.forEach((item) => activeRoot.append(renderExercise(item)));
  }

  const suggestion = $("#nextSuggestion");
  const lastWorkout = state.history[state.history.length - 1];
  const nextTemplate = state.templates.find((template) => template.name !== lastWorkout?.name) || state.templates[0];
  suggestion.innerHTML = `
    <h3>${nextTemplate ? escapeHTML(nextTemplate.name) : "Creer une premiere seance"}</h3>
    <p>${nextTemplate ? `Objectif ${escapeHTML(nextTemplate.goal)}. ${nextTemplate.exercises.length} exercices pour garder un bon rythme.` : "Ajoute quelques exercices simples et note les series au fil de l'eau."}</p>
    ${nextTemplate ? `<button class="secondary-button" data-start-template="${nextTemplate.id}" type="button">Lancer</button>` : ""}
  `;
}

function renderExercise(item) {
  const node = $("#exerciseTemplate").content.firstElementChild.cloneNode(true);
  $("strong", node).textContent = item.name;
  $(".remove-exercise", node).addEventListener("click", () => {
    state.active.exercises = state.active.exercises.filter((exerciseItem) => exerciseItem.id !== item.id);
    saveState();
    render();
  });

  const setGrid = $(".set-grid", node);
  item.sets.forEach((set, index) => {
    const row = document.createElement("div");
    row.className = "set-row";
    row.innerHTML = `
      <span>#${index + 1}</span>
      <label>Reps<input inputmode="numeric" min="0" type="number" value="${set.reps}"></label>
      <label>Kg<input inputmode="decimal" min="0" step="0.5" type="number" value="${set.weight}"></label>
      <button class="icon-button" type="button" aria-label="Supprimer la serie">x</button>
    `;
    const [repsInput, weightInput] = $$("input", row);
    repsInput.addEventListener("input", () => {
      set.reps = Number(repsInput.value);
      saveState();
      renderDashboard();
    });
    weightInput.addEventListener("input", () => {
      set.weight = Number(weightInput.value);
      saveState();
      renderDashboard();
    });
    $("button", row).addEventListener("click", () => {
      item.sets = item.sets.filter((current) => current.id !== set.id);
      saveState();
      render();
    });
    setGrid.append(row);
  });

  $(".add-set", node).addEventListener("click", () => {
    const previous = item.sets[item.sets.length - 1] || { reps: 10, weight: 0 };
    item.sets.push({ id: uid(), reps: previous.reps, weight: previous.weight });
    saveState();
    render();
  });

  return node;
}

function renderTemplates() {
  const root = $("#templateList");
  root.innerHTML = "";
  state.templates.forEach((template) => {
    const card = document.createElement("article");
    card.className = "template-card";
    card.innerHTML = `
      <div class="template-top">
        <div>
          <h2>${escapeHTML(template.name)}</h2>
          <p>${escapeHTML(template.exercises.join(", "))}</p>
        </div>
        <button class="primary-button" data-start-template="${template.id}" type="button">Lancer</button>
      </div>
      <div class="template-meta">
        <span class="tag">${escapeHTML(template.goal)}</span>
        <span class="tag">${template.exercises.length} exercices</span>
      </div>
    `;
    root.append(card);
  });
}

function renderHistory() {
  const root = $("#historyList");
  root.innerHTML = "";

  if (!state.history.length) {
    root.innerHTML = '<div class="empty">Les seances terminees apparaitront ici.</div>';
    return;
  }

  [...state.history].reverse().forEach((workout) => {
    const totals = workoutTotals(workout);
    const item = document.createElement("article");
    item.className = "history-item";
    item.innerHTML = `
      <div class="history-top">
        <div>
          <h2>${escapeHTML(workout.name)}</h2>
          <p>${new Date(workout.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</p>
        </div>
      </div>
      <div class="history-stats">
        <div><strong>${formatKg(totals.volume)}</strong><span>volume</span></div>
        <div><strong>${totals.reps}</strong><span>repetitions</span></div>
        <div><strong>${totals.sets}</strong><span>series</span></div>
      </div>
    `;
    root.append(item);
  });
}

function renderStats() {
  const chart = $("#volumeChart");
  const workouts = state.history.slice(-8);
  const maxVolume = Math.max(1, ...workouts.map((workout) => workoutTotals(workout).volume));
  chart.innerHTML = workouts.length
    ? ""
    : '<div class="empty">Termine une seance pour voir la courbe de volume.</div>';

  workouts.forEach((workout) => {
    const total = workoutTotals(workout).volume;
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <span>${new Date(workout.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, (total / maxVolume) * 100)}%"></div></div>
      <strong>${Math.round(total)} kg</strong>
    `;
    chart.append(row);
  });

  const records = $("#recordList");
  const sortedRecords = [...computeStats().records.entries()].sort((a, b) => b[1] - a[1]);
  records.innerHTML = sortedRecords.length ? "" : '<div class="empty">Aucun record pour le moment.</div>';
  sortedRecords.forEach(([name, weight]) => {
    const item = document.createElement("article");
    item.className = "history-item";
    item.innerHTML = `<strong>${escapeHTML(name)}</strong><p>${weight} kg au mieux sur une serie</p>`;
    records.append(item);
  });
}

function startTemplate(templateId) {
  const template = state.templates.find((item) => item.id === templateId);
  if (!template) return;

  state.active = {
    id: uid(),
    name: template.name,
    date: new Date().toISOString(),
    exercises: template.exercises.map((name) => exercise(name, [[10, 0], [10, 0], [10, 0]])),
  };
  saveState();
  switchView("dashboard");
  render();
}

function switchView(viewId) {
  $$(".nav-button").forEach((button) => button.classList.toggle("is-active", button.dataset.view === viewId));
  $$(".view").forEach((view) => view.classList.toggle("is-visible", view.id === viewId));
}

document.addEventListener("click", (event) => {
  const startButton = event.target.closest("[data-start-template]");
  if (startButton) startTemplate(startButton.dataset.startTemplate);
});

$$(".nav-button").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

$("#quickSession").addEventListener("click", () => switchView("templates"));

$("#finishSession").addEventListener("click", () => {
  if (!state.active) return;
  state.history.push({ ...state.active, date: new Date().toISOString() });
  state.active = null;
  saveState();
  render();
});

$("#openTemplateForm").addEventListener("click", () => $("#templateForm").classList.remove("is-hidden"));
$("#cancelTemplate").addEventListener("click", () => $("#templateForm").classList.add("is-hidden"));

$("#templateForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const exercises = $("#templateExercises").value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  state.templates.push({
    id: uid(),
    name: $("#templateName").value.trim(),
    goal: $("#templateGoal").value,
    exercises,
  });

  event.currentTarget.reset();
  event.currentTarget.classList.add("is-hidden");
  saveState();
  render();
});

$("#resetDemo").addEventListener("click", () => {
  state = freshSeedData();
  saveState();
  render();
});

render();
