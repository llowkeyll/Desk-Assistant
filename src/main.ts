import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-shell';
import { open as openDialog } from '@tauri-apps/plugin-dialog';

(window as any).lucide.createIcons();

const badWords = ["admin", "root", "system", "cunt", "fuck", "shit", "bitch", "nigger", "faggot", "slut", "whore", "dick"];

let appConfig = {
  setupDone: false,
  userName: "User",
  wakeword: "Quick",
  gradStart: "#0f1225",
  gradEnd: "#1a1025",
  widgetPos: "bottom-center",
  apps: [] as any[],
  routines: [] as any[],
  projects: [] as any[]
};

let globalDiscoveredApps: any[] = [];
let currentDisambiguation: {name: string, action: () => Promise<void>}[] = [];

const screens = { boot: document.getElementById('boot-screen')!, setup: document.getElementById('setup-screen')!, dashboard: document.getElementById('dashboard-screen')!, widget: document.getElementById('widget-overlay')! };
function switchScreen(name: keyof typeof screens) { Object.values(screens).forEach(s => s.classList.remove('active')); screens[name].classList.add('active'); }

async function initSystem() {
  try {
    const savedSettings = await invoke<string>('read_commands');
    appConfig = { ...appConfig, ...JSON.parse(savedSettings) };
  } catch (err) {
    await saveSettings();
  }
  
  if(!appConfig.apps) appConfig.apps = [];
  if(!appConfig.routines) appConfig.routines = [];
  if(!appConfig.projects) appConfig.projects = [];
  
  document.getElementById('welcome-message')!.innerText = `Welcome back, ${appConfig.userName}`;
  (document.getElementById('dash-username') as HTMLInputElement).value = appConfig.userName;
  (document.getElementById('dash-wakeword') as HTMLInputElement).value = appConfig.wakeword;
  
  applyTheme();
  loadMediaDevices();

  setTimeout(() => {
    document.getElementById('boot-progress')!.style.width = '100%';
    document.getElementById('boot-status')!.innerText = "Environment Ready.";
    setTimeout(() => {
      if (appConfig.setupDone) {
        switchScreen('dashboard');
        renderManagedApps();
        renderRoutines();
        renderProjects();
      } else {
        switchScreen('setup');
      }
    }, 600);
  }, 1200);
}

async function saveSettings() {
  try { await invoke('save_commands', { data: JSON.stringify(appConfig, null, 2) }); } catch (err) {}
}

initSystem();

async function loadMediaDevices() {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    const devices = await navigator.mediaDevices.enumerateDevices();
    const micSelect = document.getElementById('mic-select') as HTMLSelectElement;
    const spkSelect = document.getElementById('speaker-select') as HTMLSelectElement;
    micSelect.innerHTML = ''; spkSelect.innerHTML = '';
    devices.forEach(d => {
      if (d.kind === 'audioinput') micSelect.innerHTML += `<option value="${d.deviceId}">${d.label || 'Unknown Mic'}</option>`;
      if (d.kind === 'audiooutput') spkSelect.innerHTML += `<option value="${d.deviceId}">${d.label || 'Unknown Speaker'}</option>`;
    });
  } catch (err) {}
}

let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
function updateSlide(dir: number) { slides[currentSlide].classList.remove('active'); currentSlide += dir; slides[currentSlide].classList.add('active'); }
document.querySelectorAll('.next-btn').forEach(btn => btn.addEventListener('click', () => updateSlide(1)));
document.querySelectorAll('.prev-btn').forEach(btn => btn.addEventListener('click', () => updateSlide(-1)));

