import React, { useEffect, useState } from 'react';
import { storageService } from '../storage/chromeStorage';
import { FocusProfile, StorageSchema } from '@focusflow/shared';
import './options.css';

export const Options: React.FC = () => {
  const [profiles, setProfiles] = useState<Record<string, FocusProfile>>({});
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    storageService.initialize().then((state: StorageSchema) => {
      setProfiles(state.profiles);
      setActiveProfileId(state.activeProfileId);
    });

    const unsubscribeProfiles = storageService.subscribe('profiles', (newProfiles) => {
      if (newProfiles) setProfiles(newProfiles);
    });

    const unsubscribeActiveProfile = storageService.subscribe('activeProfileId', (newId) => {
      if (newId) setActiveProfileId(newId);
    });

    return () => {
      unsubscribeProfiles();
      unsubscribeActiveProfile();
    };
  }, []);

  const handleSelectProfile = async (id: string) => {
    await storageService.set('activeProfileId', id);
    setActiveProfileId(id);
    showNotice(`Active profile switched to ${profiles[id]?.name}`);
  };

  const handleResetData = async () => {
    if (window.confirm('Are you sure you want to reset all local FocusFlow settings and data to defaults?')) {
      await storageService.resetToDefaults();
      const fresh = await storageService.getAll();
      setProfiles(fresh.profiles);
      setActiveProfileId(fresh.activeProfileId);
      showNotice('All data has been reset to defaults.');
    }
  };

  const showNotice = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  return (
    <div className="options-layout">
      {/* Header */}
      <header className="options-header">
        <div className="options-brand">
          <img src="icons/icon-48.png" alt="FocusFlow Logo" className="options-logo" />
          <div className="options-title-block">
            <h1>FocusFlow Settings & Dashboard</h1>
            <p>Customize focus profiles, blocking rules, and system preferences</p>
          </div>
        </div>
        <span className="badge-v3">Manifest V3 Production Shell</span>
      </header>

      {statusMessage && (
        <div style={{
          padding: '12px 18px',
          background: 'rgba(99, 102, 241, 0.2)',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          borderRadius: '10px',
          marginBottom: '24px',
          color: '#e0e7ff',
          fontSize: '14px',
          fontWeight: 600
        }}>
          {statusMessage}
        </div>
      )}

      {/* Grid */}
      <div className="options-grid">
        {/* Profile Card */}
        <div className="card">
          <h2 className="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Focus Profiles
          </h2>
          <p className="card-subtitle">
            Profiles define tailored focus durations and blocked domain lists for distinct activities.
          </p>

          <div className="profile-pill-list">
            {Object.values(profiles).map((prof) => (
              <div
                key={prof.id}
                className={`profile-pill ${prof.id === activeProfileId ? 'active' : ''}`}
                onClick={() => handleSelectProfile(prof.id)}
                style={{ cursor: 'pointer' }}
              >
                <div>
                  <div className="profile-name">{prof.name} {prof.id === activeProfileId && '✓ (Active)'}</div>
                  <div className="profile-meta">
                    {prof.durationMinutes} min • {prof.blockedDomains.length} blocked sites
                  </div>
                </div>
                <button
                  className="btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectProfile(prof.id);
                  }}
                >
                  {prof.id === activeProfileId ? 'Selected' : 'Select'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* System & Data Management Card */}
        <div className="card">
          <h2 className="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
            Local Storage & Privacy
          </h2>
          <p className="card-subtitle">
            All FocusFlow profiles, sessions, and preferences are stored 100% locally within your browser sandbox.
          </p>

          <div className="setting-row">
            <div className="setting-info">
              <h4>Storage Architecture</h4>
              <p>Chrome Extension Isolated Sandbox (chrome.storage.local)</p>
            </div>
            <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 600 }}>Active</span>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <h4>Reset Local Database</h4>
              <p>Revert all profiles, settings, and timers to default state</p>
            </div>
            <button className="btn-danger" onClick={handleResetData}>
              Reset All Data
            </button>
          </div>
        </div>

        {/* Platform Status */}
        <div className="card card-full">
          <h2 className="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            Phase 1 Extension Shell Verification
          </h2>
          <p className="card-subtitle" style={{ marginBottom: 0 }}>
            Service Worker event-driven listener registered • Chrome Storage abstraction hydrated • Manifest V3 compliant • Responsive Options page ready for Phase 2 timer engine integration.
          </p>
        </div>
      </div>
    </div>
  );
};
