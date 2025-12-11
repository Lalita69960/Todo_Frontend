// src/services/taskService.js
const API_URL = 'http://localhost:9090/api';

import { authService } from './authService';

function authHeaders() {
    const token = authService.getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

/** build FormData where RequestPart("todo") is a JSON blob */
function buildTodoFormData(todoObj, files = []) {
    const fd = new FormData();
    const todoJson = JSON.stringify({
        id: todoObj.id ?? null,
        title: todoObj.title ?? '',
        description: todoObj.description ?? '',
        completed: !!todoObj.completed,
        dueDate: todoObj.dueDate ?? null,
        personId: todoObj.personId ?? todoObj.assignedTo ?? null,
        numberOfAttachments: todoObj.numberOfAttachments ?? (files ? files.length : 0)
    });
    const blob = new Blob([todoJson], { type: 'application/json' });
    fd.append('todo', blob);

    if (files && files.length) {
        // Append multiple files under the field name 'files'.
        // If your backend expects a different field name, change 'files' below.
        Array.from(files).forEach((f) => fd.append('files', f));
    }
    return fd;
}

export const taskService = {
    getAll: async () => {
        const res = await fetch(`${API_URL}/todo`, {
            method: 'GET',
            headers: authHeaders()
        });
        if (!res.ok) {
            const txt = await res.text().catch(() => '');
            throw new Error(txt || 'Failed to fetch todos');
        }
        return res.json();
    },

    // new: get persons from backend
    getPersons: async () => {
        const res = await fetch(`${API_URL}/person`, {
            method: 'GET',
            headers: authHeaders()
        });
        if (!res.ok) {
            const txt = await res.text().catch(() => '');
            throw new Error(txt || 'Failed to fetch persons');
        }
        return res.json();
    },

    create: async (todoObj, files = []) => {
        const fd = buildTodoFormData(todoObj, files);
        const res = await fetch(`${API_URL}/todo`, {
            method: 'POST',
            headers: authHeaders(), // don't set content-type; browser will set boundary
            body: fd
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'Failed to create todo');
        }
        return res.json();
    },

    update: async (id, todoObj, files = []) => {
        const fd = buildTodoFormData(todoObj, files);
        const res = await fetch(`${API_URL}/todo/${id}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: fd
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'Failed to update todo');
        }
        return res.json();
    },

    delete: async (id) => {
        const res = await fetch(`${API_URL}/todo/${id}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        if (!res.ok) {
            const txt = await res.text().catch(() => '');
            throw new Error(txt || 'Failed to delete todo');
        }
        return true;
    }
};
