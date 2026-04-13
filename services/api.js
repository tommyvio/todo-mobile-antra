// services/api.js — all network calls in one place

const BASE_URL = 'http://0.0.0.0:3000';

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// Parses the response and throws a descriptive error for non-2xx status codes.
async function parseResponse(response) {
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text || `HTTP ${response.status}`);
  }
  if (!response.ok) {
    throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
  }
  return data;
}

// ------------------------------------------------------------------
// Auth
// ------------------------------------------------------------------

export async function signup(username, password) {
  const response = await fetch(`${BASE_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return parseResponse(response);
}

export async function login(username, password) {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return parseResponse(response);
}

// GET /me → { user: { userId, username, role } }
export async function getMe(token) {
  const response = await fetch(`${BASE_URL}/me`, {
    headers: authHeaders(token),
  });
  return parseResponse(response);
}

// ------------------------------------------------------------------
// Lists
// ------------------------------------------------------------------

// GET /lists → { lists: [...] }
export async function getLists(token) {
  const response = await fetch(`${BASE_URL}/lists`, {
    headers: authHeaders(token),
  });
  return parseResponse(response);
}

// POST /lists → { name }
export async function createList(token, name) {
  const response = await fetch(`${BASE_URL}/lists`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ name }),
  });
  return parseResponse(response);
}

// PATCH /lists/:id → { name }
export async function updateList(token, listId, name) {
  const response = await fetch(`${BASE_URL}/lists/${listId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ name }),
  });
  return parseResponse(response);
}

// DELETE /lists/:id
export async function deleteList(token, listId) {
  const response = await fetch(`${BASE_URL}/lists/${listId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return parseResponse(response);
}

// ------------------------------------------------------------------
// Todos
// ------------------------------------------------------------------

// GET /lists/:id/todos → { todos: [...] }
export async function getTodos(token, listId) {
  const response = await fetch(`${BASE_URL}/lists/${listId}/todos`, {
    headers: authHeaders(token),
  });
  return parseResponse(response);
}

// POST /lists/:id/todos → { task, dueDate? }
// dueDate is an optional ISO date string e.g. "2026-05-15"
export async function createTodo(token, listId, task, dueDate) {
  const response = await fetch(`${BASE_URL}/lists/${listId}/todos`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ task, dueDate: dueDate ?? null }),
  });
  return parseResponse(response);
}

// PATCH /lists/:id/todos/:todoId → { task?, completed?, dueDate? }
export async function updateTodo(token, listId, todoId, updates) {
  const response = await fetch(`${BASE_URL}/lists/${listId}/todos/${todoId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(updates),
  });
  return parseResponse(response);
}

// DELETE /lists/:id/todos/:todoId
export async function deleteTodo(token, listId, todoId) {
  const response = await fetch(`${BASE_URL}/lists/${listId}/todos/${todoId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return parseResponse(response);
}
