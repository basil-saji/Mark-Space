import { createIcons, ArrowLeft, Menu, Settings, Moon, Sun, Type, FileText, Search, Plus, Trash2, X, ChevronRight, Upload, Zap } from 'lucide';
import { db } from './js/db.js';
import { renderMarkdown, generateTOC } from './js/renderer.js';

// App State
let state = {
  view: 'home', // 'home' | 'reader'
  projects: [],
  currentProject: null,
  theme: localStorage.getItem('theme') || 'light',
  isSidebarOpen: window.innerWidth > 1024,
  isSettingsOpen: false,
  searchQuery: '',
  readerSettings: JSON.parse(localStorage.getItem('readerSettings')) || {
    fontSize: 18,
    lineHeight: 1.7,
    fontFamily: 'Inter',
    maxWidth: 720
  }
};

const appEl = document.getElementById('app');

// Initialization
async function init() {
  await db.init();
  applyTheme(state.theme);
  await loadProjects();
  render();
}

// --- Data Operations ---

async function loadProjects() {
  state.projects = await db.getAllProjects();
}

async function createProject(name, content, size) {
  const project = {
    id: Date.now().toString(),
    name,
    content,
    size: (size / 1024).toFixed(1) + ' KB',
    updatedAt: Date.now()
  };
  await db.saveProject(project);
  await loadProjects();
  openProject(project.id);
}

async function openProject(id) {
  const project = await db.getProject(id);
  state.currentProject = project;
  state.view = 'reader';
  state.isSidebarOpen = window.innerWidth > 1024;
  render();
  window.scrollTo(0, 0);
}

async function deleteProject(id, e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  
  if (window.confirm('Are you sure you want to delete this project?')) {
    try {
      await db.deleteProject(id);
      await loadProjects();
      render();
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  }
}

// --- Theme & Settings ---

function applyTheme(theme) {
  document.body.className = `theme-${theme}`;
  localStorage.setItem('theme', theme);
  state.theme = theme;
}

function toggleTheme() {
  const themes = ['light', 'dark', 'oled'];
  const next = themes[(themes.indexOf(state.theme) + 1) % themes.length];
  applyTheme(next);
}

function updateReaderSettings(key, value) {
  state.readerSettings[key] = value;
  localStorage.setItem('readerSettings', JSON.stringify(state.readerSettings));
  applyReaderSettings();
}

function applyReaderSettings() {
  const root = document.documentElement;
  root.style.setProperty('--reader-width', `${state.readerSettings.maxWidth}px`);
  
  const content = document.querySelector('.markdown-body');
  if (content) {
    content.style.fontSize = `${state.readerSettings.fontSize}px`;
    content.style.lineHeight = state.readerSettings.lineHeight;
    content.style.fontFamily = state.readerSettings.fontFamily === 'Monospace' ? 'var(--font-mono)' : 'var(--font-sans)';
  }
}

// --- UI Components ---

function render() {
  if (state.view === 'home') {
    renderHome();
  } else {
    renderReader();
  }
  createIcons({
    icons: { ArrowLeft, Menu, Settings, Moon, Sun, Type, FileText, Search, Plus, Trash2, X, ChevronRight, Upload, Zap }
  });
  applyReaderSettings();
}

function renderHome() {
  const hasProjects = state.projects.length > 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  appEl.innerHTML = `
    <div class="container" style="padding-top: 4rem; padding-bottom: 4rem;">
      <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4rem; gap: 2rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0;">
          ${!hasProjects ? `
            <div style="background: var(--accent-color); color: var(--bg-color); width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
              <i data-lucide="zap" style="width: 18px; height: 18px;"></i>
            </div>
            <h1 class="text-xl font-bold">Mark Space</h1>
          ` : `
            <h1 class="text-2xl font-bold">${greeting} 👋</h1>
          `}
        </div>
        <div style="display: flex; align-items: center; gap: 1rem; flex-shrink: 0;">
          ${hasProjects ? `
            <button class="btn btn-primary desktop-only" id="btn-create-two">
              <i data-lucide="plus" style="width: 18px; height: 18px;"></i>
              <span>New Project</span>
            </button>
          ` : ''}
          <button class="btn btn-ghost" id="theme-toggle-home">
            <i data-lucide="${state.theme === 'light' ? 'sun' : 'moon'}" style="width: 20px; height: 20px;"></i>
          </button>
        </div>
      </header>

      ${hasProjects ? `
        <div class="search-container">
          <i data-lucide="search" style="position: absolute; left: 1.25rem; top: 50%; translate: 0 -50%; color: var(--text-tertiary); width: 18px; height: 18px;"></i>
          <input type="text" class="search-input" placeholder="Search your workspace..." value="${state.searchQuery}" id="search-input">
        </div>
        <div id="projects-container"></div>
        <button class="fab mobile-only" id="fab-create">
          <i data-lucide="plus" style="width: 24px; height: 24px;"></i>
        </button>
      ` : renderEmptyState()}
    </div>
  `;

  if (hasProjects) {
    renderProjectList();
  }
  setupHomeListeners();
}

function renderEmptyState() {
  return `
    <div class="home-hero">
      <h2 class="text-4xl font-bold" style="margin-bottom: 1rem;">Refined reading for modern minds.</h2>
      <p class="text-lg text-secondary" style="margin-bottom: 3rem; max-width: 540px; margin-left: auto; margin-right: auto;">
        Upload your markdown files and transform them into a premium reading experience. Private, local, and focused.
      </p>
      <button class="btn btn-primary" id="btn-create-one">
        <i data-lucide="plus" style="width: 18px; height: 18px;"></i>
        Create New Project
      </button>
    </div>
  `;
}

function renderProjectList() {
  const projectsContainer = document.getElementById('projects-container');
  if (!projectsContainer) return;

  const filteredProjects = state.projects.filter(p => 
    p.name.toLowerCase().includes(state.searchQuery.toLowerCase())
  );

  projectsContainer.innerHTML = `
    <div class="projects-grid">
      ${filteredProjects.map(p => `
        <div class="project-card" data-id="${p.id}">
          <div class="project-icon">
            <i data-lucide="file-text" style="width: 24px; height: 24px;"></i>
          </div>
          <h3 class="text-lg" style="margin-bottom: 0.25rem; padding-right: 2rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.name}</h3>
          <p class="text-xs text-tertiary font-medium">${p.size} • ${new Date(p.updatedAt).toLocaleDateString()}</p>
          <button class="delete-project-btn" data-id="${p.id}">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
      `).join('')}
    </div>
  `;

  // Use event delegation or re-attach
  projectsContainer.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Ensure we didn't click the delete button
      if (e.target.closest('.delete-project-btn')) return;
      openProject(card.dataset.id);
    });
  });

  projectsContainer.querySelectorAll('.delete-project-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      deleteProject(btn.dataset.id, e);
    });
  });
}