document.getElementById('verify-name-btn')?.addEventListener('click', () => {
  const input = document.getElementById('setup-username') as HTMLInputElement;
  const errorText = document.getElementById('name-error')!;
  const nameVal = input.value.trim().toLowerCase();
  if (nameVal.length < 2) { errorText.innerText = "Name must be at least 2 characters."; errorText.style.display = "block"; return; }
  if (badWords.some(word => nameVal.includes(word))) { errorText.innerText = "Name not permitted."; errorText.style.display = "block"; return; }
  errorText.style.display = "none";
  appConfig.userName = input.value.trim();
  document.getElementById('welcome-message')!.innerText = `Welcome back, ${appConfig.userName}`;
  (document.getElementById('dash-username') as HTMLInputElement).value = appConfig.userName;
  updateSlide(1);
});

document.getElementById('skip-scan-btn')?.addEventListener('click', () => {
  updateSlide(1);
  const btn = document.getElementById('finish-setup-btn') as HTMLButtonElement;
  btn.disabled = false; btn.innerHTML = `<i data-lucide="hammer"></i> Build Environment`;
  document.getElementById('scan-counter')!.innerText = `Skipped Scan`;
  (window as any).lucide.createIcons();
});

let scanCount = 0;
let isDashScan = false;

listen('app-found', (event: any) => {
  const app = event.payload;
  scanCount++;
  globalDiscoveredApps.push(app);
  
  if (isDashScan) {
    document.getElementById('dash-scan-counter')!.innerText = `Found: ${scanCount}`;
    document.getElementById('dash-scan-results')!.innerHTML += `
      <div class="app-row" style="cursor: default;">
        <div class="app-row-header">
          <div class="app-row-title"><h4>${app.name}</h4></div>
          <label class="switch"><input type="checkbox" checked id="dash-chk-${scanCount}" data-name="${app.name}" data-path="${app.path}" data-key="${app.keyword}"><span class="slider"></span></label>
        </div>
      </div>
    `;
  } else {
    document.getElementById('scan-counter')!.innerText = `Found: ${scanCount}`;
    document.getElementById('scan-results')!.innerHTML += `
      <div class="app-row" style="cursor: default;">
        <div class="app-row-header">
          <div class="app-row-title"><h4>${app.name}</h4></div>
          <label class="switch"><input type="checkbox" checked id="app-chk-${scanCount}" data-name="${app.name}" data-path="${app.path}" data-key="${app.keyword}"><span class="slider"></span></label>
        </div>
      </div>
    `;
  }
});

listen('scan-complete', () => {
  if (isDashScan) {
    const btn = document.getElementById('save-scanned-apps-btn') as HTMLButtonElement;
    btn.disabled = false; btn.innerHTML = `Save Selected`;
    document.getElementById('dash-scan-counter')!.innerText = `Complete: ${scanCount} Apps`;
  } else {
    const btn = document.getElementById('finish-setup-btn') as HTMLButtonElement;
    btn.disabled = false; btn.innerHTML = `<i data-lucide="hammer"></i> Build Environment`;
    document.getElementById('scan-counter')!.innerText = `Complete: ${scanCount} Apps`;
  }
  (window as any).lucide.createIcons();
});

document.getElementById('start-scan-btn')?.addEventListener('click', async () => { isDashScan = false; globalDiscoveredApps = []; updateSlide(1); invoke('start_full_scan'); });

document.getElementById('finish-setup-btn')?.addEventListener('click', async () => {
  appConfig.setupDone = true;
  appConfig.wakeword = (document.getElementById('setup-wakeword') as HTMLInputElement).value || (document.getElementById('dash-wakeword') as HTMLInputElement).value;
  (document.getElementById('dash-wakeword') as HTMLInputElement).value = appConfig.wakeword;
  appConfig.apps = [];
  document.querySelectorAll('input[type="checkbox"][id^="app-chk-"]:checked').forEach(chk => {
    const el = chk as HTMLInputElement;
    appConfig.apps.push({ name: el.dataset.name, path: el.dataset.path, keyword: el.dataset.key, urls: [] });
  });
  await saveSettings();
  setTimeout(() => { switchScreen('dashboard'); renderManagedApps(); renderRoutines(); renderProjects(); }, 1000);
});

