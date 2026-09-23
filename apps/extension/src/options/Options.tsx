import React, { useEffect, useState } from 'react';
import { storageService } from '../storage/chromeStorage';
import { FocusProfile, StorageSchema } from '@focusflow/shared';
import {
  normalizeDomain,
  getDomainDisplayName,
  validateDomainUniqueness
} from '../utils/domainNormalizer';
import {
  calculateProductivitySummary,
  generateExportData,
  ProductivitySummary
} from '../services/analyticsEngine';
import { playChime } from '../services/soundService';
import './options.css';

const QUICK_ADD_PRESETS = [
  { name: 'YouTube', domain: 'youtube.com' },
  { name: 'Instagram', domain: 'instagram.com' },
  { name: 'Facebook', domain: 'facebook.com' },
  { name: 'Reddit', domain: 'reddit.com' },
  { name: 'Netflix', domain: 'netflix.com' },
  { name: 'X / Twitter', domain: 'x.com' },
  { name: 'TikTok', domain: 'tiktok.com' }
];

export const Options: React.FC = () => {
  const [profiles, setProfiles] = useState<Record<string, FocusProfile>>({});
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [analytics, setAnalytics] = useState<ProductivitySummary>({
    todayFocusMinutes: 0,
    weekFocusMinutes: 0,
    totalSessionsCount: 0,
    completedSessionsCount: 0,
    interruptedSessionsCount: 0,
    completionRatePercent: 0,
    topDistractions: []
  });

  // Domain Management States
  const [newDomainInput, setNewDomainInput] = useState<string>('');
  const [domainError, setDomainError] = useState<string>('');
  const [editingDomain, setEditingDomain] = useState<string | null>(null);
  const [editDomainInput, setEditDomainInput] = useState<string>('');
  const [editError, setEditError] = useState<string>('');

  useEffect(() => {
    storageService.initialize().then((state: StorageSchema) => {
      setProfiles(state.profiles);
      setActiveProfileId(state.activeProfileId);
      setAnalytics(calculateProductivitySummary(state.sessions, state.distractionAttempts));
    });

    const unsubscribeProfiles = storageService.subscribe('profiles', (newProfiles) => {
      if (newProfiles) setProfiles(newProfiles);
    });

    const unsubscribeActiveProfile = storageService.subscribe('activeProfileId', (newId) => {
      if (newId) setActiveProfileId(newId);
    });

    const unsubscribeSessions = storageService.subscribe('sessions', async (sessions) => {
      const distractions = await storageService.get('distractionAttempts');
      setAnalytics(calculateProductivitySummary(sessions, distractions));
    });

    const unsubscribeDistractions = storageService.subscribe('distractionAttempts', async (distractions) => {
      const sessions = await storageService.get('sessions');
      setAnalytics(calculateProductivitySummary(sessions, distractions));
    });

    return () => {
      unsubscribeProfiles();
      unsubscribeActiveProfile();
      unsubscribeSessions();
      unsubscribeDistractions();
    };
  }, []);

  const activeProfile = profiles[activeProfileId];
  const blockedList = activeProfile?.blockedDomains || [];

  const showNotice = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleSelectProfile = async (id: string) => {
    await storageService.set('activeProfileId', id);
    setActiveProfileId(id);
    showNotice(`Active profile switched to ${profiles[id]?.name}`);
  };

  // Add domain
  const handleAddDomain = async (domainToAdd?: string) => {
    const rawInput = domainToAdd ?? newDomainInput;
    setDomainError('');

    const validation = normalizeDomain(rawInput);
    if (!validation.isValid || !validation.normalizedDomain) {
      setDomainError(validation.error || 'Invalid domain format.');
      return;
    }

    const domain = validation.normalizedDomain;
    const uniqueCheck = validateDomainUniqueness(domain, blockedList);
    if (!uniqueCheck.isUnique) {
      setDomainError(uniqueCheck.error || 'Domain already exists in list.');
      return;
    }

    const success = await storageService.addBlockedDomain(activeProfileId, domain);
    if (success) {
      setNewDomainInput('');
      setDomainError('');
      showNotice(`Added '${domain}' to blocked list.`);
    }
  };

  // Remove domain
  const handleRemoveDomain = async (domain: string) => {
    const success = await storageService.removeBlockedDomain(activeProfileId, domain);
    if (success) {
      showNotice(`Removed '${domain}' from blocked list.`);
    }
  };

  // Start editing
  const handleStartEdit = (domain: string) => {
    setEditingDomain(domain);
    setEditDomainInput(domain);
    setEditError('');
  };

  // Save edited domain
  const handleSaveEdit = async () => {
    if (!editingDomain) return;
    setEditError('');

    const validation = normalizeDomain(editDomainInput);
    if (!validation.isValid || !validation.normalizedDomain) {
      setEditError(validation.error || 'Invalid domain format.');
      return;
    }

    const newDomain = validation.normalizedDomain;
    if (newDomain !== editingDomain) {
      const uniqueCheck = validateDomainUniqueness(
        newDomain,
        blockedList.filter((d) => d !== editingDomain)
      );
      if (!uniqueCheck.isUnique) {
        setEditError(uniqueCheck.error || 'Domain already exists in list.');
        return;
      }
    }

    const success = await storageService.editBlockedDomain(
      activeProfileId,
      editingDomain,
      newDomain
    );
    if (success) {
      setEditingDomain(null);
      setEditDomainInput('');
      showNotice(`Updated '${editingDomain}' to '${newDomain}'.`);
    }
  };

  // Export local data
  const handleExportData = async () => {
    const allData = await storageService.getAll();
    const jsonStr = generateExportData(allData as unknown as Record<string, unknown>);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focusflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotice('Exported FocusFlow data backup to JSON.');
  };

  const handleTestAudio = () => {
    playChime('complete');
    showNotice('Playing session completion chime.');
  };

  const handleResetData = async () => {
    if (
      window.confirm(
        'Are you sure you want to reset all local FocusFlow settings and data to defaults?'
      )
    ) {
      await storageService.resetToDefaults();
      const fresh = await storageService.getAll();
      setProfiles(fresh.profiles);
      setActiveProfileId(fresh.activeProfileId);
      setAnalytics(calculateProductivitySummary(fresh.sessions, fresh.distractionAttempts));
      showNotice('All data has been reset to defaults.');
    }
  };

  return (
    <div className="options-layout">
      {/* Header */}
      <header className="options-header">
        <div className="options-brand">
          <img src="icons/icon-48.png" alt="FocusFlow Logo" className="options-logo" />
          <div className="options-title-block">
            <h1>FocusFlow Settings & Dashboard</h1>
            <p>Customize focus profiles, blocking rules, analytics, and preferences</p>
          </div>
        </div>
        <span className="badge-v3">Microsoft Edge & Chrome MV3 Ready</span>
      </header>

      {statusMessage && (
        <div className="notice-banner" role="status">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {statusMessage}
        </div>
      )}

      {/* Analytics Card */}
      <div className="card card-full" style={{ marginBottom: '24px' }}>
        <h2 className="card-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          Productivity Analytics
        </h2>
        <div className="analytics-stats-grid">
          <div className="stat-box">
            <span className="stat-box-label">Today's Focus</span>
            <span className="stat-box-num">{analytics.todayFocusMinutes}m</span>
          </div>
          <div className="stat-box">
            <span className="stat-box-label">This Week</span>
            <span className="stat-box-num">{Math.round((analytics.weekFocusMinutes / 60) * 10) / 10}h</span>
          </div>
          <div className="stat-box">
            <span className="stat-box-label">Completed Sessions</span>
            <span className="stat-box-num">{analytics.completedSessionsCount}</span>
          </div>
          <div className="stat-box">
            <span className="stat-box-label">Completion Rate</span>
            <span className="stat-box-num">{analytics.completionRatePercent}%</span>
          </div>
        </div>

        {analytics.topDistractions.length > 0 && (
          <div>
            <div className="quick-add-label" style={{ marginBottom: '10px' }}>Top Resisted Distractions</div>
            <div className="distractions-list">
              {analytics.topDistractions.map((d) => (
                <div key={d.domain} className="distraction-item">
                  <span className="distraction-tag">{d.domain}</span>
                  <span className="distraction-count">{d.count} {d.count === 1 ? 'attempt' : 'attempts'} blocked</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="options-grid">
        {/* Blocked Websites Card */}
        <div className="card card-full">
          <h2 className="card-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            Blocked Websites ({activeProfile ? activeProfile.name : 'Loading...'})
          </h2>
          <p className="card-subtitle">
            Websites added here are blocked during active sessions. Enter any URL or domain (e.g. <code>youtube.com</code> or <code>https://instagram.com/feed</code>) — FocusFlow normalizes it automatically.
          </p>

          {/* Quick Add Presets */}
          <div className="quick-add-wrap">
            <div className="quick-add-label">Quick Add Common Distractions</div>
            <div className="quick-add-chips">
              {QUICK_ADD_PRESETS.map((preset) => {
                const isAdded = blockedList.includes(preset.domain);
                return (
                  <button
                    key={preset.domain}
                    className={`chip-btn ${isAdded ? 'added' : ''}`}
                    disabled={isAdded}
                    onClick={() => handleAddDomain(preset.domain)}
                    title={isAdded ? 'Already added to blocked list' : `Add ${preset.name}`}
                  >
                    {isAdded ? `✓ ${preset.name}` : `+ ${preset.name}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add Website Input */}
          <div className="blocklist-input-row">
            <input
              type="text"
              className={`input-domain ${domainError ? 'error' : ''}`}
              placeholder="e.g. youtube.com or reddit.com"
              value={newDomainInput}
              onChange={(e) => {
                setNewDomainInput(e.target.value);
                if (domainError) setDomainError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddDomain();
                }
              }}
              id="input-new-domain"
            />
            <button
              className="btn-primary"
              onClick={() => handleAddDomain()}
              id="btn-add-website"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Website
            </button>
          </div>

          {domainError && <div className="error-text" role="alert">{domainError}</div>}

          {/* Blocked Websites List */}
          <div className="website-list" role="list">
            {blockedList.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '16px 0' }}>
                No websites currently blocked in this profile. Add one above!
              </div>
            ) : (
              blockedList.map((domain) => (
                <div key={domain} className="website-item" role="listitem">
                  {editingDomain === domain ? (
                    <div className="inline-edit-form">
                      <input
                        type="text"
                        className="input-domain"
                        value={editDomainInput}
                        onChange={(e) => setEditDomainInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') setEditingDomain(null);
                        }}
                        autoFocus
                      />
                      <button className="btn-secondary" onClick={handleSaveEdit}>
                        Save
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => setEditingDomain(null)}
                      >
                        Cancel
                      </button>
                      {editError && <span className="error-text">{editError}</span>}
                    </div>
                  ) : (
                    <>
                      <div className="website-info">
                        <span className="website-display-name">
                          {getDomainDisplayName(domain)}
                        </span>
                        <span className="website-domain-tag">{domain}</span>
                      </div>
                      <div className="website-actions">
                        <button
                          className="btn-icon-action"
                          onClick={() => handleStartEdit(domain)}
                          title="Edit domain"
                          aria-label={`Edit ${domain}`}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                          </svg>
                        </button>
                        <button
                          className="btn-icon-action btn-icon-delete"
                          onClick={() => handleRemoveDomain(domain)}
                          title="Remove domain"
                          aria-label={`Remove ${domain}`}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Profiles Card */}
        <div className="card">
          <h2 className="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Focus Profiles
          </h2>
          <p className="card-subtitle">
            Switch active profile to tailor focus durations and blocked domains for each task.
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
                  <div className="profile-name">
                    {prof.name} {prof.id === activeProfileId && '✓ (Active)'}
                  </div>
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

        {/* Audio & Settings Card */}
        <div className="card">
          <h2 className="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
            Audio & Data Management
          </h2>
          <p className="card-subtitle">
            Configure sound effects, export your productivity logs, or manage local data.
          </p>

          <div className="setting-row">
            <div className="setting-info">
              <h4>Audio Chimes</h4>
              <p>Play pleasant synthesized chime upon session completion</p>
            </div>
            <button className="btn-secondary" onClick={handleTestAudio}>
              Test Sound
            </button>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <h4>Export Data Backup</h4>
              <p>Download your profiles, sessions, and distraction counters as JSON</p>
            </div>
            <button className="btn-secondary" onClick={handleExportData}>
              Export JSON
            </button>
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
      </div>
    </div>
  );
};
