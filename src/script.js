/**
 * Task Manager Application
 * A to-do list application with CRUD functionality and local storage persistence
 */

// DOM Elements
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskList = document.getElementById('task-list');
const taskCounter = document.getElementById('task-counter');
const clearCompletedBtn = document.getElementById('clear-completed');
const clearAllBtn = document.getElementById('clear-all');
const emptyListMessage = document.getElementById('empty-list-message');
const filterButtons = document.querySelectorAll('[data-filter]');
const exportBtn = document.getElementById('export-tasks');

// Application State
let tasks = [];
let currentFilter = 'all';
let recentlyDeletedTask = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    renderTasks();
    setupEventListeners();
    loadDarkModePreference();
});

/**
 * Set up all event listeners for the application
 */
function setupEventListeners() {
    // Add new task
    taskForm.addEventListener('submit', addTask);

    // Clear tasks
    clearCompletedBtn.addEventListener('click', clearCompleted);
    clearAllBtn.addEventListener('click', clearAll);

    // Export tasks
    if (exportBtn) {
        exportBtn.addEventListener('click', exportTasks);
    }

    // Filter tasks
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active button UI
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Apply filter
            currentFilter = button.getAttribute('data-filter');
            renderTasks();
        });
    });

    // Dark mode toggle
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }
}

/**
 * Add a new task to the task list
 * @param {Event} e - The submit event
 */
function addTask(e) {
    e.preventDefault();

    const taskText = taskInput.value.trim();
    if (taskText === '') return;

    if (tasks.some(task => task.text.toLowerCase() === taskText.toLowerCase())) {
        showNotification('Task already exists!');
        return;
    }

    // Create new task object
    const newTask = {
        id: generateId(),
        text: taskText,
        completed: false,
        createdAt: new Date().toISOString()
    };

    // Add to tasks array
    tasks.unshift(newTask); // Add to beginning for better UX

    // Clear input field
    taskInput.value = '';
    taskInput.focus();

    // Update UI
    saveTasks();
    renderTasks();

    // Show feedback
    showNotification('Task added successfully!');
}

/**
 * Toggle the completed status of a task
 * @param {string} id - The task ID
 */
function toggleTaskStatus(id) {
    tasks = tasks.map(task => {
        if (task.id === id) {
            return { ...task, completed: !task.completed };
        }
        return task;
    });

    saveTasks();
    renderTasks();
}

/**
 * Edit a task's text
 * @param {string} id - The task ID
 */
function editTask(id) {
    const task = tasks.find(task => task.id === id);
    if (!task) return;

    const newText = prompt('Edit task:', task.text);
    if (newText === null || newText.trim() === '') return;

    tasks = tasks.map(task => {
        if (task.id === id) {
            return { ...task, text: newText.trim() };
        }
        return task;
    });

    saveTasks();
    renderTasks();
    showNotification('Task updated!');
}

/**
 * Delete a task from the list
 * @param {string} id - The task ID
 */
function deleteTask(id) {
    const task = tasks.find(task => task.id === id);
    if (!task) return;

    if (!confirm('Are you sure you want to delete this task?')) return;

    recentlyDeletedTask = task;
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
    renderTasks();
    showNotification(`Task deleted! <button class="btn btn-link p-0" onclick="undoDelete()">Undo</button>`);
}

/**
 * Undo the last deleted task
 */
function undoDelete() {
    if (recentlyDeletedTask) {
        tasks.unshift(recentlyDeletedTask);
        recentlyDeletedTask = null;
        saveTasks();
        renderTasks();
        showNotification('Task restored!');
    }
}

/**
 * Clear all completed tasks
 */
function clearCompleted() {
    const completedCount = tasks.filter(task => task.completed).length;
    if (completedCount === 0) {
        showNotification('No completed tasks to clear!');
        return;
    }

    if (!confirm(`Are you sure you want to clear all ${completedCount} completed tasks?`)) return;

    tasks = tasks.filter(task => !task.completed);
    saveTasks();
    renderTasks();
    showNotification('Completed tasks cleared!');
}

/**
 * Clear all tasks
 */
function clearAll() {
    if (tasks.length === 0) {
        showNotification('No tasks to clear!');
        return;
    }

    if (!confirm('Are you sure you want to clear ALL tasks?')) return;

    tasks = [];
    saveTasks();
    renderTasks();
    showNotification('All tasks cleared!');
}