function applyTheme() {
  document.documentElement.style.setProperty('--grad-start', appConfig.gradStart);
  document.documentElement.style.setProperty('--grad-end', appConfig.gradEnd);
  const startPicker = document.getElementById('color-start') as HTMLInputElement;
  const endPicker = document.getElementById('color-end') as HTMLInputElement;
  if(startPicker) startPicker.value = appConfig.gradStart;
  if(endPicker) endPicker.value = appConfig.gradEnd;
}

document.querySelectorAll('.color-picker').forEach(p => p.addEventListener('input', (e) => {
  if ((e.target as HTMLInputElement).id === 'color-start') appConfig.gradStart = (e.target as HTMLInputElement).value;
  if ((e.target as HTMLInputElement).id === 'color-end') appConfig.gradEnd = (e.target as HTMLInputElement).value;
  applyTheme(); saveSettings(); 
}));

document.querySelectorAll('.preset-btn').forEach(btn => btn.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  appConfig.gradStart = t.dataset.start!;
  appConfig.gradEnd = t.dataset.end!;
  applyTheme(); saveSettings();
}));

document.getElementById('reset-gradient-btn')?.addEventListener('click', () => {
  appConfig.gradStart = "#0f1225"; appConfig.gradEnd = "#1a1025";
  applyTheme(); saveSettings();
});

document.getElementById('dash-username')?.addEventListener('change', (e) => { appConfig.userName = (e.target as HTMLInputElement).value; document.getElementById('welcome-message')!.innerText = `Welcome back, ${appConfig.userName}`; saveSettings(); });
document.getElementById('dash-wakeword')?.addEventListener('change', (e) => { appConfig.wakeword = (e.target as HTMLInputElement).value; saveSettings(); });
document.getElementById('setting-a11y')?.addEventListener('change', (e) => document.body.classList.toggle('a11y-mode', (e.target as HTMLInputElement).checked));

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active')); document.getElementById((btn as HTMLElement).dataset.target!)?.classList.add('active');
  });
});

document.getElementById('search-apps')?.addEventListener('keyup', (e) => renderManagedApps((e.target as HTMLInputElement).value));
document.getElementById('search-routines')?.addEventListener('keyup', (e) => renderRoutines((e.target as HTMLInputElement).value));
document.getElementById('search-projects')?.addEventListener('keyup', (e) => renderProjects((e.target as HTMLInputElement).value));

function isBrowser(name: string) { return name.toLowerCase().match(/(chrome|edge|firefox|brave|browser)/) !== null; }

function renderManagedApps(filter: string = "") {
  const list = document.getElementById('managed-apps-list')!;
  list.innerHTML = '';
  const filtered = appConfig.apps.filter(a => a.name.toLowerCase().includes(filter.toLowerCase()));
  if (filtered.length === 0) { list.innerHTML = `<p class="text-muted text-center mt-4">No applications found.</p>`; return; }
  
  appConfig.apps.forEach((app, index) => {
    if(!app.name.toLowerCase().includes(filter.toLowerCase())) return;
    let urlHtml = '';
    if(isBrowser(app.name)) {
      if(!app.urls) app.urls = [];
      app.urls.forEach((u: any, uIdx: number) => {
        urlHtml += `<div class="url-row"><input type="text" value="${u.keyword}" placeholder="URL Keyword" onchange="window.updateUrlKw(${index}, ${uIdx}, this.value)" style="flex:1"><input type="text" value="${u.url}" placeholder="https://" onchange="window.updateUrl(${index}, ${uIdx}, this.value)" style="flex:2"><button class="btn-icon" onclick="window.removeUrl(${index}, ${uIdx})"><i data-lucide="x"></i></button></div>`;
      });
      urlHtml = `<div class="input-group mt-2"><div class="flex-between"><label>Linked Browser URLs</label><button class="btn-secondary btn-small" onclick="window.addUrl(${index})">+ URL</button></div>${urlHtml}</div>`;
    }
    list.innerHTML += `
      <div class="app-row" onclick="this.classList.toggle('expanded')">
        <div class="app-row-header">
          <div class="app-row-title"><i data-lucide="box"></i> ${app.name}</div>
          <div class="app-actions">
            <button class="btn-icon" onclick="event.stopPropagation(); window.removeApp(${index})"><i data-lucide="trash-2"></i></button>
            <i data-lucide="chevron-down" class="text-muted"></i>
          </div>
        </div>
        <div class="app-details" onclick="event.stopPropagation()">
          <div class="input-group"><label>Voice Keyword</label><input type="text" value="${app.keyword}" onchange="window.updateAppKeyword(${index}, this.value)"></div>
          <div class="input-group"><label>File Path</label><input type="text" value="${app.path}" readonly style="opacity: 0.7;"></div>
          ${urlHtml}
        </div>
      </div>`;
  });
  (window as any).lucide.createIcons();
}

