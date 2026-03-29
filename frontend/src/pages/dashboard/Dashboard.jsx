import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orgAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Alert from '../../components/common/Alert';
import Modal from '../../components/common/Modal';

const Dashboard = () => {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    orgAPI.getAll()
      .then(({ data }) => setOrgs(data.data))
      .catch(() => setError('Failed to load organizations'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await orgAPI.create({ name: orgName });
      setOrgs((prev) => [...prev, data.data]);
      setShowModal(false);
      setOrgName('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create organization');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, {user?.name}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Organization</button>
      </div>

      <Alert message={error} onClose={() => setError('')} />

      {loading ? (
        <div className="loading">Loading organizations...</div>
      ) : orgs.length === 0 ? (
        <div className="empty-state">
          <p>No organizations yet.</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create your first organization</button>
        </div>
      ) : (
        <div className="card-grid">
          {orgs.map((org) => (
            <Link to={`/orgs/${org._id}`} key={org._id} className="card card-link">
              <div className="card-title">{org.name}</div>
              <div className="card-meta">Owner: {org.owner?.name}</div>
              <div className="card-meta">{org.members?.length || 0} members</div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Create Organization" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Organization Name</label>
              <input
                type="text" required placeholder="e.g. Acme Corp"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Dashboard;