/**
 * Render the tasks to the DOM based on the current filter
 */
function renderTasks() {
    const filteredTasks = getFilteredTasks();
    updateTaskCounter(filteredTasks);
    renderTaskList(filteredTasks);
}

function getFilteredTasks() {
    if (currentFilter === 'active') return tasks.filter(task => !task.completed);
    if (currentFilter === 'completed') return tasks.filter(task => task.completed);
    return tasks;
}

function updateTaskCounter(filteredTasks) {
    taskCounter.textContent = filteredTasks.length;
}

function renderTaskList(filteredTasks) {
    taskList.innerHTML = ''; // Clear existing tasks
    filteredTasks.forEach(task => renderTask(task));
}

function renderTask(task) {
    const listItem = document.createElement('li');
    listItem.className = `list-group-item task-item ${task.completed ? 'task-complete' : ''}`;
    listItem.dataset.id = task.id;

    listItem.innerHTML = `
        <input type="checkbox" class="form-check-input task-checkbox" ${task.completed ? 'checked' : ''} aria-label="Mark task as ${task.completed ? 'incomplete' : 'complete'}">
        <span class="task-text" tabindex="0">${escapeHtml(task.text)}</span>
        <div class="task-actions">
            <button class="btn btn-sm btn-outline-primary edit-task" aria-label="Edit task">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger delete-task" aria-label="Delete task">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;

    taskList.appendChild(listItem);

    const checkbox = listItem.querySelector('.task-checkbox');
    const editBtn = listItem.querySelector('.edit-task');
    const deleteBtn = listItem.querySelector('.delete-task');

    checkbox.addEventListener('change', () => toggleTaskStatus(task.id));
    editBtn.addEventListener('click', () => editTask(task.id));
    deleteBtn.addEventListener('click', () => deleteTask(task.id));
}

/**
 * Save tasks to localStorage
 */
function saveTasks() {
    try {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    } catch (error) {
        console.error('Failed to save tasks:', error);
        showNotification('Error saving tasks!');
    }
}

/**
 * Load tasks from localStorage
 */
function loadTasks() {
    try {
        const savedTasks = localStorage.getItem('tasks');
        tasks = savedTasks ? JSON.parse(savedTasks) : [];
    } catch (error) {
        console.error('Failed to load tasks:', error);
        tasks = [];
        showNotification('Error loading tasks!');
    }
}

/**
 * Generate a unique ID for a new task
 * @returns {string} A unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Show a notification toast message
 * @param {string} message - The message to display
 */
function showNotification(message) {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }

    const toastElement = document.createElement('div');
    toastElement.className = 'toast';
    toastElement.setAttribute('role', 'alert');
    toastElement.setAttribute('aria-live', 'assertive');
    toastElement.setAttribute('aria-atomic', 'true');

    toastElement.innerHTML = `
        <div class="toast-header">
            <strong class="me-auto">Task Manager</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;

    toastContainer.appendChild(toastElement);

    const bsToast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 3000
    });
    bsToast.show();

    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

/**
 * Export tasks to a file (JSON or CSV)
 */
function exportTasks() {
    if (tasks.length === 0) {
        showNotification('No tasks to export!');
        return;
    }

    const format = window.confirm('Click OK to export as JSON, Cancel to export as CSV') ? 'json' : 'csv';

    let dataStr = '';
    let filename = `tasks_${new Date().toISOString().slice(0, 10)}`;

    if (format === 'json') {
        dataStr = JSON.stringify(tasks, null, 2);
        filename += '.json';
        downloadFile(dataStr, filename, 'application/json');
        showNotification('Tasks exported as JSON!');
    } else {
        dataStr = 'id,text,completed,createdAt\n';
        tasks.forEach(task => {
            const escapedText = `"${task.text.replace(/"/g, '""')}"`;
            dataStr += `${task.id},${escapedText},${task.completed},${task.createdAt}\n`;
        });
        filename += '.csv';
        downloadFile(dataStr, filename, 'text/csv');
        showNotification('Tasks exported as CSV!');
    }
}

/**
 * Helper function to create a download from a string
 */
function downloadFile(data, filename, type) {
    const blob = new Blob([data], { type });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(url);
    a.remove();
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} unsafe - Unsafe string that might contain HTML
 * @returns {string} Escaped string
 */
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Toggle dark mode
 */
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
}

/**
 * Load dark mode preference on startup
 */
function loadDarkModePreference() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }
}