function renderReader() {
  const htmlContent = renderMarkdown(state.currentProject.content);
  const toc = generateTOC(state.currentProject.content);

  appEl.innerHTML = `
    <div class="progress-container"><div class="progress-bar"></div></div>
    <div class="reader-layout">
      <nav class="navbar">
        <div class="navbar-left" style="flex: 1; min-width: 0;">
          <button class="btn btn-ghost" id="back-to-home" style="padding: 0.5rem; flex-shrink: 0;">
            <i data-lucide="arrow-left" style="width: 20px; height: 20px;"></i>
          </button>
          <div style="width: 1px; height: 24px; background: var(--border-color); margin: 0 0.5rem; flex-shrink: 0;"></div>
          <button class="btn btn-ghost" id="toggle-sidebar" style="padding: 0.5rem; flex-shrink: 0;">
            <i data-lucide="menu" style="width: 20px; height: 20px;"></i>
          </button>
          <span class="navbar-title font-bold" style="flex: 1; min-width: 0; margin-left: 0.5rem;">${state.currentProject.name}</span>
        </div>
        <div class="navbar-right" style="flex-shrink: 0;">
          <button class="btn btn-ghost" id="toggle-settings" style="padding: 0.5rem;">
            <i data-lucide="settings" style="width: 18px; height: 18px;"></i>
          </button>
          <button class="btn btn-ghost" id="theme-toggle" style="padding: 0.5rem;">
            <i data-lucide="${state.theme === 'light' ? 'sun' : 'moon'}" style="width: 18px; height: 18px;"></i>
          </button>
        </div>
      </nav>

      <div class="reader-main">
        <aside class="sidebar ${state.isSidebarOpen ? '' : 'hidden'}">
          <div class="toc">
            <h3>Contents</h3>
            <ul class="toc-list">
              ${toc.map(item => `
                <li class="toc-item">
                  <a href="#${item.id}" class="toc-link h${item.depth}">${item.text}</a>
                </li>
              `).join('')}
            </ul>
          </div>
        </aside>

        <main class="content-wrapper">
          <article class="markdown-body">
            ${htmlContent}
          </article>
        </main>
      </div>

      <div class="settings-overlay ${state.isSettingsOpen ? 'visible' : ''}">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h3 class="text-sm font-bold" style="text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-tertiary);">Reading Settings</h3>
          <button id="close-settings"><i data-lucide="x" style="width: 16px; height: 16px;"></i></button>
        </div>
        
        <div class="form-group">
          <label class="form-label">Font Size</label>
          <input type="range" min="14" max="24" step="1" value="${state.readerSettings.fontSize}" class="input-field" id="setting-font-size">
          <div style="display: flex; justify-content: space-between; margin-top: 0.25rem;">
            <span class="text-xs text-tertiary">14px</span>
            <span class="text-xs text-tertiary">24px</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Width</label>
          <input type="range" min="500" max="1000" step="20" value="${state.readerSettings.maxWidth}" class="input-field" id="setting-width">
        </div>

        <div class="form-group">
          <label class="form-label">Line Height</label>
          <select class="input-field" id="setting-line-height">
            <option value="1.5" ${state.readerSettings.lineHeight == 1.5 ? 'selected' : ''}>Compact (1.5)</option>
            <option value="1.7" ${state.readerSettings.lineHeight == 1.7 ? 'selected' : ''}>Balanced (1.7)</option>
            <option value="2" ${state.readerSettings.lineHeight == 2 ? 'selected' : ''}>Spacious (2.0)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Typeface</label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
            <button class="btn btn-ghost ${state.readerSettings.fontFamily === 'Sans' ? 'active' : ''}" style="border: 1px solid var(--border-color);" id="set-font-sans">Sans</button>
            <button class="btn btn-ghost ${state.readerSettings.fontFamily === 'Monospace' ? 'active' : ''}" style="border: 1px solid var(--border-color);" id="set-font-mono">Mono</button>
          </div>
        </div>
      </div>
    </div>
  `;

  setupReaderListeners();
}

