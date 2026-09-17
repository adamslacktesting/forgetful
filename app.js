// State Management
let todos = [];
let currentFilter = 'all';
let draggedId = null;
let dropTargetPosition = null;
let editingId = null;
let currentTheme = 'light';
let randomTaskIndex = Math.floor(Math.random() * 10);
let activeUndoToasts = [];

const funRandomTasks = [
  "High-five a potted plant 🪴",
  "Do a 5-second victory dance 💃",
  "Compliment yourself in the mirror 🪞",
  "Drink a big glass of water 💧",
  "Stare into space like a dramatic philosopher 🌌",
  "Attempt a flawless moonwalk across the room 🕺",
  "Tell a dad joke to nobody in particular 🧔",
  "Pet the nearest pet (or a squishy plushie) 🐱",
  "Inhale deeply & pretend you are a cloud ☁️",
  "Take a mini stretch break and wiggle your toes 🦶"
];

// DOM Elements
const appTitleEl = document.querySelector('.app-title');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeToggleIcon = document.getElementById('theme-toggle-icon');
const themeToggleText = document.getElementById('theme-toggle-text');
const shortcutsInfoBtn = document.getElementById('shortcuts-info-btn');
const shortcutsModal = document.getElementById('shortcuts-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const randomTaskBtn = document.getElementById('random-task-btn');
const todoList = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');
const filterBtns = document.querySelectorAll('.btn-filter');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const startFreshBtn = document.getElementById('start-fresh-btn');
const countAllEl = document.getElementById('count-all');
const countActiveEl = document.getElementById('count-active');
const countCompletedEl = document.getElementById('count-completed');
const confettiCanvas = document.getElementById('confetti-canvas');
const toastContainer = document.getElementById('toast-container');

// Initialize State
function init() {
  initTheme();
  loadTodos();
  setupCanvas();
  bindEvents();
  render();
  focusTodoInput();
}

function focusTodoInput() {
  if (todoInput) {
    todoInput.focus();
  }
}

// Theme Management
function initTheme() {
  try {
    const savedTheme = localStorage.getItem('forgetful_theme');
    if (savedTheme) {
      currentTheme = savedTheme;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      currentTheme = 'dark';
    } else {
      currentTheme = 'light';
    }
  } catch (e) {
    console.error('Failed to access localStorage for theme', e);
    currentTheme = 'light';
  }
  applyTheme(currentTheme);
}

function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);

  if (themeToggleIcon && themeToggleText) {
    if (theme === 'dark') {
      themeToggleIcon.textContent = '☀️';
      themeToggleText.textContent = 'Light Mode';
    } else {
      themeToggleIcon.textContent = '🌙';
      themeToggleText.textContent = 'Dark Mode';
    }
  }

  try {
    localStorage.setItem('forgetful_theme', theme);
  } catch (e) {
    console.error('Failed to save theme to localStorage', e);
  }
}

function toggleTheme() {
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
}

// Save todos to localStorage
function saveTodos() {
  try {
    localStorage.setItem('forgetful_todos', JSON.stringify(todos));
  } catch (e) {
    console.error('Failed to save todos to localStorage', e);
  }
}

// Load todos from localStorage
function loadTodos() {
  try {
    const saved = localStorage.getItem('forgetful_todos');
    if (saved) {
      todos = JSON.parse(saved);
    } else {
      // Default initial todos for first-time visitors
      todos = [
        { id: '1', text: 'Buy groceries before the fridge gets lonely 🥦', completed: false, createdAt: Date.now() },
        { id: '2', text: 'Water the plants! 🪴', completed: true, createdAt: Date.now() - 1000 }
      ];
      saveTodos();
    }
  } catch (e) {
    console.error('Failed to load todos from localStorage', e);
    todos = [];
  }
}

