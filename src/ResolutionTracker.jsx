import React, { useState, useEffect, useCallback } from 'react';

// Notion API Service
const notionService = {
  apiKey: import.meta.env.VITE_NOTION_API_KEY,
  databaseId: import.meta.env.VITE_NOTION_DATABASE_ID,
  
  // Note: Direct Notion API calls from browser are blocked by CORS
  // We'll use a proxy or serverless function in production
  // For now, this sets up the structure for when we add the backend
  
  async fetchResolutions() {
    try {
      const response = await fetch('/api/notion/resolutions');
      if (!response.ok) throw new Error('Failed to fetch');
      return await response.json();
    } catch (error) {
      console.error('Notion fetch error:', error);
      return null;
    }
  },
  
  async updateResolution(pageId, updates) {
    try {
      const response = await fetch('/api/notion/resolutions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, updates })
      });
      if (!response.ok) throw new Error('Failed to update');
      return await response.json();
    } catch (error) {
      console.error('Notion update error:', error);
      return null;
    }
  },
  
  async createResolution(data) {
    try {
      const response = await fetch('/api/notion/resolutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create');
      return await response.json();
    } catch (error) {
      console.error('Notion create error:', error);
      return null;
    }
  }
};

// Local Storage for offline support and caching
const storage = {
  get(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage error:', error);
    }
  }
};