function renderRoutines(filter: string = "") {
  const list = document.getElementById('routines-list')!;
  list.innerHTML = '';
  const filtered = appConfig.routines.filter(r => r.name.toLowerCase().includes(filter.toLowerCase()));
  if (filtered.length === 0) { list.innerHTML = `<p class="text-muted text-center mt-4">No routines found.</p>`; return; }
  appConfig.routines.forEach((r, i) => {
    if(!r.name.toLowerCase().includes(filter.toLowerCase())) return;
    const actionsDisplay = r.actions.join(', ');
    list.innerHTML += `<div class="app-row" onclick="this.classList.toggle('expanded')"><div class="app-row-header"><div class="app-row-title"><i data-lucide="layers"></i> ${r.name}</div><div class="app-actions"><button class="btn-icon" onclick="event.stopPropagation(); window.removeRoutine(${i})"><i data-lucide="trash-2"></i></button><i data-lucide="chevron-down" class="text-muted"></i></div></div><div class="app-details" onclick="event.stopPropagation()"><div class="input-group"><label>Keyword</label><input type="text" value="${r.keyword}" onchange="window.updateRoutineKw(${i}, this.value)"></div><div class="input-group"><label>Target Apps</label><input type="text" value="${actionsDisplay}" readonly style="opacity:0.7;"></div></div></div>`;
  });
  (window as any).lucide.createIcons();
}

function renderProjects(filter: string = "") {
  const list = document.getElementById('projects-list')!;
  list.innerHTML = '';
  const filtered = appConfig.projects.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));
  if (filtered.length === 0) { list.innerHTML = `<p class="text-muted text-center mt-4">No projects found.</p>`; return; }
  appConfig.projects.forEach((p, i) => {
    if(!p.name.toLowerCase().includes(filter.toLowerCase())) return;
    list.innerHTML += `<div class="app-row" onclick="this.classList.toggle('expanded')"><div class="app-row-header"><div class="app-row-title"><i data-lucide="folder-code"></i> ${p.name}</div><div class="app-actions"><button class="btn-icon" onclick="event.stopPropagation(); window.removeProject(${i})"><i data-lucide="trash-2"></i></button><i data-lucide="chevron-down" class="text-muted"></i></div></div><div class="app-details" onclick="event.stopPropagation()"><div class="input-group"><label>Keyword</label><input type="text" value="${p.keyword}" onchange="window.updateProjectKw(${i}, this.value)"></div><div class="input-group"><label>Path</label><input type="text" value="${p.path}" readonly style="opacity:0.7;"></div></div></div>`;
  });
  (window as any).lucide.createIcons();
}