// Event Bindings
function bindEvents() {
  // App title color cycle click
  if (appTitleEl) {
    const titleColors = [
      'var(--primary-color)',
      '#8338EC', // Purple
      '#38BDF8', // Sky Blue
      '#06D6A0', // Mint Green
      '#FFD166', // Yellow
      '#FF9F1C', // Orange
      '#F72585'  // Neon Pink
    ];
    let currentColorIndex = 0;

    appTitleEl.addEventListener('click', () => {
      currentColorIndex = (currentColorIndex + 1) % titleColors.length;
      appTitleEl.style.color = titleColors[currentColorIndex];
    });
  }

  // Theme toggle button click
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      toggleTheme();
    });
  }

  // Add Todo Form Submit
  todoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = todoInput.value.trim();
    if (!text) return;

    addTodo(text);
    todoInput.value = '';
    todoInput.focus();
  });

  // Random Sparkle Task Button
  if (randomTaskBtn) {
    randomTaskBtn.addEventListener('click', () => {
      addRandomTask();
    });
  }

  // Todo List Click (Toggle / Delete / Edit)
  todoList.addEventListener('click', (e) => {
    const item = e.target.closest('.todo-item');
    if (!item) return;

    const id = item.dataset.id;

    if (e.target.closest('.btn-delete')) {
      deleteTodo(id);
    } else if (e.target.closest('.btn-edit')) {
      e.stopPropagation();
      startEditing(id);
    } else if (e.target.closest('.todo-edit-input')) {
      return;
    } else if (e.target.closest('.checkbox-custom')) {
      toggleTodo(id);
    } else if (e.target.closest('.todo-content')) {
      if (editingId === id) return;
      toggleTodo(id);
    }
  });

  // Keyboard support for custom checkboxes
  todoList.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      const checkbox = e.target.closest('.checkbox-custom');
      if (checkbox) {
        e.preventDefault();
        const item = checkbox.closest('.todo-item');
        if (item) {
          toggleTodo(item.dataset.id);
        }
      }
    }
  });

  // Filter Buttons Click
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  // Clear Completed Click
  clearCompletedBtn.addEventListener('click', () => {
    clearCompleted();
  });

  // Start Fresh Click
  if (startFreshBtn) {
    startFreshBtn.addEventListener('click', () => {
      startFresh();
    });
  }

  // Shortcuts Modal Controls
  if (shortcutsInfoBtn) {
    shortcutsInfoBtn.addEventListener('click', () => {
      toggleShortcutsModal(true);
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      toggleShortcutsModal(false);
    });
  }

  if (shortcutsModal) {
    shortcutsModal.addEventListener('click', (e) => {
      if (e.target === shortcutsModal) {
        toggleShortcutsModal(false);
      }
    });
  }

  // Global Keyboard Shortcuts
  document.addEventListener('keydown', handleGlobalShortcuts);

  // Drag and Drop Events
  bindDragAndDropEvents();
}

function toggleShortcutsModal(show) {
  if (!shortcutsModal) return;
  const isCurrentlyHidden = shortcutsModal.classList.contains('hidden');
  const shouldShow = show !== undefined ? show : isCurrentlyHidden;

  if (shouldShow) {
    shortcutsModal.classList.remove('hidden');
  } else {
    shortcutsModal.classList.add('hidden');
  }
}