const ResolutionTracker = () => {
  // State
  const [resolutions, setResolutions] = useState(() => {
    // Load from localStorage first for instant display
    return storage.get('resolutions') || [];
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('offline'); // 'synced', 'syncing', 'offline', 'error'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState(null);
  const [newResolution, setNewResolution] = useState({ 
    title: '', 
    category: 'Personal Growth', 
    target: 1, 
    unit: 'times', 
    frequency: 'weekly' 
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingUpdates, setPendingUpdates] = useState(() => {
    return storage.get('pendingUpdates') || [];
  });

  const categories = ['Personal Growth', 'Health', 'Finance', 'Wellness', 'Career', 'Relationships'];
  const categoryColors = {
    'Personal Growth': { bg: '#FEF3C7', text: '#92400E', accent: '#F59E0B', glow: 'rgba(245, 158, 11, 0.3)' },
    'Health': { bg: '#DCFCE7', text: '#166534', accent: '#22C55E', glow: 'rgba(34, 197, 94, 0.3)' },
    'Finance': { bg: '#DBEAFE', text: '#1E40AF', accent: '#3B82F6', glow: 'rgba(59, 130, 246, 0.3)' },
    'Wellness': { bg: '#F3E8FF', text: '#7C3AED', accent: '#A855F7', glow: 'rgba(168, 85, 247, 0.3)' },
    'Career': { bg: '#FEE2E2', text: '#991B1B', accent: '#EF4444', glow: 'rgba(239, 68, 68, 0.3)' },
    'Relationships': { bg: '#FCE7F3', text: '#9D174D', accent: '#EC4899', glow: 'rgba(236, 72, 153, 0.3)' },
  };

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingUpdates();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch resolutions on mount
  useEffect(() => {
    fetchResolutions();
  }, []);

  // Save to localStorage whenever resolutions change
  useEffect(() => {
    if (resolutions.length > 0) {
      storage.set('resolutions', resolutions);
    }
  }, [resolutions]);

  // Save pending updates to localStorage
  useEffect(() => {
    storage.set('pendingUpdates', pendingUpdates);
  }, [pendingUpdates]);

  // Fetch resolutions from Notion (or use cached/demo data)
  const fetchResolutions = async () => {
    setIsLoading(true);
    
    if (!isOnline) {
      setIsLoading(false);
      setSyncStatus('offline');
      return;
    }

    setSyncStatus('syncing');
    const data = await notionService.fetchResolutions();
    
    if (data && data.length > 0) {
      setResolutions(data);
      setSyncStatus('synced');
    } else {
      // If API fails, check if we have cached data
      const cached = storage.get('resolutions');
      if (!cached || cached.length === 0) {
        // Use demo data for first-time users or when API not configured
        setResolutions(getDemoData());
        setSyncStatus('demo');
      } else {
        setSyncStatus('offline');
      }
    }
    
    setIsLoading(false);
  };

  // Sync pending updates when back online
  const syncPendingUpdates = async () => {
    if (pendingUpdates.length === 0) return;
    
    setIsSyncing(true);
    setSyncStatus('syncing');
    
    const failed = [];
    
    for (const update of pendingUpdates) {
      const result = await notionService.updateResolution(update.pageId, update.updates);
      if (!result) {
        failed.push(update);
      }
    }
    
    setPendingUpdates(failed);
    setIsSyncing(false);
    setSyncStatus(failed.length > 0 ? 'error' : 'synced');
    
    // Refresh data after sync
    if (failed.length === 0) {
      fetchResolutions();
    }
  };

  // Demo data for when Notion isn't connected
  const getDemoData = () => [
    { id: 'demo-1', title: 'Read 24 books', category: 'Personal Growth', target: 24, current: 3, unit: 'books', frequency: 'yearly', streak: 12, lastCheckin: '2026-01-05', notionPageId: null },
    { id: 'demo-2', title: 'Exercise 4x per week', category: 'Health', target: 4, current: 3, unit: 'sessions', frequency: 'weekly', streak: 8, lastCheckin: '2026-01-06', notionPageId: null },
    { id: 'demo-3', title: 'Save $10,000', category: 'Finance', target: 10000, current: 850, unit: 'dollars', frequency: 'yearly', streak: 7, lastCheckin: '2026-01-01', notionPageId: null },
    { id: 'demo-4', title: 'Meditate daily', category: 'Wellness', target: 7, current: 7, unit: 'days', frequency: 'weekly', streak: 21, lastCheckin: '2026-01-07', notionPageId: null },
    { id: 'demo-5', title: 'Learn Spanish', category: 'Personal Growth', target: 30, current: 12, unit: 'lessons', frequency: 'monthly', streak: 5, lastCheckin: '2026-01-06', notionPageId: null },
  ];

  // Calculate progress percentage
  const getProgress = (resolution) => Math.min((resolution.current / resolution.target) * 100, 100);

  // Update progress (local + queue for Notion sync)
  const updateProgress = useCallback(async (id, increment) => {
    const resolution = resolutions.find(r => r.id === id);
    if (!resolution) return;
    
    const newCurrent = Math.max(0, resolution.current + increment);
    const today = new Date().toISOString().split('T')[0];
    
    // Update local state immediately
    setResolutions(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, current: newCurrent, lastCheckin: today };
      }
      return r;
    }));
    
    // Update selected resolution if open
    if (selectedResolution?.id === id) {
      setSelectedResolution(prev => ({ ...prev, current: newCurrent, lastCheckin: today }));
    }
    
    // Queue update for Notion sync
    if (resolution.notionPageId) {
      if (isOnline) {
        setSyncStatus('syncing');
        const result = await notionService.updateResolution(resolution.notionPageId, {
          current: newCurrent,
          lastCheckin: today
        });
        setSyncStatus(result ? 'synced' : 'error');
      } else {
        // Queue for later sync
        setPendingUpdates(prev => [...prev, {
          pageId: resolution.notionPageId,
          updates: { current: newCurrent, lastCheckin: today },
          timestamp: Date.now()
        }]);
        setSyncStatus('offline');
      }
    }
  }, [resolutions, selectedResolution, isOnline]);

  // Add new resolution
  const addResolution = async () => {
    if (!newResolution.title.trim()) return;

    const resolution = {
      id: `local-${Date.now()}`,
      ...newResolution,
      current: 0,
      streak: 0,
      lastCheckin: new Date().toISOString().split('T')[0],
      notionPageId: null
    };

    // Add locally first for instant feedback
    setResolutions(prev => [...prev, resolution]);
    setShowAddModal(false);
    setNewResolution({ title: '', category: 'Personal Growth', target: 1, unit: 'times', frequency: 'weekly' });

    // Create in Notion if online
    if (isOnline) {
      setSyncStatus('syncing');
      const result = await notionService.createResolution(resolution);
      if (result?.id) {
        // Refresh from Notion to get the complete data
        await fetchResolutions();
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
        console.error('Failed to create resolution in Notion');
      }
    }
  };

  // Stats calculations
  const totalProgress = resolutions.length > 0 
    ? Math.round(resolutions.reduce((acc, r) => acc + getProgress(r), 0) / resolutions.length)
    : 0;
  const completedCount = resolutions.filter(r => getProgress(r) >= 100).length;
  const maxStreak = resolutions.length > 0 ? Math.max(...resolutions.map(r => r.streak)) : 0;

  // Sync status indicator
  const getSyncStatusDisplay = () => {
    switch (syncStatus) {
      case 'synced': return { color: '#22C55E', text: 'Synced with Notion', icon: '✓' };
      case 'syncing': return { color: '#F59E0B', text: 'Syncing...', icon: '↻' };
      case 'offline': return { color: '#64748B', text: 'Offline mode', icon: '○' };
      case 'error': return { color: '#EF4444', text: 'Sync error', icon: '!' };
      case 'demo': return { color: '#8B5CF6', text: 'Demo mode', icon: '◎' };
      default: return { color: '#64748B', text: 'Unknown', icon: '?' };
    }
  };

  const syncStatusDisplay = getSyncStatusDisplay();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: '#E2E8F0',
      overflowX: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        
        * { 
          box-sizing: border-box; 
          -webkit-tap-highlight-color: transparent;
        }
        
        body { 
          margin: 0; 
          padding: 0;
          overscroll-behavior: none;
        }
        
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        
        .container {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 16px;
        }
        
        @media (min-width: 640px) { .container { padding: 0 24px; } }
        @media (min-width: 1024px) { .container { padding: 0 40px; } }
        
        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .glass-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
        }
        
        @media (min-width: 768px) {
          .glass-card:hover { transform: translateY(-2px); }
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        
        @media (min-width: 768px) {
          .stats-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; }
        }
        
        .resolution-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        
        @media (min-width: 768px) { .resolution-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; } }
        @media (min-width: 1200px) { .resolution-grid { grid-template-columns: repeat(3, 1fr); } }
        
        .btn-primary {
          background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
          border: none;
          padding: 12px 20px;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 14px;
          letter-spacing: 0.2px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
        }
        
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 30px rgba(99, 102, 241, 0.4);
        }
        
        .btn-primary:active { transform: translateY(0); }
        
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .btn-secondary {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 12px 20px;
          border-radius: 12px;
          color: #E2E8F0;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          min-height: 44px;
        }
        
        .btn-secondary:hover { background: rgba(255, 255, 255, 0.1); }
        
        .increment-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: #E2E8F0;
          font-size: 20px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .increment-btn:hover, .increment-btn:active {
          background: rgba(99, 102, 241, 0.2);
          border-color: rgba(99, 102, 241, 0.4);
        }
        
        .mobile-nav {
          display: flex;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding: 8px 16px;
          padding-bottom: calc(8px + env(safe-area-inset-bottom));
          z-index: 100;
        }
        
        @media (min-width: 768px) { .mobile-nav { display: none; } }
        
        .nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px;
          border-radius: 12px;
          background: transparent;
          border: none;
          color: #64748B;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .nav-item.active {
          color: #A5B4FC;
          background: rgba(99, 102, 241, 0.15);
        }
        
        .desktop-nav { display: none; }
        @media (min-width: 768px) { .desktop-nav { display: flex; gap: 8px; } }
        
        .tab-btn {
          padding: 10px 20px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: #64748B;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
        }
        
        .tab-btn.active {
          background: rgba(99, 102, 241, 0.15);
          color: #A5B4FC;
        }
        
        .tab-btn:hover:not(.active) {
          background: rgba(255, 255, 255, 0.05);
          color: #E2E8F0;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 1000;
          padding: 0;
        }
        
        @media (min-width: 640px) {
          .modal-overlay { align-items: center; padding: 20px; }
        }
        
        .modal-content {
          background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px 24px 0 0;
          padding: 24px;
          padding-bottom: calc(24px + env(safe-area-inset-bottom));
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        @media (min-width: 640px) {
          .modal-content { border-radius: 24px; max-width: 480px; padding-bottom: 24px; }
        }
        
        .input-field {
          width: 100%;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: #E2E8F0;
          font-size: 16px;
          transition: all 0.2s ease;
          outline: none;
        }
        
        .input-field:focus {
          border-color: rgba(99, 102, 241, 0.5);
          background: rgba(99, 102, 241, 0.08);
        }
        
        .input-field::placeholder { color: #475569; }
        
        .progress-ring { transform: rotate(-90deg); }
        
        .safe-bottom { padding-bottom: calc(80px + env(safe-area-inset-bottom)); }
        @media (min-width: 768px) { .safe-bottom { padding-bottom: 40px; } }
        
        .detail-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .detail-card {
          background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 28px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .code-block {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 16px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          overflow-x: auto;
          color: #A5B4FC;
          -webkit-overflow-scrolling: touch;
        }
        
        @media (min-width: 640px) { .code-block { font-size: 13px; } }
        
        .integration-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 20px;
          transition: all 0.3s ease;
        }
        
        @media (min-width: 640px) { .integration-card { padding: 24px; border-radius: 20px; } }
        
        .integration-card:hover {
          border-color: rgba(99, 102, 241, 0.2);
          background: rgba(99, 102, 241, 0.03);
        }
        
        .step-number {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366F1, #8B5CF6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
          flex-shrink: 0;
        }
        
        .workflow-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          white-space: nowrap;
        }
        
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-spin { animation: spin 1s linear infinite; }
        
        .loading-skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 12px;
        }
        
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Offline Banner */}
      {!isOnline && (
        <div style={{
          background: 'linear-gradient(90deg, #DC2626, #B91C1C)',
          color: 'white',
          padding: '8px 16px',
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: 500
        }}>
          📴 You're offline. Changes will sync when connected.
          {pendingUpdates.length > 0 && ` (${pendingUpdates.length} pending)`}
        </div>
      )}

      {/* Header */}
      <header style={{
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
        position: 'sticky',
        top: 0,
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #6366F1, #A855F7)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
          }}>
            ◎
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '-0.3px' }}>Resolutions</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ 
                color: syncStatusDisplay.color, 
                fontSize: '14px',
                display: 'inline-flex',
                animation: syncStatus === 'syncing' ? 'spin 1s linear infinite' : 'none'
              }}>
                {syncStatusDisplay.icon}
              </span>
              <span style={{ fontSize: '11px', color: '#64748B' }}>{syncStatusDisplay.text}</span>
            </div>
          </div>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="desktop-nav">
          {['dashboard', 'zapier'].map(tab => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'dashboard' && '📊 Dashboard'}
              {tab === 'zapier' && '⚡ Zapier'}
            </button>
          ))}
        </nav>
        
        <button className="btn-primary" onClick={() => setShowAddModal(true)} style={{ padding: '10px 16px' }}>
          <span style={{ fontSize: '18px' }}>+</span>
          <span className="desktop-nav" style={{ display: 'none' }}>New Goal</span>
        </button>
      </header>

      <main className="container safe-bottom" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
            {/* Stats Row */}
            <div className="stats-grid" style={{ marginBottom: '24px' }}>
              {[
                { label: 'Progress', value: `${totalProgress}%`, color: '#A5B4FC' },
                { label: 'Active', value: resolutions.length, color: '#F59E0B' },
                { label: 'Done', value: completedCount, color: '#22C55E' },
                { label: 'Streak', value: `${maxStreak}d`, color: '#EC4899' },
              ].map((stat, i) => (
                <div key={i} className="glass-card" style={{ padding: '16px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</p>
                  {isLoading ? (
                    <div className="loading-skeleton" style={{ height: '36px', width: '60%' }} />
                  ) : (
                    <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: stat.color }}>{stat.value}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="resolution-grid">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="glass-card" style={{ padding: '20px' }}>
                    <div className="loading-skeleton" style={{ height: '24px', width: '40%', marginBottom: '12px' }} />
                    <div className="loading-skeleton" style={{ height: '20px', width: '70%', marginBottom: '8px' }} />
                    <div className="loading-skeleton" style={{ height: '16px', width: '50%', marginBottom: '16px' }} />
                    <div className="loading-skeleton" style={{ height: '6px', width: '100%', marginBottom: '16px' }} />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div className="loading-skeleton" style={{ height: '44px', width: '44px' }} />
                      <div className="loading-skeleton" style={{ height: '44px', width: '44px' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && resolutions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
                <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 600 }}>No resolutions yet</h3>
                <p style={{ margin: '0 0 24px', color: '#64748B' }}>Add your first resolution to start tracking</p>
                <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                  + Add Resolution
                </button>
              </div>
            )}

            {/* Resolution Cards */}
            {!isLoading && resolutions.length > 0 && (
              <div className="resolution-grid">
                {resolutions.map(resolution => {
                  const progress = getProgress(resolution);
                  const colors = categoryColors[resolution.category] || categoryColors['Personal Growth'];
                  
                  return (
                    <div 
                      key={resolution.id} 
                      className="glass-card" 
                      style={{ padding: '20px', cursor: 'pointer' }}
                      onClick={() => setSelectedResolution(resolution)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '16px',
                              fontSize: '10px',
                              fontWeight: 600,
                              background: colors.bg,
                              color: colors.text,
                              textTransform: 'uppercase',
                              letterSpacing: '0.3px',
                            }}>
                              {resolution.category}
                            </span>
                            {resolution.streak >= 7 && (
                              <span style={{ 
                                padding: '4px 8px', 
                                borderRadius: '16px', 
                                fontSize: '10px', 
                                fontWeight: 600,
                                background: 'rgba(236, 72, 153, 0.15)', 
                                color: '#F472B6' 
                              }}>
                                🔥 {resolution.streak}d
                              </span>
                            )}
                            {!resolution.notionPageId && (
                              <span style={{ 
                                padding: '4px 8px', 
                                borderRadius: '16px', 
                                fontSize: '10px', 
                                fontWeight: 600,
                                background: 'rgba(100, 116, 139, 0.15)', 
                                color: '#94A3B8' 
                              }}>
                                Local
                              </span>
                            )}
                          </div>
                          <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 600, lineHeight: 1.3 }}>{resolution.title}</h3>
                          <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                            {resolution.current} / {resolution.target} {resolution.unit}
                          </p>
                        </div>
                        
                        {/* Circular Progress */}
                        <svg width="56" height="56" viewBox="0 0 56 56" className="progress-ring" style={{ flexShrink: 0 }}>
                          <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                          <circle
                            cx="28" cy="28" r="24"
                            fill="none"
                            stroke={colors.accent}
                            strokeWidth="5"
                            strokeLinecap="round"
                            strokeDasharray={`${progress * 1.508} 150.8`}
                            style={{ filter: `drop-shadow(0 0 6px ${colors.glow})` }}
                          />
                          <text
                            x="28" y="28"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#E2E8F0"
                            fontSize="12"
                            fontWeight="700"
                            style={{ transform: 'rotate(90deg)', transformOrigin: '28px 28px' }}
                          >
                            {Math.round(progress)}%
                          </text>
                        </svg>
                      </div>
                      
                      {/* Progress Bar */}
                      <div style={{
                        height: '6px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        marginBottom: '16px',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${progress}%`,
                          background: `linear-gradient(90deg, ${colors.accent}, ${colors.accent}99)`,
                          borderRadius: '3px',
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                      
                      {/* Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={e => e.stopPropagation()}>
                        <button className="increment-btn" onClick={() => updateProgress(resolution.id, -1)}>−</button>
                        <button className="increment-btn" onClick={() => updateProgress(resolution.id, 1)}>+</button>
                        <span style={{ fontSize: '12px', color: '#475569', marginLeft: 'auto' }}>Tap for details</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Notion Setup Tab */}
        {activeTab === 'notion' && (
          <div style={{ maxWidth: '800px' }}>
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>📝 Notion Setup</h2>
              <p style={{ color: '#94A3B8', fontSize: '15px', lineHeight: 1.6 }}>
                Connect to Notion for structured tracking and sync across devices.
              </p>
            </div>

            {/* Connection Status */}
            <div className="integration-card" style={{ marginBottom: '16px', borderColor: syncStatus === 'synced' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: syncStatus === 'synced' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>
                  {syncStatus === 'synced' ? '✓' : '○'}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
                    {syncStatus === 'synced' ? 'Connected to Notion' : 'Not Connected'}
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
                    {syncStatus === 'synced' 
                      ? 'Your resolutions are syncing with Notion' 
                      : 'Set up the API to enable sync'}
                  </p>
                </div>
                {syncStatus !== 'synced' && (
                  <button 
                    className="btn-secondary" 
                    style={{ marginLeft: 'auto', padding: '8px 16px', fontSize: '13px' }}
                    onClick={fetchResolutions}
                  >
                    Retry Connection
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="integration-card">
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="step-number">1</span>
                  Create Database Schema
                </h3>
                <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '12px' }}>
                  Create a Notion database with these exact column names:
                </p>
                <div className="code-block">
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{`Properties:
• Resolution (Title) - required
• Category (Select): Personal Growth, Health, Finance, Wellness, Career, Relationships
• Target (Number)
• Current Progress (Number)
• Unit (Select): books, sessions, dollars, days, times, lessons
• Frequency (Select): daily, weekly, monthly, yearly
• Streak (Number)
• Last Check-in (Date)`}</pre>
                </div>
              </div>

              <div className="integration-card">
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="step-number">2</span>
                  Create Integration & Get Credentials
                </h3>
                <ol style={{ color: '#94A3B8', lineHeight: 1.8, paddingLeft: '18px', margin: 0, fontSize: '14px' }}>
                  <li>Go to <strong style={{ color: '#E2E8F0' }}>notion.so/my-integrations</strong></li>
                  <li>Click "New integration" → Name it "Resolution Tracker"</li>
                  <li>Copy the <strong style={{ color: '#A5B4FC' }}>Internal Integration Token</strong></li>
                  <li>Open your database → Click "..." → "Add connections"</li>
                  <li>Select your integration</li>
                  <li>Copy the <strong style={{ color: '#A5B4FC' }}>Database ID</strong> from the URL</li>
                </ol>
              </div>

              <div className="integration-card">
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="step-number">3</span>
                  Add to Environment Variables
                </h3>
                <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '12px' }}>
                  Create a <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>.env</code> file in your project root:
                </p>
                <div className="code-block">
                  <pre style={{ margin: 0 }}>{`VITE_NOTION_API_KEY=secret_xxxxxxxxxxxxx
VITE_NOTION_DATABASE_ID=your-database-id`}</pre>
                </div>
              </div>

              <div className="integration-card">
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="step-number">4</span>
                  Deploy API Route (Required)
                </h3>
                <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '12px' }}>
                  Notion's API doesn't allow direct browser requests (CORS). You need a serverless function. Create this file:
                </p>
                <div className="code-block">
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{`// api/notion/resolutions.js (Vercel serverless function)

const NOTION_API = 'https://api.notion.com/v1';

export default async function handler(req, res) {
  const headers = {
    'Authorization': \`Bearer \${process.env.NOTION_API_KEY}\`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };

  // GET - Fetch all resolutions
  if (req.method === 'GET') {
    const response = await fetch(
      \`\${NOTION_API}/databases/\${process.env.NOTION_DATABASE_ID}/query\`,
      { method: 'POST', headers }
    );
    const data = await response.json();
    
    const resolutions = data.results.map(page => ({
      id: page.id,
      notionPageId: page.id,
      title: page.properties['Resolution']?.title[0]?.plain_text || '',
      category: page.properties['Category']?.select?.name || 'Personal Growth',
      target: page.properties['Target']?.number || 0,
      current: page.properties['Current Progress']?.number || 0,
      unit: page.properties['Unit']?.select?.name || 'times',
      frequency: page.properties['Frequency']?.select?.name || 'weekly',
      streak: page.properties['Streak']?.number || 0,
      lastCheckin: page.properties['Last Check-in']?.date?.start || '',
    }));
    
    return res.json(resolutions);
  }

  // PATCH - Update resolution
  if (req.method === 'PATCH') {
    const { pageId, updates } = req.body;
    
    const properties = {};
    if (updates.current !== undefined) {
      properties['Current Progress'] = { number: updates.current };
    }
    if (updates.lastCheckin) {
      properties['Last Check-in'] = { date: { start: updates.lastCheckin } };
    }
    
    const response = await fetch(\`\${NOTION_API}/pages/\${pageId}\`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ properties })
    });
    
    return res.json(await response.json());
  }

  // POST - Create resolution
  if (req.method === 'POST') {
    const data = req.body;
    
    const response = await fetch(\`\${NOTION_API}/pages\`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        parent: { database_id: process.env.NOTION_DATABASE_ID },
        properties: {
          'Resolution': { title: [{ text: { content: data.title } }] },
          'Category': { select: { name: data.category } },
          'Target': { number: data.target },
          'Current Progress': { number: data.current || 0 },
          'Unit': { select: { name: data.unit } },
          'Frequency': { select: { name: data.frequency } },
          'Streak': { number: data.streak || 0 },
          'Last Check-in': { date: { start: data.lastCheckin } },
        }
      })
    });
    
    return res.json(await response.json());
  }

  res.status(405).json({ error: 'Method not allowed' });
}`}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Zapier Tab */}
        {activeTab === 'zapier' && (
          <div style={{ maxWidth: '800px' }}>
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>⚡ Zapier Workflows</h2>
              <p style={{ color: '#94A3B8', fontSize: '15px', lineHeight: 1.6 }}>
                Automate reminders, celebrations, and progress tracking.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { icon: '📱', title: 'Daily Reminders', desc: 'SMS if no check-in today', flow: ['Schedule', 'Notion', 'Twilio'] },
                { icon: '🎉', title: 'Milestones', desc: 'Celebrate 25/50/75/100%', flow: ['Notion', 'Filter', 'Slack'] },
                { icon: '📊', title: 'Weekly Report', desc: 'Email digest Sundays', flow: ['Schedule', 'Notion', 'Gmail'] },
                { icon: '📅', title: 'Calendar Blocks', desc: 'Focus time for lagging goals', flow: ['Notion', 'Filter', 'Calendar'] },
                { icon: '💬', title: 'Text Updates', desc: 'Reply to SMS → Update Notion', flow: ['Twilio', 'Parse', 'Notion'] },
              ].map((workflow, i) => (
                <div key={i} className="integration-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      flexShrink: 0,
                    }}>{workflow.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600 }}>{workflow.title}</h3>
                      <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748B' }}>{workflow.desc}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {workflow.flow.map((step, j) => (
                          <React.Fragment key={j}>
                            <span className="workflow-badge" style={{ 
                              background: j === 0 ? 'rgba(99, 102, 241, 0.15)' : j === workflow.flow.length - 1 ? 'rgba(236, 72, 153, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                              color: j === 0 ? '#A5B4FC' : j === workflow.flow.length - 1 ? '#F472B6' : '#4ADE80',
                            }}>{step}</span>
                            {j < workflow.flow.length - 1 && <span style={{ color: '#475569', fontSize: '12px' }}>→</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        {[
          { id: 'dashboard', icon: '📊', label: 'Dashboard' },
          { id: 'zapier', icon: '⚡', label: 'Zapier' },
        ].map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Add Resolution Modal */}
      {showAddModal && (
        <div className="modal-overlay animate-fadeIn" onClick={() => setShowAddModal(false)}>
          <div className="modal-content animate-slideUp" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>New Resolution</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '24px', cursor: 'pointer', padding: '4px' }}
              >×</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94A3B8' }}>Title</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Read 24 books"
                  value={newResolution.title}
                  onChange={e => setNewResolution({...newResolution, title: e.target.value})}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94A3B8' }}>Category</label>
                <select
                  className="input-field"
                  value={newResolution.category}
                  onChange={e => setNewResolution({...newResolution, category: e.target.value})}
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94A3B8' }}>Target</label>
                  <input
                    type="number"
                    className="input-field"
                    value={newResolution.target}
                    onChange={e => setNewResolution({...newResolution, target: parseInt(e.target.value) || 1})}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94A3B8' }}>Unit</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="books, miles..."
                    value={newResolution.unit}
                    onChange={e => setNewResolution({...newResolution, unit: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94A3B8' }}>Frequency</label>
                <select
                  className="input-field"
                  value={newResolution.frequency}
                  onChange={e => setNewResolution({...newResolution, frequency: e.target.value})}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '24px' }}>
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={addResolution} disabled={!newResolution.title.trim()}>
                Add Goal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolution Detail Modal */}
      {selectedResolution && (
        <div className="detail-overlay animate-fadeIn" onClick={() => setSelectedResolution(null)}>
          <div className="detail-card animate-slideUp" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: (categoryColors[selectedResolution.category] || categoryColors['Personal Growth']).bg,
                    color: (categoryColors[selectedResolution.category] || categoryColors['Personal Growth']).text,
                    textTransform: 'uppercase',
                  }}>
                    {selectedResolution.category}
                  </span>
                  {selectedResolution.notionPageId && (
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '16px', 
                      fontSize: '10px', 
                      fontWeight: 600,
                      background: 'rgba(34, 197, 94, 0.15)', 
                      color: '#4ADE80' 
                    }}>
                      Synced
                    </span>
                  )}
                </div>
                <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 700 }}>{selectedResolution.title}</h2>
                <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>{selectedResolution.frequency} goal</p>
              </div>
              <button 
                onClick={() => setSelectedResolution(null)}
                style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '28px', cursor: 'pointer' }}
              >×</button>
            </div>
            
            {/* Large Progress Display */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <svg width="140" height="140" viewBox="0 0 140 140" className="progress-ring">
                <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                <circle
                  cx="70" cy="70" r="60"
                  fill="none"
                  stroke={(categoryColors[selectedResolution.category] || categoryColors['Personal Growth']).accent}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${getProgress(selectedResolution) * 3.77} 377`}
                  style={{ filter: `drop-shadow(0 0 12px ${(categoryColors[selectedResolution.category] || categoryColors['Personal Growth']).glow})` }}
                />
                <text
                  x="70" y="65"
                  textAnchor="middle"
                  fill="#E2E8F0"
                  fontSize="32"
                  fontWeight="800"
                  style={{ transform: 'rotate(90deg)', transformOrigin: '70px 70px' }}
                >
                  {Math.round(getProgress(selectedResolution))}%
                </text>
                <text
                  x="70" y="88"
                  textAnchor="middle"
                  fill="#64748B"
                  fontSize="13"
                  style={{ transform: 'rotate(90deg)', transformOrigin: '70px 70px' }}
                >
                  complete
                </text>
              </svg>
            </div>
            
            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
              <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>{selectedResolution.current}</p>
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748B' }}>Current</p>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>{selectedResolution.target}</p>
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748B' }}>Target</p>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#F472B6' }}>🔥 {selectedResolution.streak}</p>
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748B' }}>Streak</p>
              </div>
            </div>
            
            {/* Update Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <button 
                className="btn-secondary" 
                style={{ flex: 1, fontSize: '16px' }}
                onClick={() => updateProgress(selectedResolution.id, -1)}
              >
                − Remove
              </button>
              <button 
                className="btn-primary" 
                style={{ flex: 1, fontSize: '16px' }}
                onClick={() => updateProgress(selectedResolution.id, 1)}
              >
                + Add
              </button>
            </div>
            
            <p style={{ margin: 0, textAlign: 'center', fontSize: '12px', color: '#475569' }}>
              Last updated: {selectedResolution.lastCheckin || 'Never'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResolutionTracker;