(window as any).removeApp = (i: number) => { appConfig.apps.splice(i, 1); saveSettings(); renderManagedApps((document.getElementById('search-apps') as HTMLInputElement).value); };
(window as any).updateAppKeyword = (i: number, val: string) => { appConfig.apps[i].keyword = val; saveSettings(); };
(window as any).addUrl = (i: number) => { if(!appConfig.apps[i].urls) appConfig.apps[i].urls = []; appConfig.apps[i].urls.push({keyword:"", url:""}); saveSettings(); renderManagedApps((document.getElementById('search-apps') as HTMLInputElement).value); };
(window as any).removeUrl = (i: number, ui: number) => { appConfig.apps[i].urls.splice(ui, 1); saveSettings(); renderManagedApps((document.getElementById('search-apps') as HTMLInputElement).value); };
(window as any).updateUrlKw = (i: number, ui: number, val: string) => { appConfig.apps[i].urls[ui].keyword = val; saveSettings(); };
(window as any).updateUrl = (i: number, ui: number, val: string) => { appConfig.apps[i].urls[ui].url = val; saveSettings(); };
(window as any).removeRoutine = (i: number) => { appConfig.routines.splice(i, 1); saveSettings(); renderRoutines((document.getElementById('search-routines') as HTMLInputElement).value); };
(window as any).updateRoutineKw = (i: number, val: string) => { appConfig.routines[i].keyword = val; saveSettings(); };
(window as any).removeProject = (i: number) => { appConfig.projects.splice(i, 1); saveSettings(); renderProjects((document.getElementById('search-projects') as HTMLInputElement).value); };
(window as any).updateProjectKw = (i: number, val: string) => { appConfig.projects[i].keyword = val; saveSettings(); };

document.getElementById('open-scan-modal-btn')?.addEventListener('click', () => {
  isDashScan = true; scanCount = 0; globalDiscoveredApps = [];
  document.getElementById('dash-scan-results')!.innerHTML = '';
  document.getElementById('dash-scan-counter')!.innerText = 'Scanning...';
  const btn = document.getElementById('save-scanned-apps-btn') as HTMLButtonElement;
  btn.disabled = true; btn.innerHTML = `<i data-lucide="loader" class="pulse"></i> Scanning...`;
  document.getElementById('dash-scan-modal')!.classList.add('active');
  invoke('start_full_scan');
});

document.getElementById('save-scanned-apps-btn')?.addEventListener('click', async () => {
  document.querySelectorAll('input[type="checkbox"][id^="dash-chk-"]:checked').forEach(chk => {
    const el = chk as HTMLInputElement;
    const exists = appConfig.apps.find(a => a.path === el.dataset.path);
    if(!exists) appConfig.apps.push({ name: el.dataset.name, path: el.dataset.path, keyword: el.dataset.key, urls: [] });
  });
  await saveSettings(); renderManagedApps((document.getElementById('search-apps') as HTMLInputElement).value); document.getElementById('dash-scan-modal')!.classList.remove('active');
});

document.getElementById('open-add-app-modal')?.addEventListener('click', () => {
  (document.getElementById('manual-app-name') as HTMLInputElement).value = '';
  (document.getElementById('manual-app-keyword') as HTMLInputElement).value = '';
  (document.getElementById('manual-app-path') as HTMLInputElement).value = '';
  document.getElementById('add-app-modal')!.classList.add('active');
});

document.getElementById('browse-manual-app')?.addEventListener('click', async () => {
  try {
    const selectedPath = await openDialog({ directory: false, multiple: false });
    if(selectedPath) (document.getElementById('manual-app-path') as HTMLInputElement).value = selectedPath as string;
  } catch (err) {}
});

document.getElementById('save-manual-app-btn')?.addEventListener('click', () => {
  const name = (document.getElementById('manual-app-name') as HTMLInputElement).value;
  const kw = (document.getElementById('manual-app-keyword') as HTMLInputElement).value;
  const path = (document.getElementById('manual-app-path') as HTMLInputElement).value;
  if(name && path) {
    appConfig.apps.push({ name, keyword: kw || `open ${name.toLowerCase()}`, path, urls: [] });
    saveSettings(); renderManagedApps((document.getElementById('search-apps') as HTMLInputElement).value); 
    document.getElementById('add-app-modal')!.classList.remove('active');
  }
});

