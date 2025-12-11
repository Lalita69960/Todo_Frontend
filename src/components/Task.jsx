// src/components/Task.jsx
import React, { useEffect, useRef, useState } from 'react';
import './Task.css';
import Sidebar from './Sidebar';
import Header from './Header.jsx';
import { taskService } from '../services/taskService';

const emptyForm = {
    id: null,
    title: '',
    description: '',
    dueDate: '',
    personId: '',
    completed: false
};

const Task = () => {
    const [tasks, setTasks] = useState([]);
    const [persons, setPersons] = useState([]);
    const [form, setForm] = useState({ ...emptyForm });
    const [files, setFiles] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('all'); // all | completed | pending | unassigned
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [sortOrder, setSortOrder] = useState('ascending'); // ascending | descending
    const fileRef = useRef(null);

    useEffect(() => {
        loadPersons();
        loadTasks();
        // eslint-disable-next-line
    }, []);

    const parseDateSafe = (d) => {
        if (!d) return null;
        const dt = new Date(d);
        if (isNaN(dt)) return null;
        return dt;
    };

    const compareDueDateAsc = (a, b) => {
        const da = parseDateSafe(a.dueDate);
        const db = parseDateSafe(b.dueDate);
        if (da === null && db === null) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
    };

    const loadPersons = async () => {
        try {
            const data = await taskService.getPersons();
            setPersons(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load persons:', err);
        }
    };

    const loadTasks = async () => {
        setLoading(true);
        try {
            const data = await taskService.getAll();
            const list = Array.isArray(data) ? data : [];
            list.sort(compareDueDateAsc);
            setTasks(list);
        } catch (err) {
            console.error('Failed to load tasks:', err);
            alert('Failed to load tasks: ' + (err.message || ''));
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        if (!form.title || form.title.trim().length < 2) { alert('Title is required (min 2 chars)'); return false; }
        if (!form.description || form.description.trim().length === 0) { alert('Description is required'); return false; }
        if (!form.dueDate) { alert('Due date is required'); return false; }
        if (form.completed === null || form.completed === undefined) { alert('Completed status is required'); return false; }
        return true;
    };

    const onFileChange = (e) => {
        setFiles(Array.from(e.target.files));
    };

    const toNullableNumber = (val) => {
        if (val === '' || val === null || val === undefined) return null;
        const n = Number(val);
        return Number.isNaN(n) ? null : n;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setLoading(true);
        try {
            const personIdNum = toNullableNumber(form.personId);
            const payloadBase = {
                title: form.title,
                description: form.description,
                completed: !!form.completed,
                dueDate: form.dueDate || null,
                personId: personIdNum
            };

            if (isEditing) {
                const updated = await taskService.update(form.id, { ...payloadBase, id: form.id }, files);
                setTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));
                alert('Task updated');
            } else {
                const created = await taskService.create(payloadBase, files);
                setTasks(prev => [created, ...prev]);
                alert('Task created');
            }

            setForm({ ...emptyForm });
            setFiles([]);
            setIsEditing(false);
            if (fileRef.current) fileRef.current.value = null;
        } catch (err) {
            console.error('Save failed', err);
            alert('Save failed: ' + (err.message || ''));
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (t) => {
        setIsEditing(true);
        setForm({
            id: t.id,
            title: t.title || '',
            description: t.description || '',
            dueDate: t.dueDate ? t.dueDate.substring(0, 16) : '',
            personId: t.personId != null ? String(t.personId) : '',
            completed: !!t.completed
        });
        setFiles([]);
        if (fileRef.current) fileRef.current.value = null;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this task?')) return;
        setLoading(true);
        try {
            await taskService.delete(id);
            setTasks(prev => prev.filter(t => t.id !== id));
            alert('Deleted');
        } catch (err) {
            console.error('Delete failed', err);
            alert('Delete failed: ' + (err.message || ''));
        } finally {
            setLoading(false);
        }
    };

    const handleToggleComplete = async (t) => {
        setLoading(true);
        try {
            const payload = {
                id: t.id,
                title: t.title,
                description: t.description ?? '',
                completed: !t.completed,
                dueDate: t.dueDate ?? null,
                personId: t.personId ?? null
            };
            const updated = await taskService.update(t.id, payload, []);
            setTasks(prev => prev.map(i => (i.id === updated.id ? updated : i)));
        } catch (err) {
            console.error('Toggle failed', err);
            alert('Toggle failed: ' + (err.message || ''));
        } finally {
            setLoading(false);
        }
    };

    const applyFilter = (list) => {
        switch (filter) {
            case 'completed':
                return list.filter(t => !!t.completed);
            case 'pending':
                return list.filter(t => !t.completed);
            case 'unassigned':
                return list.filter(t => (t.personId === null || t.personId === undefined || t.personId === ''));
            case 'all':
            default:
                return list;
        }
    };

    // Apply sort based on sortOrder and filter
    const visibleTasks = applyFilter([...tasks].sort((a, b) => {
        return sortOrder === 'ascending' ? compareDueDateAsc(a, b) : compareDueDateAsc(b, a);
    }));

    const toggleSortOrder = () => {
        setSortOrder(prev => prev === 'ascending' ? 'descending' : 'ascending');
    };

    const onFilterSelect = (newFilter) => {
        setFilter(newFilter);
        setShowFilterDropdown(false);
    };

    const getAttachmentNames = (t) => {
        if (!t) return [];
        if (Array.isArray(t.attachments) && t.attachments.length > 0) {
            return t.attachments.map(a => (a.fileName ?? a.name ?? a.filename ?? String(a))).filter(Boolean);
        }
        return [];
    };

    return (
        <div className="dashboard-layout">
            <Sidebar isOpen={false} onClose={() => {}} />
            <main className="dashboard-main">
                <Header title="Tasks" subtitle="Manage and organize your tasks" onToggleSidebar={() => {}} />

                <div className="dashboard-content">
                    <div className="row">
                        <div className="col-md-8 mx-auto">
                            <div className="card shadow-sm task-form-section">
                                <div className="card-body">
                                    <h2 className="card-title mb-4">{isEditing ? 'Edit Task' : 'Add New Task'}</h2>
                                    <form onSubmit={handleSubmit}>
                                        <div className="mb-3">
                                            <label className="form-label">Title *</label>
                                            <input className="form-control" value={form.title} onChange={e => setForm(s => ({ ...s, title: e.target.value }))} />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Description *</label>
                                            <textarea className="form-control" rows="3" value={form.description} onChange={e => setForm(s => ({ ...s, description: e.target.value }))} />
                                        </div>

                                        <div className="row">
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">Due Date *</label>
                                                <input type="datetime-local" className="form-control" value={form.dueDate} onChange={e => setForm(s => ({ ...s, dueDate: e.target.value }))} />
                                            </div>
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">Assign to (optional)</label>
                                                <select className="form-select" value={form.personId} onChange={e => setForm(s => ({ ...s, personId: e.target.value }))}>
                                                    <option value="">-- Select --</option>
                                                    {persons.map(p => (
                                                        <option key={p.id} value={String(p.id)}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label">Attachments</label>
                                            <div className="input-group mb-3">
                                                <input ref={fileRef} type="file" className="form-control" multiple onChange={onFileChange} />
                                                <button type="button" className="btn btn-outline-secondary" onClick={() => { setFiles([]); if (fileRef.current) fileRef.current.value = null; }}>
                                                    <i className="bi bi-x-lg"></i>
                                                </button>
                                            </div>

                                            {files.length > 0 && (
                                                <ul className="small list-unstyled">
                                                    {files.map((f, i) => <li key={i}><i className="bi bi-paperclip me-2"></i>{f.name}</li>)}
                                                </ul>
                                            )}

                                        </div>

                                        <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                                            <button className="btn btn-primary" disabled={loading}>
                                                <i className={`bi ${isEditing ? 'bi-pencil' : 'bi-plus-lg'} me-2`}></i>
                                                {isEditing ? 'Update Task' : 'Add Task'}
                                            </button>
                                            {isEditing && <button type="button" className="btn btn-outline-secondary" onClick={() => { setForm({ ...emptyForm }); setFiles([]); setIsEditing(false); if (fileRef.current) fileRef.current.value = null; }}>Cancel</button>}
                                        </div>
                                    </form>
                                </div>
                            </div>

                            <div className="card shadow-sm tasks-list mt-4">
                                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                                    <h5 className="card-title mb-0">Tasks</h5>
                                    <div className="btn-group position-relative">
                                        <button
                                            className="btn btn-outline-secondary btn-sm"
                                            title={`Sort by due date (${sortOrder})`}
                                            onClick={toggleSortOrder}
                                        >
                                            <i className={sortOrder === 'ascending' ? 'bi bi-sort-numeric-down' : 'bi bi-sort-numeric-up'}></i>
                                        </button>

                                        <div className="dropdown">
                                            <button className="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" id="filterDropdown" data-bs-toggle="dropdown" aria-expanded={showFilterDropdown} onClick={() => setShowFilterDropdown(s => !s)}>
                                                <i className="bi bi-funnel"></i>
                                            </button>
                                            <ul className={`dropdown-menu dropdown-menu-end${showFilterDropdown ? ' show' : ''}`} aria-labelledby="filterDropdown" style={{ minWidth: 160 }}>
                                                <li><button className={`dropdown-item ${filter === 'all' ? 'active' : ''}`} onClick={() => onFilterSelect('all')}>All</button></li>
                                                <li><button className={`dropdown-item ${filter === 'completed' ? 'active' : ''}`} onClick={() => onFilterSelect('completed')}>Completed</button></li>
                                                <li><button className={`dropdown-item ${filter === 'pending' ? 'active' : ''}`} onClick={() => onFilterSelect('pending')}>Pending</button></li>
                                                <li><button className={`dropdown-item ${filter === 'unassigned' ? 'active' : ''}`} onClick={() => onFilterSelect('unassigned')}>Unassigned</button></li>
                                                <li><hr className="dropdown-divider" /></li>
                                                <li><button className="dropdown-item" onClick={() => { onFilterSelect('all'); setSortOrder('ascending'); }}>Reset & Sort</button></li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="card-body">
                                    <div className="list-group">
                                        {loading && <div className="text-center py-3">Loading...</div>}
                                        {!loading && visibleTasks.length === 0 && <div className="text-center text-muted py-4">No tasks found.</div>}
                                        {!loading && visibleTasks.map(t => (
                                            <div className="list-group-item list-group-item-action" key={t.id}>
                                                <div className="d-flex w-100 justify-content-between align-items-start">
                                                    <div className="flex-grow-1">
                                                        <div className="d-flex justify-content-between">
                                                            <h6 className="mb-1">{t.title}</h6>
                                                            <small className="text-muted ms-2">{t.createdAt ? t.createdAt.substring(0,10) : ''}</small>
                                                        </div>
                                                        <p className="mb-1 text-muted small">{t.description}</p>
                                                        <div className="d-flex align-items-center flex-wrap">
                                                            <small className="text-muted me-2"><i className="bi bi-calendar-event"></i> Due: {t.dueDate ? t.dueDate.substring(0,10) : 'N/A'}</small>
                                                            {t.personName ? <span className="badge bg-info me-2"><i className="bi bi-person"></i> {t.personName}</span> : null}
                                                            <span className={`badge me-2 ${t.completed ? 'bg-success' : 'bg-warning text-dark'}`}>{t.completed ? 'completed' : 'pending'}</span>
                                                            {t.numberOfAttachments > 0 && <span className="badge bg-secondary me-2">{t.numberOfAttachments} file(s)</span>}
                                                        </div>
                                                    </div>
                                                    <div className="btn-group ms-3">
                                                        <button className="btn btn-outline-success btn-sm" title="Complete" onClick={() => handleToggleComplete(t)}>
                                                            <i className="bi bi-check-lg"></i>
                                                        </button>
                                                        <button className="btn btn-outline-primary btn-sm" title="Edit" onClick={() => handleEdit(t)}>
                                                            <i className="bi bi-pencil"></i>
                                                        </button>
                                                        <button className="btn btn-outline-danger btn-sm" title="Delete" onClick={() => handleDelete(t.id)}>
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Task;
