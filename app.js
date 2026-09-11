// State Management
let todos = [];
let currentFilter = 'all';
let draggedId = null;
let dropTargetPosition = null;
let editingId = null;

// DOM Elements
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoList = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');
const filterBtns = document.querySelectorAll('.btn-filter');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const countAllEl = document.getElementById('count-all');
const countActiveEl = document.getElementById('count-active');
const countCompletedEl = document.getElementById('count-completed');
const confettiCanvas = document.getElementById('confetti-canvas');

// Initialize State
function init() {
  loadTodos();
  setupCanvas();
  bindEvents();
  render();
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
  // Add Todo Form Submit
  todoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = todoInput.value.trim();
    if (!text) return;

    addTodo(text);
    todoInput.value = '';
    todoInput.focus();
  });

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

  // Drag and Drop Events
  bindDragAndDropEvents();
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

// Toggle Todo State
function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;

  todo.completed = !todo.completed;
  saveTodos();
  render();

  if (todo.completed) {
    triggerConfetti();
  }
}

// Delete Todo
function deleteTodo(id) {
  if (editingId === id) {
    editingId = null;
  }
  todos = todos.filter(t => t.id !== id);
  saveTodos();
  render();
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

function triggerConfetti() {
  // Simple playful confetti burst on task completion
  if (!confettiCanvas) return;
  const ctx = confettiCanvas.getContext('2d');
  const particles = [];
  const colors = ['#FF5964', '#FFD166', '#06D6A0', '#118AB2', '#8338EC'];

  for (let i = 0; i < 40; i++) {
    particles.push({
      x: window.innerWidth / 2,
      y: window.innerHeight / 3,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.7) * 12,
      color: colors[Math.floor(Math.random() * colors.length)],
      radius: Math.random() * 6 + 4,
      alpha: 1
    });
  }

  function animate() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let alive = false;

    particles.forEach(p => {
      if (p.alpha > 0) {
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3; // gravity
        p.alpha -= 0.02;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });

    if (alive) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  animate();
}

// Initial Call
init();
