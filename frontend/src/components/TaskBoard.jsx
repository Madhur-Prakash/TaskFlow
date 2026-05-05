import { useState, useEffect } from 'react';
import useSocket from '../hooks/useSocket';
import { User, Flag, Edit2, Trash2, Plus } from 'lucide-react';
import { taskAPI } from '../api';
import Alert from './Alert';
import Modal from './Modal';

const STATUSES = ['todo', 'in-progress', 'done'];

const TaskBoard = ({ tasks, setTasks, orgId, members, currentUserId, orgRole }) => {
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', status: 'todo', priority: 'medium', assignedTo: '' });
  const [sortOption, setSortOption] = useState('all'); // all | assignedToMe | byPriorityHigh | byPriorityLow
  const [selectedMember, setSelectedMember] = useState(''); // filter tasks by member
  const socket = useSocket();

  const openCreate = () => {
    setEditTask(null);
    setForm({ title: '', description: '', status: 'todo', priority: 'medium', assignedTo: '' });
    setShowModal(true);
  };

  const openEdit = (task) => {
    setEditTask(task);
    setForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority || 'medium',
      assignedTo: task.assignedTo?._id || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form };
    const isAdmin = orgRole === 'admin';
    if (isAdmin) payload.assignedTo = form.assignedTo || null;
    else delete payload.assignedTo;
    try {
      if (editTask) {
        await taskAPI.update(editTask._id, payload);
      } else {
        await taskAPI.create(orgId, payload);
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
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const canEdit = (task) =>
    orgRole === 'admin' ||
    task.createdBy?._id === currentUserId ||
    task.assignedTo?._id === currentUserId;

  const onDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggingId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragEnd = () => {
    setDraggingId(null);
    setDragOverColumn(null);
  };

  const onDragOverColumn = (e, status) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const onDragLeaveColumn = (status) => {
    if (dragOverColumn === status) setDragOverColumn(null);
  };

  const onDropToColumn = async (e, status) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    setDragOverColumn(null);
    setDraggingId(null);
    if (!id) return;
    const task = tasks.find((t) => t._id === id);
    if (!task || task.status === status) return; // no-op
    // Optimistic update for instant visual feedback
    setTasks((prev) => prev.map((t) => (t._id === id ? { ...t, status } : t)));
    try {
      await taskAPI.update(id, { status });
      // socket event will arrive and confirm the final state
    } catch (err) {
      // Revert on failure
      setTasks((prev) => prev.map((t) => (t._id === id ? { ...t, status: task.status } : t)));
      setError(err.response?.data?.message || 'Failed to move task');
    }
  };

  // Real-time updates via Socket.IO (shared singleton socket)
  useEffect(() => {
    if (!orgId) return;

    const join = () => socket.emit('joinOrg', { orgId });
    socket.on('connect', join);
    socket.on('reconnect', join);

    socket.on('task:created', (task) => {
      setTasks((prev) => [...prev, task]);
    });

    socket.on('task:updated', (task) => {
      setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t)));
    });

    socket.on('task:deleted', ({ taskId }) => {
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    });

    // join immediately if already connected
    if (socket && socket.connected) join();

    return () => {
      if (!socket) return;
      socket.off('connect', join);
      socket.off('reconnect', join);
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:deleted');
      socket.emit('leaveOrg', { orgId });
    };
  }, [orgId, setTasks]);

  return (
    <div>
      <div className="section-header">
        <h2>Tasks</h2>
        <div className="flex gap-3 items-center justify-end">
          <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-40">
            <option value="all">All</option>
            <option value="assignedToMe">Assigned to me</option>
            <option value="byPriorityHigh">Priority: High to Low</option>
            <option value="byPriorityLow">Priority: Low to High</option>
          </select>
          <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-md w-48">
            <option value="">Filter by Member</option>
            {members.map((m) => (
              <option key={m.user._id} value={m.user._id}>{m.user.name}</option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={18} className="mr-1" /> Add Task</button>
        </div>
      </div>
      <Alert message={error} onClose={() => setError('')} />
      <div className="kanban-board">
        {(() => {
          // Prepare tasks according to sort/filter options
          const normalizeId = (id) => (id ? id.toString() : id);
          const mine = (t) => t.assignedTo && normalizeId(t.assignedTo._id) === normalizeId(currentUserId);
          let arranged = [...tasks];
          
          // Apply member filter first
          if (selectedMember) {
            arranged = arranged.filter((t) => t.assignedTo && normalizeId(t.assignedTo._id) === normalizeId(selectedMember));
          }
          
          // Apply sort option
          if (sortOption === 'assignedToMe') {
            arranged = arranged.filter((t) => mine(t));
          } else if (sortOption === 'byPriorityHigh') {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            arranged.sort((a, b) => priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium']);
          } else if (sortOption === 'byPriorityLow') {
            const priorityOrder = { low: 0, medium: 1, high: 2 };
            arranged.sort((a, b) => priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium']);
          }
          
          return STATUSES.map((status) => (
            <div
              key={status}
              className={`kanban-column ${dragOverColumn === status ? 'drag-over' : ''}`}
              onDragOver={(e) => onDragOverColumn(e, status)}
              onDragLeave={() => onDragLeaveColumn(status)}
              onDrop={(e) => onDropToColumn(e, status)}
            >
              <div className="kanban-column-header">{status.replace('-', ' ').toUpperCase()}</div>
              {arranged.filter((t) => t.status === status).map((task) => (
                <div
                  key={task._id}
                  className={`task-card priority-${task.priority || 'medium'} ${draggingId === task._id ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => onDragStart(e, task._id)}
                  onDragEnd={onDragEnd}
                >
                  <div className="task-title">{task.title}</div>
                  {task.description && <div className="task-desc">{task.description}</div>}
                  <div className="flex gap-2 mb-2 items-center">
                    {task.assignedTo ? (
                      <div className="task-meta"><User size={16} className="mr-1 inline" /> {task.assignedTo.name}</div>
                    ) : (
                      <div className="task-meta">Unassigned</div>
                    )}
                    <div className={`task-meta priority-${task.priority || 'medium'}`}>
                      <Flag size={16} className="mr-1 inline" /> {task.priority || 'medium'}
                    </div>
                  </div>
                  {canEdit(task) && (
                    <div className="task-actions">
                      <button className="btn btn-xs btn-outline" onClick={() => openEdit(task)} title="Edit"><Edit2 size={16} /></button>
                      <button className="btn btn-xs btn-danger" onClick={() => handleDelete(task._id)} title="Delete"><Trash2 size={16} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ));
        })()}
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
            <div className="form-group">
              <label>Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            {orgRole === 'admin' && (
              <div className="form-group">
                <label>Assign To</label>
                <select required value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
                  {/* <option value="">Unassigned</option> */}
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
