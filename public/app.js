const state = {
  data: null,
  screen: 'home',
  activeScenarioId: null,
  activeTab: 'rights',
  settings: {
    contactName: '',
    contactPhone: '',
    largeText: false,
    highContrast: false,
    lastScenario: ''
  }
};

const storageKeys = {
  contactName: 'protectcard_contact_name',
  contactPhone: 'protectcard_contact_phone',
  largeText: 'protectcard_large_text',
  highContrast: 'protectcard_high_contrast',
  lastScenario: 'protectcard_last_scenario'
};

const appEl = document.getElementById('app');

function applySettings() {
  document.body.classList.toggle('large-text', state.settings.largeText);
  document.body.classList.toggle('high-contrast', state.settings.highContrast);
}

function loadSettings() {
  state.settings.contactName = localStorage.getItem(storageKeys.contactName) || '';
  state.settings.contactPhone = localStorage.getItem(storageKeys.contactPhone) || '';
  state.settings.largeText = localStorage.getItem(storageKeys.largeText) === 'true';
  state.settings.highContrast = localStorage.getItem(storageKeys.highContrast) === 'true';
  state.settings.lastScenario = localStorage.getItem(storageKeys.lastScenario) || '';
}

function saveSettings() {
  localStorage.setItem(storageKeys.contactName, state.settings.contactName);
  localStorage.setItem(storageKeys.contactPhone, state.settings.contactPhone);
  localStorage.setItem(storageKeys.largeText, String(state.settings.largeText));
  localStorage.setItem(storageKeys.highContrast, String(state.settings.highContrast));
  localStorage.setItem(storageKeys.lastScenario, state.settings.lastScenario || '');
}

function getScenario() {
  return state.data?.scenarios.find((s) => s.id === state.activeScenarioId) || null;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert('Copied to clipboard.');
  } catch {
    alert('Could not copy automatically. Please copy manually.');
  }
}

function trustedContactMessage(scenarioTitle) {
  const name = state.settings.contactName || 'Trusted contact';
  return `Hi ${name}, I may need help. I am in "${scenarioTitle}" mode in ProtectCard. Please check in with me.`;
}