// --- Event Listeners ---

function setupHomeListeners() {
  const createBtnOne = document.getElementById('btn-create-one');
  const createBtnTwo = document.getElementById('btn-create-two');
  const fabBtn = document.getElementById('fab-create');
  if (createBtnOne) createBtnOne.onclick = showCreateModal;
  if (createBtnTwo) createBtnTwo.onclick = showCreateModal;
  if (fabBtn) fabBtn.onclick = showCreateModal;

  const themeToggle = document.getElementById('theme-toggle-home');
  if (themeToggle) themeToggle.onclick = toggleTheme;

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.oninput = (e) => {
      state.searchQuery = e.target.value;
      renderProjectList();
    };
  }
}

function setupReaderListeners() {
  document.getElementById('back-to-home').onclick = () => {
    state.view = 'home';
    render();
  };

  document.getElementById('theme-toggle').onclick = toggleTheme;
  
  document.getElementById('toggle-sidebar').onclick = () => {
    state.isSidebarOpen = !state.isSidebarOpen;
    render();
  };

  const toggleSettings = document.getElementById('toggle-settings');
  if (toggleSettings) toggleSettings.onclick = () => {
    state.isSettingsOpen = !state.isSettingsOpen;
    render();
  };

  const closeSettings = document.getElementById('close-settings');
  if (closeSettings) closeSettings.onclick = () => {
    state.isSettingsOpen = false;
    render();
  };

  // Reader Setting Listeners
  const fontSizeInput = document.getElementById('setting-font-size');
  if (fontSizeInput) fontSizeInput.oninput = (e) => updateReaderSettings('fontSize', parseInt(e.target.value));

  const widthInput = document.getElementById('setting-width');
  if (widthInput) widthInput.oninput = (e) => updateReaderSettings('maxWidth', parseInt(e.target.value));

  const lineHeightInput = document.getElementById('setting-line-height');
  if (lineHeightInput) lineHeightInput.onchange = (e) => updateReaderSettings('lineHeight', parseFloat(e.target.value));

  const setFontSans = document.getElementById('set-font-sans');
  if (setFontSans) setFontSans.onclick = () => updateReaderSettings('fontFamily', 'Sans');

  const setFontMono = document.getElementById('set-font-mono');
  if (setFontMono) setFontMono.onclick = () => updateReaderSettings('fontFamily', 'Monospace');

  // Scroll for TOC active state and progress
  const contentWrapper = document.querySelector('.content-wrapper');
  const progressBar = document.querySelector('.progress-bar');
  
  if (contentWrapper && progressBar) {
    contentWrapper.onscroll = () => {
      const winScroll = contentWrapper.scrollTop;
      const height = contentWrapper.scrollHeight - contentWrapper.clientHeight;
      const scrolled = (winScroll / height) * 100;
      progressBar.style.width = scrolled + "%";
    };
  }

  // Smooth scroll for TOC
  document.querySelectorAll('.toc-link').forEach(link => {
    link.onclick = (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').slice(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' });
        if (window.innerWidth < 768) {
          state.isSidebarOpen = false;
          render();
        }
      }
    };
  });

  // TOC highlighting (ScrollSpy)
  initScrollSpy();
}