function setFilter(filter) {
  currentFilter = filter;
  filterBtns.forEach(btn => {
    if (btn.dataset.filter === filter) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  render();
}

function handleGlobalShortcuts(e) {
  const isModalOpen = shortcutsModal && !shortcutsModal.classList.contains('hidden');

  if (e.key === 'Escape') {
    if (isModalOpen) {
      toggleShortcutsModal(false);
      return;
    }
    if (editingId !== null) {
      cancelEditing();
      return;
    }
    if (document.activeElement) {
      document.activeElement.blur();
    }
    return;
  }

  // Don't intercept shortcuts if user is typing in an input field or modal is open
  const activeElement = document.activeElement;
  const isInputActive = activeElement && (
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.isContentEditable
  );

  if (isInputActive || isModalOpen) {
    return;
  }

  if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
    if (activeUndoToasts.length > 0) {
      e.preventDefault();
      const toastToUndo = activeUndoToasts.pop();
      if (toastToUndo && typeof toastToUndo.undo === 'function') {
        toastToUndo.undo();
      }
      return;
    }
  }

  if (e.key === 'n' || e.key === 'N' || e.key === '/') {
    e.preventDefault();
    focusTodoInput();
  } else if (e.key === '1') {
    e.preventDefault();
    setFilter('all');
  } else if (e.key === '2') {
    e.preventDefault();
    setFilter('active');
  } else if (e.key === '3') {
    e.preventDefault();
    setFilter('completed');
  } else if (e.key === 't' || e.key === 'T') {
    e.preventDefault();
    toggleTheme();
  } else if (e.key === '?' || e.key === 'h' || e.key === 'H') {
    e.preventDefault();
    toggleShortcutsModal();
  }
}

function bindDragAndDropEvents() {
  todoList.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.todo-item');
    if (!item) return;

    draggedId = item.dataset.id;
    item.classList.add('dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', draggedId);
    }
  });

  todoList.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }

    const item = e.target.closest('.todo-item');

    const items = todoList.querySelectorAll('.todo-item');
    items.forEach(el => {
      if (el !== item) {
        el.classList.remove('drag-over-above', 'drag-over-below');
      }
    });

    if (!item || item.dataset.id === draggedId) return;

    const rect = item.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;

    if (e.clientY < midpoint) {
      item.classList.remove('drag-over-below');
      item.classList.add('drag-over-above');
      dropTargetPosition = 'above';
    } else {
      item.classList.remove('drag-over-above');
      item.classList.add('drag-over-below');
      dropTargetPosition = 'below';
    }
  });

  todoList.addEventListener('drop', (e) => {
    e.preventDefault();
    const item = e.target.closest('.todo-item');
    clearDragHighlights();

    if (!item || !draggedId || item.dataset.id === draggedId) return;

    const targetId = item.dataset.id;
    reorderTodos(draggedId, targetId, dropTargetPosition);
    draggedId = null;
    dropTargetPosition = null;
  });

  todoList.addEventListener('dragend', () => {
    clearDragHighlights();
    draggedId = null;
    dropTargetPosition = null;
  });
}

function clearDragHighlights() {
  const items = todoList.querySelectorAll('.todo-item');
  items.forEach(el => {
    el.classList.remove('dragging', 'drag-over-above', 'drag-over-below');
  });
}

function reorderTodos(draggedId, targetId, position) {
  const draggedIndex = todos.findIndex(t => t.id === draggedId);
  if (draggedIndex === -1) return;

  const [draggedItem] = todos.splice(draggedIndex, 1);

  const targetIndex = todos.findIndex(t => t.id === targetId);
  if (targetIndex === -1) {
    todos.push(draggedItem);
  } else {
    const insertIndex = position === 'below' ? targetIndex + 1 : targetIndex;
    todos.splice(insertIndex, 0, draggedItem);
  }

  saveTodos();
  render();
}

// Add Fun Random Task
function addRandomTask() {
  const taskText = funRandomTasks[randomTaskIndex];
  randomTaskIndex = (randomTaskIndex + 1) % funRandomTasks.length;
  addTodo(taskText);
}

// Add Todo
function addTodo(text) {
  const newTodo = {
    id: Date.now().toString(),
    text,
    completed: false,
    createdAt: Date.now()
  };

  todos.unshift(newTodo);
  saveTodos();
  render();
}

// Celebration Badges Text options
const celebrationPhrases = [
  "WOOHOO! 🎉",
  "AWESOME! ✨",
  "NAILED IT! 💥",
  "BOOM! 🚀",
  "GREAT JOB! ⭐",
  "CRUSHED IT! 💪",
  "VICTORY! 🏆",
  "TA-DA! 🎩"
];