async function shareLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation is not available on this device.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: 'My current location',
            text: 'My current location',
            url: mapsLink
          });
          return;
        } catch {
          // Fall through to copy.
        }
      }

      await copyText(mapsLink);
    },
    () => {
      alert('Unable to get your location.');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function scenarioScreenTemplate(scenario) {
  const disclaimer = state.data.app.disclaimer;
  const tabs = [
    { key: 'rights', label: 'Your Rights' },
    { key: 'say', label: 'Say This' },
    { key: 'steps', label: 'What To Do' },
    { key: 'legal', label: 'Legal Basis' }
  ];

  const panelContent =
    state.activeTab === 'rights'
      ? `<div class="panel"><ul>${scenario.rightsPlain.map((item) => `<li>${item}</li>`).join('')}</ul></div>`
      : state.activeTab === 'say'
        ? `<div class="panel">
            <div class="row" style="margin-bottom:0.7rem;">
              <button class="btn btn-primary" data-action="copy-all-say">Copy Say This</button>
            </div>
            ${scenario.sayThis
              .map(
                (line) => `<div class="say-item">
                <div class="say-text">${line}</div>
                <button class="btn" data-action="copy-line" data-line="${encodeURIComponent(line)}">Copy</button>
              </div>`
              )
              .join('')}
            ${
              scenario.importantNotes?.length
                ? `<div class="note"><strong>Important:</strong> ${scenario.importantNotes.join(' ')}</div>`
                : ''
            }
          </div>`
        : state.activeTab === 'steps'
          ? `<div class="panel"><ul>${scenario.steps.map((step) => `<li>${step}</li>`).join('')}</ul></div>`
          : `<div class="panel">${
              scenario.legalBasis.length
                ? scenario.legalBasis
                    .map(
                      (law) => `<article class="legal-item"><p class="legal-title">${law.title}</p><p>${law.summary}</p></article>`
                    )
                    .join('')
                : '<p>No legal basis details for this emergency-focused screen.</p>'
            }</div>`;

  return `
    <section>
      <div class="nav-head">
        <button class="btn back-btn" data-action="go-home">← Back</button>
      </div>
      <h1 class="header-title">${scenario.icon} ${scenario.title}</h1>
      <p class="disclaimer">${disclaimer}</p>

      <div class="tabs">
        ${tabs
          .map(
            (tab) => `<button class="tab ${state.activeTab === tab.key ? 'active' : ''}" data-action="tab" data-tab="${tab.key}">${tab.label}</button>`
          )
          .join('')}
      </div>

      ${panelContent}
      <div class="footer-space" aria-hidden="true"></div>
    </section>

    <div class="sticky-bar">
      <div class="sticky-grid">
        <a class="btn btn-primary" href="tel:911">Call 911</a>
        <a class="btn" href="${buildSmsHref(scenario)}">Text contact</a>
        <button class="btn" data-action="share-location">Share location</button>
        <button class="btn" data-action="copy-all-say">Copy “Say This”</button>
      </div>
    </div>
  `;
}

function buildSmsHref(scenario) {
  const phone = (state.settings.contactPhone || '').replace(/\s+/g, '');
  const safePhone = encodeURIComponent(phone);
  const body = encodeURIComponent(trustedContactMessage(scenario.title));
  return phone ? `sms:${safePhone}?body=${body}` : `sms:?body=${body}`;
}

function homeTemplate() {
  const { scenarios, app } = state.data;

  return `
    <section>
      <h1 class="header-title">${app.name}</h1>
      <p class="disclaimer">${app.disclaimer}</p>

      <h2 class="section-title">Choose a scenario</h2>
      <div class="scenario-grid">
        ${scenarios
          .map(
            (scenario) => `<button class="card" data-action="open-scenario" data-id="${scenario.id}">
              <span class="card-icon">${scenario.icon}</span>
              <span>${scenario.title}</span>
            </button>`
          )
          .join('')}
      </div>

      <h2 class="section-title">Trusted contact</h2>
      <div class="form-grid">
        <input class="input" type="text" id="contactName" placeholder="Trusted contact name" value="${state.settings.contactName}" />
        <input class="input" type="tel" id="contactPhone" placeholder="Trusted contact phone" value="${state.settings.contactPhone}" />
        <div class="row">
          <button class="btn btn-primary" data-action="save-contact">Save</button>
          <button class="btn" data-action="clear-contact">Clear</button>
        </div>
      </div>

      <h2 class="section-title">Display options</h2>
      <div class="toggle-group">
        <button class="btn toggle ${state.settings.largeText ? 'active' : ''}" data-action="toggle-large">A+ Large text</button>
        <button class="btn toggle ${state.settings.highContrast ? 'active' : ''}" data-action="toggle-contrast">High contrast</button>
      </div>
    </section>
  `;
}

function render() {
  if (!state.data) {
    appEl.innerHTML = '<p>Loading…</p>';
    return;
  }

  applySettings();

  if (state.screen === 'scenario') {
    const scenario = getScenario();
    if (!scenario) {
      state.screen = 'home';
      appEl.innerHTML = homeTemplate();
      return;
    }
    appEl.innerHTML = scenarioScreenTemplate(scenario);
    return;
  }

  appEl.innerHTML = homeTemplate();
}

function setupEvents() {
  appEl.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    const action = target.getAttribute('data-action');

    if (action === 'open-scenario') {
      state.activeScenarioId = target.getAttribute('data-id');
      state.settings.lastScenario = state.activeScenarioId;
      state.screen = 'scenario';
      state.activeTab = 'rights';
      saveSettings();
      render();
      return;
    }

    if (action === 'go-home') {
      state.screen = 'home';
      render();
      return;
    }

    if (action === 'tab') {
      state.activeTab = target.getAttribute('data-tab');
      render();
      return;
    }

    if (action === 'save-contact') {
      const nameInput = document.getElementById('contactName');
      const phoneInput = document.getElementById('contactPhone');
      state.settings.contactName = nameInput?.value.trim() || '';
      state.settings.contactPhone = phoneInput?.value.trim() || '';
      saveSettings();
      alert('Trusted contact saved.');
      render();
      return;
    }

    if (action === 'clear-contact') {
      state.settings.contactName = '';
      state.settings.contactPhone = '';
      saveSettings();
      render();
      return;
    }

    if (action === 'toggle-large') {
      state.settings.largeText = !state.settings.largeText;
      saveSettings();
      render();
      return;
    }

    if (action === 'toggle-contrast') {
      state.settings.highContrast = !state.settings.highContrast;
      saveSettings();
      render();
      return;
    }

    if (action === 'copy-line') {
      const line = decodeURIComponent(target.getAttribute('data-line'));
      await copyText(line);
      return;
    }

    if (action === 'copy-all-say') {
      const scenario = getScenario();
      if (!scenario) return;
      await copyText(scenario.sayThis.join('\n'));
      return;
    }

    if (action === 'share-location') {
      await shareLocation();
    }
  });
}

async function loadData() {
  const response = await fetch('/api/scenarios');
  if (!response.ok) {
    throw new Error('Unable to load scenarios');
  }
  return response.json();
}

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch {
      // Ignore in unsupported contexts.
    }
  }
}

(async function init() {
  loadSettings();
  setupEvents();

  try {
    state.data = await loadData();
    if (state.settings.lastScenario) {
      const found = state.data.scenarios.some((s) => s.id === state.settings.lastScenario);
      if (found) {
        state.activeScenarioId = state.settings.lastScenario;
      }
    }
  } catch {
    appEl.innerHTML = '<p>Unable to load app data. Please try again.</p>';
    return;
  }

  render();
  registerServiceWorker();
})();