document.getElementById('open-routine-modal')?.addEventListener('click', () => {
  const list = document.getElementById('add-routine-app-list')!;
  list.innerHTML = '';
  appConfig.apps.forEach(a => {
    list.innerHTML += `<label class="selection-item"><input type="checkbox" class="routine-chk" value="${a.name}"> ${a.name}</label>`;
  });
  document.getElementById('add-routine-modal')!.classList.add('active');
});

document.getElementById('add-routine-search')?.addEventListener('keyup', (e) => {
  const filter = (e.target as HTMLInputElement).value.toLowerCase();
  const list = document.getElementById('add-routine-app-list')!;
  list.innerHTML = '';
  appConfig.apps.forEach(a => {
    if(a.name.toLowerCase().includes(filter)) list.innerHTML += `<label class="selection-item"><input type="checkbox" class="routine-chk" value="${a.name}"> ${a.name}</label>`;
  });
});

document.getElementById('save-routine-btn')?.addEventListener('click', () => {
  const name = (document.getElementById('add-routine-name') as HTMLInputElement).value;
  const kw = (document.getElementById('add-routine-keyword') as HTMLInputElement).value;
  const actions: string[] = [];
  document.querySelectorAll('.routine-chk:checked').forEach(c => actions.push((c as HTMLInputElement).value));
  appConfig.routines.push({ name, keyword: kw, actions });
  saveSettings(); renderRoutines((document.getElementById('search-routines') as HTMLInputElement).value); document.getElementById('add-routine-modal')!.classList.remove('active');
});

document.getElementById('open-project-modal')?.addEventListener('click', () => document.getElementById('add-project-modal')!.classList.add('active'));

document.getElementById('browse-project-btn')?.addEventListener('click', async () => {
  try {
    const selectedPath = await openDialog({ directory: true, multiple: false });
    if(selectedPath) (document.getElementById('add-project-path') as HTMLInputElement).value = selectedPath as string;
  } catch (err) {}
});

document.getElementById('save-project-btn')?.addEventListener('click', () => {
  const name = (document.getElementById('add-project-name') as HTMLInputElement).value;
  const kw = (document.getElementById('add-project-keyword') as HTMLInputElement).value;
  const path = (document.getElementById('add-project-path') as HTMLInputElement).value;
  appConfig.projects.push({ name, keyword: kw, path });
  saveSettings(); renderProjects((document.getElementById('search-projects') as HTMLInputElement).value); document.getElementById('add-project-modal')!.classList.remove('active');
});

const posModal = document.getElementById('position-modal')!;
document.getElementById('open-position-modal')?.addEventListener('click', () => {
  document.querySelectorAll('.grid-cell').forEach(c => c.classList.remove('selected'));
  const activeCell = document.querySelector(`.grid-cell[data-pos="${appConfig.widgetPos}"]`);
  if (activeCell) activeCell.classList.add('selected');
  posModal.classList.add('active');
});
document.getElementById('close-position-modal')?.addEventListener('click', () => posModal.classList.remove('active'));
document.querySelectorAll('.grid-cell:not(.center-void)').forEach(cell => {
  cell.addEventListener('click', (e) => {
    document.querySelectorAll('.grid-cell').forEach(c => c.classList.remove('selected'));
    const target = e.target as HTMLElement; target.classList.add('selected');
    appConfig.widgetPos = target.dataset.pos!; saveSettings(); setTimeout(() => posModal.classList.remove('active'), 250);
  });
});

let recognition: any;
let voiceState = "IDLE";
let widgetTimeout: any;

