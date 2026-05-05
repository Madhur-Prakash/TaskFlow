import { useState } from 'react';
import { taskAPI } from '../../api';
import Alert from '../common/Alert';
import Modal from '../common/Modal';

const STATUSES = ['todo', 'in-progress', 'done'];

const TaskBoard = ({ tasks, setTasks, orgId, members, currentUserId, orgRole }) => {
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', status: 'todo', assignedTo: '' });

  const openCreate = () => {
    setEditTask(null);
    setForm({ title: '', description: '', status: 'todo', assignedTo: '' });
    setShowModal(true);
  };

  const openEdit = (task) => {
    setEditTask(task);
    setForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      assignedTo: task.assignedTo?._id || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form };
    const isAdmin = orgRole === 'admin';
    // Only include assignedTo if admin; empty string -> null for admins
    if (isAdmin) payload.assignedTo = form.assignedTo || null;
    else delete payload.assignedTo;
    try {
      if (editTask) {
        const { data } = await taskAPI.update(editTask._id, payload);
        setTasks((prev) => prev.map((t) => (t._id === editTask._id ? data.data : t)));
      } else {
        const { data } = await taskAPI.create(orgId, payload);
        setTasks((prev) => [...prev, data.data]);
      }
      setShowModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save task');
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await taskAPI.delete(taskId);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const canEdit = (task) =>
    orgRole === 'admin' ||
    task.createdBy?._id === currentUserId ||
    task.assignedTo?._id === currentUserId;

  return (
    <div>
      <div className="section-header">
        <h2>Tasks</h2>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add Task</button>
      </div>
      <Alert message={error} onClose={() => setError('')} />
      <div className="kanban-board">
        {STATUSES.map((status) => (
          <div key={status} className="kanban-column">
            <div className="kanban-column-header">{status.replace('-', ' ').toUpperCase()}</div>
            {tasks.filter((t) => t.status === status).map((task) => (
              <div key={task._id} className="task-card">
                <div className="task-title">{task.title}</div>
                {task.description && <div className="task-desc">{task.description}</div>}
                {task.assignedTo ? (
                  <div className="task-meta">👤 {task.assignedTo.name}</div>
                ) : (
                  <div className="task-meta">— Unassigned</div>
                )}
                {canEdit(task) && (
                  <div className="task-actions">
                    <button className="btn btn-xs btn-outline" onClick={() => openEdit(task)}>Edit</button>
                    <button className="btn btn-xs btn-danger" onClick={() => handleDelete(task._id)}>Delete</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {showModal && (
        <Modal title={editTask ? 'Edit Task' : 'New Task'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Title</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {orgRole === 'admin' && (
              <div className="form-group">
                <label>Assign To</label>
                <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.user._id} value={m.user._id}>{m.user.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editTask ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default TaskBoard;