// Toggle Todo State
function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;

  const newlyCompleted = !todo.completed;
  todo.completed = newlyCompleted;
  saveTodos();
  render();

  if (newlyCompleted) {
    const itemEl = todoList.querySelector(`.todo-item[data-id="${id}"]`);
    if (itemEl) {
      itemEl.classList.remove('celebrate');
      // Trigger reflow for animation reset if re-triggered
      void itemEl.offsetWidth;
      itemEl.classList.add('celebrate');

      // Spawn floating celebration badge above item
      spawnCelebrationBadge(itemEl);
    }
    triggerConfetti(itemEl);
  }
}

function spawnCelebrationBadge(targetEl) {
  const rect = targetEl.getBoundingClientRect();
  const badge = document.createElement('div');
  badge.className = 'celebration-badge';
  badge.textContent = celebrationPhrases[Math.floor(Math.random() * celebrationPhrases.length)];

  // Center horizontally over item, position vertically slightly above
  badge.style.left = `${rect.left + rect.width / 2}px`;
  badge.style.top = `${rect.top}px`;

  document.body.appendChild(badge);

  setTimeout(() => {
    if (badge.parentNode) {
      badge.parentNode.removeChild(badge);
    }
  }, 750);
}

// Delete Todo
function deleteTodo(id) {
  if (editingId === id) {
    editingId = null;
  }
  const index = todos.findIndex(t => t.id === id);
  if (index === -1) return;

  const [deletedTodo] = todos.splice(index, 1);
  saveTodos();
  render();

  showUndoToast(deletedTodo, index);
}

// Show Toast Notification with Undo option
function showUndoToast(deletedTodo, originalIndex) {
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = 'toast';

  const content = document.createElement('div');
  content.className = 'toast-content';

  const icon = document.createElement('span');
  icon.textContent = '🗑️';

  const message = document.createElement('span');
  message.className = 'toast-message';
  message.textContent = `Deleted "${deletedTodo.text}"`;

  content.appendChild(icon);
  content.appendChild(message);

  const actions = document.createElement('div');
  actions.className = 'toast-actions';

  let remainingSeconds = 5;
  const timerBadge = document.createElement('span');
  timerBadge.className = 'toast-timer';
  timerBadge.setAttribute('aria-live', 'polite');
  timerBadge.textContent = `⏱️ ${remainingSeconds}s`;

  const undoBtn = document.createElement('button');
  undoBtn.className = 'btn-undo';
  undoBtn.innerHTML = '<span>Undo</span> <span>↩️</span>';
  undoBtn.setAttribute('aria-label', `Undo deletion of ${deletedTodo.text}`);

  actions.appendChild(timerBadge);
  actions.appendChild(undoBtn);

  const progressBar = document.createElement('div');
  progressBar.className = 'toast-progress-bar';

  let isDismissed = false;

  const cleanup = () => {
    if (timer) clearTimeout(timer);
    if (countdownInterval) clearInterval(countdownInterval);
  };

  const removeFromActiveToasts = () => {
    activeUndoToasts = activeUndoToasts.filter(t => t.toastElement !== toast);
  };

  const dismissToast = () => {
    if (isDismissed) return;
    isDismissed = true;
    cleanup();
    removeFromActiveToasts();
    toast.classList.add('toast-hiding');
    toast.addEventListener('animationend', () => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });
  };

  const timer = setTimeout(() => {
    dismissToast();
  }, 5000);

  const countdownInterval = setInterval(() => {
    remainingSeconds -= 1;
    if (remainingSeconds >= 0) {
      timerBadge.textContent = `⏱️ ${remainingSeconds}s`;
    }
  }, 1000);

  const performUndo = () => {
    cleanup();
    if (!isDismissed) {
      isDismissed = true;
      removeFromActiveToasts();
      // Restore task at its original position or closest valid index
      const targetIndex = Math.min(originalIndex, todos.length);
      todos.splice(targetIndex, 0, deletedTodo);
      saveTodos();
      render();

      toast.classList.add('toast-hiding');
      toast.addEventListener('animationend', () => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      });
    }
  };

  undoBtn.addEventListener('click', () => {
    performUndo();
  });

  activeUndoToasts.push({
    toastElement: toast,
    undo: performUndo
  });

  toast.appendChild(content);
  toast.appendChild(actions);
  toast.appendChild(progressBar);

  toastContainer.appendChild(toast);
}

