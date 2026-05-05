import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orgAPI, taskAPI, userAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import useSocket from '../../hooks/useSocket';
import Alert from '../../components/Alert';
import Modal from '../../components/Modal';
import TaskBoard from '../../components/TaskBoard';

const OrgPage = () => {
  const { orgId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [org, setOrg] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState({ userId: '', role: 'member' });
  const [updatingRoleFor, setUpdatingRoleFor] = useState(null); // userId being updated

  const isAdmin = org?.owner?._id === user?._id ||
    org?.members?.find((m) => m.user._id === user?._id)?.role === 'admin';

  const socket = useSocket();

  useEffect(() => {
    Promise.all([
      orgAPI.getOne(orgId),
      taskAPI.getByOrg(orgId),
      userAPI.getAll(),
    ])
      .then(([orgRes, taskRes, usersRes]) => {
        setOrg(orgRes.data.data);
        setTasks(taskRes.data.data);
        setAllUsers(usersRes.data.data);
      })
      .catch(() => setError('Failed to load organization'))
      .finally(() => setLoading(false));
  }, [orgId, user]);

  // Real-time org-level updates
  useEffect(() => {
    if (!orgId) return;
    if (!socket) return;

    const refresh = async () => {
      try {
        const [orgRes, taskRes] = await Promise.all([orgAPI.getOne(orgId), taskAPI.getByOrg(orgId)]);
        setOrg(orgRes.data.data);
        setTasks(taskRes.data.data);
      } catch (err) {
        // ignore refresh errors
      }
    };

    const handlers = {
      'org:memberAdded': refresh,
      'org:memberRemoved': refresh,
      'org:memberRoleUpdated': refresh,
      'org:deleted': () => navigate('/dashboard'),
    };

    Object.entries(handlers).forEach(([evt, handler]) => socket.on(evt, handler));

    // Join org room so server can target us if needed
    if (socket.connected) socket.emit('joinOrg', { orgId });
    socket.on('connect', () => socket.emit('joinOrg', { orgId }));

    return () => {
      Object.keys(handlers).forEach((evt) => socket.off(evt));
      socket.emit('leaveOrg', { orgId });
    };
  }, [orgId, navigate, socket]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const { data } = await orgAPI.addMember(orgId, memberForm);
      setOrg(data.data);
      setShowAddMember(false);
      setMemberForm({ userId: '', role: 'member' });
      setSuccess('Member added successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    setError('');
    setSuccess('');
    try {
      const { data } = await orgAPI.removeMember(orgId, userId);
      setOrg(data.data);
      setSuccess('Member removed');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    setError('');
    setSuccess('');
    setUpdatingRoleFor(memberId);
    try {
      const { data } = await orgAPI.updateMemberRole(orgId, memberId, newRole);
      setOrg(data.data);
      setSuccess('Role updated');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update role');
    } finally {
      setUpdatingRoleFor(null);
    }
  };

  const handleDeleteOrg = async () => {
    if (!window.confirm('Delete this organization? This cannot be undone.')) return;
    setError('');
    setSuccess('');
    try {
      await orgAPI.delete(orgId);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete organization');
    }
  };

  const nonMembers = allUsers.filter(
    (u) => !org?.members?.some((m) => m.user._id.toString() === u._id.toString()) &&
           u._id.toString() !== org?.owner?._id?.toString()
  );

  if (loading) return <div className="loading">Loading...</div>;
  if (!org) return <div className="page"><Alert message="Organization not found" /></div>;

  const orgRole = org.owner?._id === user?._id ? 'admin' :
    org.members?.find((m) => m.user._id === user?._id)?.role;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{org.name}</h1>
          <p>Owner: {org.owner?.name}</p>
        </div>
        {isAdmin && (
          <div className="header-actions">
            <button className="btn btn-outline btn-sm" onClick={() => setShowAddMember(true)}>+ Add Member</button>
            <button className="btn btn-danger btn-sm" onClick={handleDeleteOrg}>Delete Org</button>
          </div>
        )}
      </div>

      <Alert message={error} type="error" onClose={() => setError('')} />
      <Alert message={success} type="success" onClose={() => setSuccess('')} />

      {/* Members Section */}
      <div className="section">
        <h2>Members ({org.members?.length})</h2>
        <div className="members-list">
          {org.members?.map((m) => (
            <div key={m.user._id} className="member-item">
              <div className="member-info">
                <span className="member-name">{m.user.name}</span>
                <span className="member-email">{m.user.email}</span>
              </div>
              <div className="member-actions">
                {isAdmin && m.user._id.toString() !== user?._id ? (
                  <select
                    className="role-select"
                    value={m.role}
                    disabled={updatingRoleFor === m.user._id.toString()}
                    onChange={(e) => handleRoleChange(m.user._id.toString(), e.target.value)}
                  >
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                  </select>
                ) : (
                  <span className={`badge badge-${m.role}`}>{m.role}</span>
                )}
                {isAdmin && m.user._id.toString() !== user?._id && (
                  <button className="btn btn-xs btn-danger" onClick={() => handleRemoveMember(m.user._id.toString())}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks Section */}
      <div className="section">
        <TaskBoard
          tasks={tasks}
          setTasks={setTasks}
          orgId={orgId}
          members={org.members || []}
          currentUserId={user?._id}
          orgRole={orgRole}
        />
      </div>

      {showAddMember && (
        <Modal title="Add Member" onClose={() => setShowAddMember(false)}>
          <form onSubmit={handleAddMember}>
            <div className="form-group">
              <label>Select User</label>
              <select required value={memberForm.userId} onChange={(e) => setMemberForm({ ...memberForm, userId: e.target.value })}>
                <option value="">-- Select a user --</option>
                {nonMembers.map((u) => (
                  <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowAddMember(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Add Member</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default OrgPage;
