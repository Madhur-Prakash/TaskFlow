import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { User, Flag, Edit2, Trash2, Plus } from 'lucide-react';
import { DndContext, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { taskAPI } from '../../api';
import Alert from '../common/Alert';
import Modal from '../common/Modal';

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

  const onDragStart = (e, taskId) => {
    // legacy noop kept for compatibility
    setDraggingId(taskId);
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

  const onDropToColumn = async (taskId, status) => {
    if (!taskId) return;
    const prev = [...tasks];
    setTasks((prevTasks) => prevTasks.map((t) => (t._id === taskId ? { ...t, status } : t)));
    try {
      const { data } = await taskAPI.update(taskId, { status });
      setTasks((prevTasks) => prevTasks.map((t) => (t._id === taskId ? data.data : t)));
    } catch (err) {
      setTasks(prev);
      setError(err.response?.data?.message || 'Failed to move task');
    } finally {
      setDraggingId(null);
    }
  };

  // DnD Kit handlers
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragStart = ({ active }) => {
    setDraggingId(active.id);
  };

  const handleDragEnd = ({ active, over }) => {
    setDraggingId(null);
    if (!over) return;
    // drop onto column like column-todo
    if (String(over.id).startsWith('column-')) {
      const status = String(over.id).replace('column-', '');
      onDropToColumn(active.id, status);
    }
  };

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!orgId) return; // nothing to join
    
    // Determine socket URL based on environment
    let socketUrl;
    if (process.env.REACT_APP_API_URL) {
      // Production: use environment variable (e.g., https://api.taskflow.com)
      socketUrl = process.env.REACT_APP_API_URL;
    } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Development: use localhost:5000
      socketUrl = 'http://localhost:5000';
    } else {
      // Production without env var: assume backend is same host, different port or path
      socketUrl = `${window.location.protocol}//${window.location.hostname}:5000`;
    }
    
    console.log('[Socket] Attempting connection to:', socketUrl);
    
    const socket = io(socketUrl, { 
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });
    
    socket.on('connect', () => {
      console.log('✓ Socket connected:', socket.id);
      socket.emit('joinOrg', { orgId });
    });

    socket.on('connect_error', (error) => {
      console.error('✗ Socket connection error:', error?.message || error);
    });

    socket.on('error', (error) => {
      console.error('✗ Socket error event:', error?.message || error);
    });

    socket.on('task:created', (task) => {
      console.log('📥 task:created', task);
      setTasks((prev) => {
        if (prev.some((t) => t._id === task._id)) return prev;
        return [...prev, task];
      });
    });

    socket.on('task:updated', (task) => {
      console.log('📥 task:updated', task);
      setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t)));
    });

    socket.on('task:deleted', ({ taskId }) => {
      console.log('📥 task:deleted', taskId);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    });

    socket.on('disconnect', (reason) => {
      console.log('✗ Socket disconnected:', reason);
    });

    return () => {
      socket.emit('leaveOrg', { orgId });
      socket.disconnect();
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
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
          
            return STATUSES.map((status) => {
              const Column = ({ status }) => {
                const { setNodeRef, isOver } = useDroppable({ id: `column-${status}` });
                return (
                  <div ref={setNodeRef} key={status} className={`kanban-column ${isOver ? 'drag-over' : ''}`}>
                    <div className="kanban-column-header">{status.replace('-', ' ').toUpperCase()}</div>
                    {arranged.filter((t) => t.status === status).map((task) => (
                      <DraggableTask key={task._id} task={task} />
                    ))}
                  </div>
                );
              };

              const DraggableTask = ({ task }) => {
                const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task._id });
                const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
                return (
                  <div
                    ref={setNodeRef}
                    {...listeners}
                    {...attributes}
                    style={style}
                    className={`task-card priority-${task.priority || 'medium'} ${isDragging ? 'dragging' : ''}`}
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
                );
              };

              return <Column key={status} status={status} />;
            });
        })()}
        </div>
      </DndContext>
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