// Edit Todo Handlers
function startEditing(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo || todo.completed) return;
  editingId = id;
  render();
}

function finishEditing(id, newText) {
  if (editingId !== id) return;
  editingId = null;

  const trimmed = newText.trim();
  if (trimmed) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
      todo.text = trimmed;
      saveTodos();
    }
  }
  render();
}

function cancelEditing() {
  if (editingId === null) return;
  editingId = null;
  render();
}

// Clear Completed Todos
function clearCompleted() {
  todos = todos.filter(t => !t.completed);
  saveTodos();
  render();
}

// Start Fresh (Delete all tasks)
function startFresh() {
  if (todos.length === 0) return;
  const confirmed = confirm("Are you sure you want to delete all tasks and start fresh?");
  if (confirmed) {
    todos = [];
    saveTodos();
    render();
  }
}

// Render Todos and UI components
function render() {
  // Filter logic
  const filteredTodos = todos.filter(todo => {
    if (currentFilter === 'active') return !todo.completed;
    if (currentFilter === 'completed') return todo.completed;
    return true;
  });

  // Render items
  todoList.innerHTML = '';

  if (filteredTodos.length === 0) {
    emptyState.style.display = 'flex';
  } else {
    emptyState.style.display = 'none';
    filteredTodos.forEach(todo => {
      const li = createTodoElement(todo);
      todoList.appendChild(li);
    });
  }

  // Update counts
  const totalCount = todos.length;
  const activeCount = todos.filter(t => !t.completed).length;
  const completedCount = todos.filter(t => t.completed).length;

  countAllEl.textContent = totalCount;
  countActiveEl.textContent = activeCount;
  countCompletedEl.textContent = completedCount;

  // Clear completed button state
  if (completedCount > 0 && currentFilter !== 'active') {
    clearCompletedBtn.classList.remove('hidden');
  } else {
    clearCompletedBtn.classList.add('hidden');
  }

  // Start Fresh button state
  if (startFreshBtn) {
    if (totalCount > 0) {
      startFreshBtn.classList.remove('hidden');
    } else {
      startFreshBtn.classList.add('hidden');
    }
  }
}

// Create Todo DOM element
function createTodoElement(todo) {
  const isEditing = editingId === todo.id && !todo.completed;

  const li = document.createElement('li');
  li.className = `todo-item ${todo.completed ? 'completed' : ''} ${isEditing ? 'editing' : ''}`;
  li.dataset.id = todo.id;
  li.draggable = !isEditing;

  const dragHandle = document.createElement('div');
  dragHandle.className = 'drag-handle';
  dragHandle.innerHTML = '⋮⋮';
  dragHandle.setAttribute('title', 'Drag to reorder');
  dragHandle.setAttribute('aria-label', 'Drag handle');

  const contentDiv = document.createElement('div');
  contentDiv.className = 'todo-content';

  const checkbox = document.createElement('div');
  checkbox.className = 'checkbox-custom';
  checkbox.role = 'checkbox';
  checkbox.ariaChecked = todo.completed;
  checkbox.innerHTML = todo.completed ? '✓' : '';
  checkbox.setAttribute('tabindex', '0');

  contentDiv.appendChild(checkbox);

  if (isEditing) {
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'todo-edit-input';
    editInput.value = todo.text;
    editInput.setAttribute('aria-label', 'Edit task text');

    let isFinished = false;

    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        isFinished = true;
        finishEditing(todo.id, editInput.value);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        isFinished = true;
        cancelEditing();
      }
    });

    editInput.addEventListener('blur', () => {
      if (!isFinished) {
        finishEditing(todo.id, editInput.value);
      }
    });

    contentDiv.appendChild(editInput);

    setTimeout(() => {
      editInput.focus();
      editInput.select();
    }, 0);
  } else {
    const span = document.createElement('span');
    span.className = 'todo-text';
    span.textContent = todo.text;
    contentDiv.appendChild(span);

    if (!todo.completed) {
      const editBtn = document.createElement('button');
      editBtn.className = 'btn-edit';
      editBtn.setAttribute('aria-label', 'Edit task');
      editBtn.setAttribute('title', 'Edit task');
      editBtn.innerHTML = '✏️';
      contentDiv.appendChild(editBtn);
    }
  }

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-delete';
  deleteBtn.setAttribute('aria-label', 'Delete task');
  deleteBtn.innerHTML = '🗑️';

  li.appendChild(dragHandle);
  li.appendChild(contentDiv);
  li.appendChild(deleteBtn);

  return li;
}