function initScrollSpy() {
  const contentWrapper = document.querySelector('.content-wrapper');
  if (!contentWrapper) return;

  const headings = Array.from(document.querySelectorAll('.markdown-body h1, .markdown-body h2, .markdown-body h3'));
  const tocLinks = document.querySelectorAll('.toc-link');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        tocLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, {
    root: contentWrapper,
    rootMargin: '0px 0px -70% 0px',
    threshold: 0
  });

  headings.forEach(h => observer.observe(h));
}

function showCreateModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h2 class="text-xl font-bold">New Project</h2>
        <button id="close-modal"><i data-lucide="x" style="width: 20px; height: 20px;"></i></button>
      </div>

      <div class="form-group">
        <label class="form-label">Project Name</label>
        <input type="text" class="input-field" id="project-name" placeholder="e.g. Analysis of AI Ethics">
      </div>

      <div class="form-group">
        <label class="form-label">Markdown File</label>
        <div class="upload-zone" id="drop-zone">
          <i data-lucide="upload" style="width: 32px; height: 32px; color: var(--text-tertiary); margin-bottom: 1rem;"></i>
          <p class="text-sm text-secondary">Drag and drop your .md file here</p>
          <p class="text-xs text-tertiary" style="margin-top: 0.5rem;">or click to browse</p>
          <input type="file" id="file-input" accept=".md" style="display: none;">
        </div>
        <div id="file-info" class="text-xs font-medium" style="margin-top: 0.75rem; color: var(--text-secondary); display: none;"></div>
      </div>

      <button class="btn btn-primary" id="btn-save-project" style="width: 100%; justify-content: center; margin-top: 1rem;">
        Create Project
      </button>
    </div>
  `;

  document.body.appendChild(modal);
  createIcons({ icons: { X, Upload } });

  let fileContent = null;
  let fileSize = 0;

  const dropZone = modal.querySelector('#drop-zone');
  const fileInput = modal.querySelector('#file-input');
  const fileInfo = modal.querySelector('#file-info');
  const nameInput = modal.querySelector('#project-name');

  const handleFile = (file) => {
    if (file && file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        fileContent = e.target.result;
        fileSize = file.size;
        fileInfo.textContent = `Selected: ${file.name}`;
        fileInfo.style.display = 'block';
        if (!nameInput.value) {
          nameInput.value = file.name.replace('.md', '');
        }
      };
      reader.readAsText(file);
    }
  };

  dropZone.onclick = () => fileInput.click();
  fileInput.onchange = (e) => handleFile(e.target.files[0]);
  
  dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('dragover'); };
  dropZone.ondragleave = () => dropZone.classList.remove('dragover');
  dropZone.ondrop = (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
  };

  modal.querySelector('#close-modal').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  modal.querySelector('#btn-save-project').onclick = async () => {
    const name = nameInput.value.trim();
    if (!name || !fileContent) {
      alert('Please provide a name and upload a markdown file.');
      return;
    }
    await createProject(name, fileContent, fileSize);
    modal.remove();
  };
}

init();