const numMap: {[key:string]: string} = { "one": "1", "two": "2", "three": "3", "four": "4", "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9", "zero": "0" };
function phoneticsToNumbers(text: string) { return text.split(' ').map(w => numMap[w] || w).join(' '); }

function initVoiceEngine() {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return;
  recognition = new SR();
  recognition.continuous = true; recognition.interimResults = true;
  const audioVis = document.getElementById('audio-bars')!;
  const transText = document.getElementById('transcription-text')!;
  const optionsList = document.getElementById('widget-options')!;

  recognition.onresult = (event: any) => {
    const current = event.resultIndex;
    let transcript = phoneticsToNumbers(event.results[current][0].transcript.toLowerCase().trim());
    const isFinal = event.results[current].isFinal;

    if (transcript === `${appConfig.wakeword.toLowerCase()} refresh` || transcript === `${appConfig.userName.toLowerCase()} refresh` || transcript === "refresh") {
      window.location.reload();
      return;
    }

    if (voiceState === "IDLE") {
      if (transcript.includes(appConfig.wakeword.toLowerCase())) {
        voiceState = "AWAKE"; switchScreen('widget'); audioVis.className = 'audio-visualizer listening';
        transText.innerText = `Awaiting command...`; transText.style.color = 'var(--text-main)'; optionsList.style.display = 'none';
        clearTimeout(widgetTimeout);
      }
      return;
    }

    if (voiceState === "DISAMBIGUATE") {
      if (transcript.includes("cancel") || transcript.includes("stop")) { transText.innerText = "Cancelled."; sleepWidget(0); return; }
      let selectedIndex = -1;
      const textLower = transcript.toLowerCase();
      if (textLower.match(/\b(1|one|first)\b/)) selectedIndex = 0;
      else if (textLower.match(/\b(2|two|second)\b/)) selectedIndex = 1;
      else if (textLower.match(/\b(3|three|third)\b/)) selectedIndex = 2;
      else if (textLower.match(/\b(4|four|fourth)\b/)) selectedIndex = 3;
      else if (textLower.match(/\b(5|five|fifth)\b/)) selectedIndex = 4;

      if (selectedIndex >= 0 && selectedIndex < currentDisambiguation.length) {
        voiceState = "PROCESSING"; optionsList.style.display = 'none'; transText.style.color = 'var(--success)';
        transText.innerText = `Starting ${currentDisambiguation[selectedIndex].name}...`;
        currentDisambiguation[selectedIndex].action().then(() => sleepWidget(0)).catch(() => { transText.innerText = "Failed to launch."; sleepWidget(1500); });
      } else { transText.innerText = `Say "Option 1" or "Cancel"...`; }
      return;
    }

    if (voiceState === "AWAKE") {
      if (transcript.includes("cancel") || transcript.includes("stop")) { transText.innerText = "Cancelled."; sleepWidget(0); return; }
      
      const cleanText = transcript.replace(/[.,?!]/g, "").trim();
      if (cleanText.startsWith("close ") || cleanText.startsWith("quit ") || cleanText.startsWith("kill ")) {
        if (isFinal) {
          const target = cleanText.replace(/^(close|quit|kill)\s+/, "").trim();
          const app = appConfig.apps.find(a => a.name.toLowerCase().includes(target) || a.keyword.toLowerCase().includes(target));
          if (app) {
            const exeName = app.path.split('\\').pop();
            if (exeName) {
              transText.style.color = 'var(--warning)'; transText.innerText = `Closing ${app.name}...`;
              invoke('kill_process', { exeName }).then(() => sleepWidget(0)).catch(() => sleepWidget(0));
              return;
            }
          }
          transText.innerText = `Could not find app to close.`;
          sleepWidget(1500);
        }
        return;
      }

      if (transcript.includes("open ")) {
        transText.innerText = `"${transcript}..."`;
        if (isFinal) {
          voiceState = "PROCESSING"; audioVis.className = 'audio-visualizer processing'; transText.innerText = "Executing...";
          processCommand(transcript);
        }
      }
    }
  };
  recognition.onend = () => { if (voiceState === "IDLE" || voiceState === "AWAKE") recognition.start(); };
  recognition.start();
}