// Canvas & Confetti setup placeholder
function setupCanvas() {
  if (!confettiCanvas) return;
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  window.addEventListener('resize', () => {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  });
}

let confettiParticles = [];
let confettiAnimationId = null;

function triggerConfetti(targetEl) {
  if (!confettiCanvas) return;

  const colors = ['#FF5964', '#FFD166', '#06D6A0', '#118AB2', '#8338EC', '#FF9F1C', '#F72585'];
  const shapes = ['circle', 'rect', 'star', 'ribbon'];

  // Determine origins: primary origin around targetEl or screen top-middle
  let origins = [];
  if (targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const itemX = rect.left + rect.width / 2;
    const itemY = rect.top + rect.height / 2;
    origins.push({ x: itemX, y: itemY, count: 45, speedScale: 1.2 });
    origins.push({ x: Math.max(20, itemX - 180), y: Math.min(window.innerHeight, itemY + 40), count: 20, speedScale: 1.0 });
    origins.push({ x: Math.min(window.innerWidth - 20, itemX + 180), y: Math.min(window.innerHeight, itemY + 40), count: 20, speedScale: 1.0 });
  } else {
    origins.push({ x: window.innerWidth / 2, y: window.innerHeight / 3, count: 70, speedScale: 1.0 });
  }

  origins.forEach(orig => {
    for (let i = 0; i < orig.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 12 + 6) * orig.speedScale;
      confettiParticles.push({
        x: orig.x,
        y: orig.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (Math.random() * 4 + 2),
        gravity: 0.38,
        drag: 0.96,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        size: Math.random() * 8 + 6,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.3,
        alpha: 1,
        decay: Math.random() * 0.015 + 0.018
      });
    }
  });

  if (!confettiAnimationId) {
    animateConfetti();
  }
}

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
  let rot = (Math.PI / 2) * 3;
  let step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    let x = cx + Math.cos(rot) * outerRadius;
    let y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

function animateConfetti() {
  if (!confettiCanvas) return;
  const ctx = confettiCanvas.getContext('2d');

  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  confettiParticles.forEach(p => {
    p.vx *= p.drag;
    p.vy = p.vy * p.drag + p.gravity;
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.vRot;
    p.alpha -= p.decay;
  });

  // Filter alive particles
  confettiParticles = confettiParticles.filter(p => p.alpha > 0);

  confettiParticles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    if (p.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'rect') {
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
    } else if (p.shape === 'ribbon') {
      ctx.fillRect(-p.size / 4, -p.size, p.size / 2, p.size * 1.8);
    } else if (p.shape === 'star') {
      drawStar(ctx, 0, 0, 5, p.size, p.size / 2);
    }

    ctx.restore();
  });

  if (confettiParticles.length > 0) {
    confettiAnimationId = requestAnimationFrame(animateConfetti);
  } else {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiAnimationId = null;
  }
}

// Initial Call
init();