function sleepWidget(delay = 1000) { voiceState = "IDLE"; setTimeout(() => switchScreen('dashboard'), delay); }

async function processCommand(text: string) {
  const transText = document.getElementById('transcription-text')!;
  const optionsList = document.getElementById('widget-options')!;
  const cleanText = text.replace(/[.,?!]/g, "").trim();
  const target = cleanText.replace(/^open\s+/, "").trim();

  let matches: {name: string, action: () => Promise<void>}[] = [];

  appConfig.routines.forEach(r => {
    if (cleanText.includes(r.keyword.toLowerCase())) {
      matches.push({ name: `Routine: ${r.name}`, action: async () => { 
        for (const aName of r.actions) {
          const app = appConfig.apps.find(a => a.name === aName);
          if(app) {
            try { await invoke('launch_app', { path: app.path }); } catch(e) {}
          }
        }
      } });
    }
  });

  appConfig.projects.forEach(p => {
    if (cleanText.includes(p.keyword.toLowerCase()) || p.name.toLowerCase().includes(target)) {
      matches.push({ name: `Project: ${p.name}`, action: async () => { 
        try { await invoke('launch_project', { path: p.path }); } catch(e) {}
      } });
    }
  });

  appConfig.apps.forEach(app => {
    if(app.urls && app.urls.length > 0) {
      if (cleanText.includes(`${app.name.toLowerCase()} tabs`) || cleanText.includes(`${app.keyword.toLowerCase()} tabs`)) {
        matches.push({ name: `All ${app.name} Tabs`, action: async () => { for(const u of app.urls) await open(u.url); } });
      }
      app.urls.forEach((u:any) => {
        if (cleanText.includes(`open ${u.keyword.toLowerCase()}`)) {
          matches.push({ name: `URL: ${u.keyword}`, action: async () => { await open(u.url); } });
        }
      });
    }
  });

  if (matches.length === 0) {
    let regexPattern;
    if (target.length <= 3) regexPattern = new RegExp(target, 'i');
    else regexPattern = new RegExp(`\\b${target}`, 'i');

    const appMatches = appConfig.apps.filter(app => regexPattern.test(app.name.toLowerCase()) || regexPattern.test(app.keyword.toLowerCase()) || app.keyword.toLowerCase().includes(target));
    appMatches.forEach(app => {
      matches.push({ name: `App: ${app.name}`, action: async () => { 
        try { await invoke('launch_app', { path: app.path }); } catch(e) {}
      } });
    });
  }

  if (matches.length === 0) { transText.style.color = 'var(--warning)'; transText.innerText = `Not found: "${target}".`; sleepWidget(1500); return; }

  if (matches.length === 1) {
    transText.style.color = 'var(--success)'; transText.innerText = `Launching ${matches[0].name}...`;
    try { await matches[0].action(); } catch(e) {}
    sleepWidget(0);
  } else {
    voiceState = "DISAMBIGUATE"; currentDisambiguation = matches; transText.innerText = `Multiple found. Say "Option 1" or "Cancel".`;
    optionsList.style.display = 'flex'; optionsList.innerHTML = '';
    matches.forEach((m, idx) => {
      const btn = document.createElement('button'); btn.className = 'option-btn'; btn.innerHTML = `<span class="option-badge">Option ${idx + 1}</span> Open ${m.name}`;
      btn.onclick = async () => { 
        optionsList.style.display = 'none'; transText.style.color = 'var(--success)'; transText.innerText = `Launching ${m.name}...`; 
        try { await m.action(); } catch(e) {}
        sleepWidget(0); 
      };
      optionsList.appendChild(btn);
    });
    (window as any).lucide.createIcons();
  }
}

initVoiceEngine();