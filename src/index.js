import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom'; // Reverted for older React compatibility

// ========================================================================
// WARNING: Placeholder for the WebTorrent Client Setup
// ========================================================================
// This section remains a placeholder. The real implementation requires
// placing the provided source code (webtorrent, bittorrent-tracker, etc.)
// into a 'src/lib'-like structure and using a build tool (Webpack/Vite/Parcel)
// configured with Node.js polyfills to handle the imports and dependencies.
// The 'require' or 'import' calls for the actual client WILL FAIL without this setup.

/*
// --- START: Conceptual Import (Requires Build Tool & src/lib setup) ---
import { WebtorrentClient, Torrent } from './lib-placeholder/webtorrent-internal'; // Adjust path
// --- END: Conceptual Import ---
*/

// --- START: Mock Client for Demonstration ---
const mockTrackerEventTarget = { addListener: () => {}, removeListener: () => {} };
const mockDiscovery = { tracker: { _trackers: [ { announceUrl: 'wss://mock-tracker.com', ...mockTrackerEventTarget } ] } };
const mockTorrentInstance = {
    infoHash: 'MOCK_INFO_HASH_1234567890abcdef',
    magnetURI: 'magnet:?xt=urn:btih:MOCK_INFO_HASH_1234567890abcdef',
    discovery: mockDiscovery,
    addListener: (event, handler) => { console.log(`Mock AddListener: ${event}`); },
    removeListener: (event, handler) => { console.log(`Mock RemoveListener: ${event}`); },
};
const WebtorrentClient = {
    add: async (magnetLink, opts) => { // Make mock async to match real usage
        console.log("Mock WebtorrentClient.add called with:", magnetLink);
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate async
        return mockTorrentInstance;
    },
    remove: (infoHash, cb) => {
        console.log("Mock WebtorrentClient.remove called for:", infoHash);
        setTimeout(() => cb && cb(), 100);
    }
};
// --- END: Mock Client ---

// ========================================================================
// Utility Functions
// ========================================================================

const formatTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  try {
    return new Date(timestamp).toLocaleTimeString();
  } catch (e) {
    return 'Invalid Date';
  }
};

// *** MODIFIED FOR OLDER JS ENVIRONMENTS ***
const getStatusClass = (status) => {
  const lowerStatus = status && typeof status === 'string' ? status.toLowerCase() : ''; // Replaced optional chaining
  switch (lowerStatus) {
    case 'connected': return 'dot-connected';
    case 'connecting': return 'dot-connecting';
    case 'error': return 'dot-error';
    case 'closed':
    case 'destroyed':
      return 'dot-closed';
    default: return 'dot-unknown';
  }
};

const formatPeerId = (id) => {
  if (id && id.length > 12) {
    return id.substring(0, 6) + '...' + id.substring(id.length - 6);
  }
  return id || 'N/A';
};

// ========================================================================
// React Components
// ========================================================================

function TorrentInput({ onStartMonitoring, disabled }) {
  const [torrentId, setTorrentId] = useState('');
  const isValidInput = torrentId.trim().length > 5;

  const handleStart = () => {
    if (isValidInput) {
      onStartMonitoring(torrentId);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && isValidInput) {
        handleStart();
    }
  }

  return (
    <div style={styles.inputContainer}>
      <input
        type="text"
        value={torrentId}
        onChange={(e) => setTorrentId(e.target.value)}
        placeholder="Enter magnet link or info hash"
        onKeyUp={handleKey}
        disabled={disabled}
        aria-label="Torrent Identifier Input"
        style={styles.input}
      />
      <button onClick={handleStart} disabled={!isValidInput || disabled} style={styles.buttonGreen}>
        Start Monitoring
      </button>
    </div>
  );
}

function TrackerList({ trackers }) {
  const trackerEntries = Object.entries(trackers);
  const trackerCount = trackerEntries.length;

  return (
    <div style={styles.listContainer}>
      <h2>Trackers ({trackerCount})</h2>
      {trackerCount > 0 ? (
        <ul>
          {trackerEntries.map(([url, tracker]) => (
            <li key={url} style={styles.listItem}>
              <div>
                <span style={{...styles.statusDot, ...styles[getStatusClass(tracker.status)] }}></span>
                <strong style={styles.url}>{url}</strong>
              </div>
              <div style={styles.details}>
                Status: <span className={tracker.status || 'unknown'}>{tracker.status || 'unknown'}</span>
                {(tracker.status === 'connected' || tracker.peers !== undefined) && (
                    <React.Fragment>
                        {tracker.peers !== undefined && <span style={styles.info}> | Peers: {tracker.peers}</span>}
                        {tracker.seeders !== undefined && <span style={styles.info}> | Seeds: {tracker.seeders}</span>}
                        {tracker.leechers !== undefined && <span style={styles.info}> | Leeches: {tracker.leechers}</span>}
                    </React.Fragment>
                )}
                {tracker.lastUpdated && <span style={styles.info}> | Updated: {formatTime(tracker.lastUpdated)}</span>}
                {tracker.warning && <span style={styles.warning}> | Warning: {tracker.warning}</span>}
                {tracker.error && tracker.status === 'error' && <span style={styles.error}> | Error: {tracker.error}</span>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p style={styles.info}>No trackers found or being monitored.</p>
      )}
    </div>
  );
}

function PeerList({ peers }) {
   const peerEntries = Object.entries(peers);
   const peerCount = peerEntries.length;
   const activePeerCount = peerEntries.filter(([, p]) => p.status === 'connected').length;

  return (
    <div style={styles.listContainer}>
      <h2>Peers ({activePeerCount})</h2>
      {peerCount > 0 ? (
        <ul>
          {peerEntries.map(([peerId, peerInfo]) => (
            <li key={peerId} style={styles.listItem}>
               <div>
                 <span style={{...styles.statusDot, ...styles[getStatusClass(peerInfo.status)] }}></span>
                 <strong style={styles.strong}>ID:</strong> {formatPeerId(peerId)}
               </div>
               <div style={styles.details}>
                 Type: {peerInfo.type || 'N/A'} |
                 Addr: {peerInfo.address || 'N/A'} |
                 Status: <span className={peerInfo.status || 'unknown'}>{peerInfo.status || 'unknown'}</span>
                 {peerInfo.error && peerInfo.status === 'destroyed' && <span style={styles.error}> | {peerInfo.error}</span>}
               </div>
            </li>
          ))}
        </ul>
      ) : (
        <p style={styles.info}>No peers connected or attempting connection.</p>
      )}
    </div>
  );
}


// ========================================================================
// Main Application Component
// ========================================================================

function App() {
  const [monitoringStatus, setMonitoringStatus] = useState('idle');
  const [torrentInstance, setTorrentInstance] = useState(null);
  const [infoHash, setInfoHash] = useState(null);
  const [error, setError] = useState(null);
  const [trackerMap, setTrackerMap] = useState({});
  const [peerMap, setPeerMap] = useState({});
  const listenerCleanupRef = useRef({ torrent: [], discovery: [], trackers: [] });
  const isMountedRef = useRef(true); // Track component mount status

  // Track status without causing re-renders from cleanup/async handlers
  const monitoringStatusRef = useRef(monitoringStatus);
  useEffect(() => {
      monitoringStatusRef.current = monitoringStatus;
  }, [monitoringStatus]);

  // Cleanup listeners on unmount
  useEffect(() => {
      isMountedRef.current = true;
      return () => {
          console.log("App unmounting - running final cleanup");
          isMountedRef.current = false;
          removeAllListeners();
          // If a torrent is active, try to remove it cleanly
          if (torrentInstance) {
              try {
                  WebtorrentClient.remove(torrentInstance.infoHash, () => {
                     console.log(`Torrent ${torrentInstance.infoHash} removed on unmount.`);
                  });
              } catch (e) {
                  console.error("Error removing torrent on unmount:", e);
              }
          }
      };
  }, [torrentInstance]); // Rerun cleanup setup if torrentInstance changes (shouldn't happen here)


  const addListener = useCallback((target, event, handler, type = 'torrent') => {
    if (!target || typeof target.addListener !== 'function' || typeof target.removeListener !== 'function') {
        console.warn(`Target for event "${event}" does not have listener methods.`);
        return;
    }
    console.log(`Attaching listener: ${type} - ${event}`);
    target.addListener(event, handler);
    listenerCleanupRef.current[type].push({ target, event, handler });
  }, []);

  const removeAllListeners = useCallback(() => {
    console.log('Cleaning up listeners...');
    Object.values(listenerCleanupRef.current).flat().forEach(({ target, event, handler }) => {
      if (target && typeof target.removeListener === 'function') {
        console.log(`Removing listener: ${event}`);
        target.removeListener(event, handler);
      }
    });
    listenerCleanupRef.current = { torrent: [], discovery: [], trackers: [] };
  }, []);

  const updateTrackerStatus = useCallback(({ url, status, data = {} }) => {
        if (!isMountedRef.current) return; // Prevent state updates on unmounted component
        setTrackerMap(prevMap => ({
            ...prevMap,
            [url]: {
                ...(prevMap[url] || {}),
                status: status,
                lastUpdated: Date.now(),
                peers: data.peers !== undefined ? data.peers : (prevMap[url]?.peers),
                seeders: data.seeders !== undefined ? data.seeders : (prevMap[url]?.seeders),
                leechers: data.leechers !== undefined ? data.leechers : (prevMap[url]?.leechers),
                warning: data.warning || (status !== 'error' && status !== 'warning' ? null : (prevMap[url]?.warning)), // Clear old warning if status ok
                error: data.error ? (data.error.message || String(data.error)) : (status !== 'error' ? null : (prevMap[url]?.error)) // Clear old error if status ok
            }
        }));
    }, []);

   const updatePeerStatus = useCallback(({ peerId, status, type, address, error }) => {
        if (!isMountedRef.current) return;
        setPeerMap(prevMap => {
            if (prevMap[peerId]?.status === 'destroyed' && status !== 'destroyed') {
                return prevMap;
            }
            return {
                ...prevMap,
                [peerId]: {
                    ...(prevMap[peerId] || {}),
                    status: status,
                    type: type !== undefined ? type : prevMap[peerId]?.type, // Use ?? after babel fix
                    address: address !== undefined ? address : prevMap[peerId]?.address,
                    error: error || null,
                    lastUpdated: Date.now()
                }
            };
        });
   }, []);

    const stopMonitoringInternal = useCallback(() => {
        const currentInstance = torrentInstanceRef.current; // Use ref for closure
        const currentStatus = monitoringStatusRef.current;

        if (!currentInstance || currentStatus === 'stopping' || currentStatus === 'idle') {
            return;
        }
        console.log(`stopMonitoringInternal called for ${currentInstance?.infoHash}`);
        setMonitoringStatus('stopping'); // Update state immediately

        // 1. Remove listeners
        removeAllListeners();

        // 2. Remove torrent from client (async)
        setTimeout(() => {
             try {
                 console.log(`Attempting WebtorrentClient.remove for ${currentInstance.infoHash}`);
                 WebtorrentClient.remove(currentInstance.infoHash, (removeErr) => {
                     if (!isMountedRef.current && !removeErr) { // Check if unmounted during the async remove
                         console.log(`Component unmounted before remove callback for ${currentInstance.infoHash}.`);
                         return; // Don't update state if unmounted
                     }
                     if (removeErr) {
                         console.error(`Error removing torrent ${currentInstance.infoHash}:`, removeErr);
                         if (isMountedRef.current) setError(removeErr.message || String(removeErr));
                     } else {
                         console.log(`Torrent ${currentInstance.infoHash} removed successfully.`);
                     }
                     // Reset state only after removal attempt, and only if still mounted
                     if (isMountedRef.current) {
                         setTorrentInstance(null);
                         setInfoHash(null);
                         setTrackerMap({});
                         setPeerMap({});
                         // Don't reset error if removal failed
                         setMonitoringStatus('idle');
                     }
                 });
             } catch (error) {
                 console.error(`Error initiating removal for torrent ${currentInstance?.infoHash}:`, error);
                 if (isMountedRef.current) {
                     setError(error.message || String(error));
                     setTorrentInstance(null); // Still attempt to clear state
                     setInfoHash(null);
                     setTrackerMap({});
                     setPeerMap({});
                     setMonitoringStatus('error'); // End in error state
                 }
             }
        }, 50); // Small delay

    }, [removeAllListeners]); // torrentInstanceRef used internally


   // Effect for managing the torrent lifecycle and listeners
   const torrentInstanceRef = useRef(torrentInstance); // Ref to access current torrent in cleanup
   useEffect(() => {
       torrentInstanceRef.current = torrentInstance;
       let currentTorrent = torrentInstance;
       if (!currentTorrent) {
           // If torrentInstance becomes null (e.g., after stop), ensure listeners are cleaned.
           // This might be redundant if stopMonitoringInternal is robust, but acts as a safeguard.
           removeAllListeners();
           return;
       }

       console.log(`Effect running for torrent: ${currentTorrent?.infoHash}`);

       // --- Attach Listeners ---
       const handleReady = () => { if (isMountedRef.current) setMonitoringStatus('monitoring'); };
       const handleMetadata = () => {
            if (!isMountedRef.current) return;
            console.log(`Metadata received: ${currentTorrent?.infoHash}`);
            setInfoHash(currentTorrent?.infoHash);
            if (currentTorrent?.discovery?.tracker?._trackers) {
                attachTrackerListeners(currentTorrent.discovery.tracker._trackers);
            }
        };
       const handlePeerConnect = (peerId, wire, remoteAddr) => { updatePeerStatus({ peerId, status: 'connected', type: wire.type, address: remoteAddr }); };
       const handlePeerCreate = (peerId) => { updatePeerStatus({ peerId, status: 'connecting', type: 'unknown' }); };
       const handlePeerDestroy = (peerId, errMessage) => { updatePeerStatus({ peerId, status: 'destroyed', error: errMessage || 'Closed' }); };
       const handleTrackerAnnounce = () => { console.log('Tracker announce completed'); };
       const handleError = (err) => { if (isMountedRef.current) setError(err.message || String(err)); };
       const handleWarning = (warn) => { console.warn('Torrent Warning:', warn); };
       const handleClose = () => {
           console.log('Torrent instance closed event received');
            // Check status ref before resetting
            if (monitoringStatusRef.current !== 'stopping' && monitoringStatusRef.current !== 'idle' && isMountedRef.current) {
                stopMonitoringInternal();
            }
       };

       const attachTrackerListeners = (trackerClients) => {
           // Safety check for older JS (Array.isArray might be needed if supporting very old env)
            if (!trackerClients || typeof trackerClients.forEach !== 'function') return;

           trackerClients.forEach(trackerClient => {
                if (!trackerClient || typeof trackerClient.addListener !== 'function') {
                     console.warn("Invalid tracker client found in discovery:", trackerClient);
                     return;
                }
                const url = trackerClient.announceUrl;
                if (!url) {
                    console.warn("Tracker client missing announceUrl:", trackerClient);
                    return;
                }

                // Use functional update for initial status setting to avoid stale state issues
                setTrackerMap(prev => prev[url] ? prev : {...prev, [url]: { status: 'connecting'}});

                 const onConnect = () => { updateTrackerStatus({ url, status: 'connected' }); };
                 const onClose = () => { updateTrackerStatus({ url, status: 'closed' }); };
                 const onError = (err) => { updateTrackerStatus({ url, status: 'error', data: { error: err } }); };
                 // Extract data safely, provide defaults if properties missing
                 const onUpdate = (data) => { updateTrackerStatus({ url, status: 'connected', data: { peers: (data && data.complete !== undefined ? data.complete : 0) + (data && data.incomplete !== undefined ? data.incomplete : 0), seeders: data?.complete, leechers: data?.incomplete } }); };
                 const onScrape = (data) => { updateTrackerStatus({ url, status: 'connected', data: { peers: (data && data.complete !== undefined ? data.complete : 0) + (data && data.incomplete !== undefined ? data.incomplete : 0), seeders: data?.complete, leechers: data?.incomplete } }); };
                 const onWarning = (warn) => { updateTrackerStatus({ url, data: { warning: (warn && warn.message) || String(warn) } }); }; // Safer warning access

                 addListener(trackerClient, 'socketConnect', onConnect, 'trackers');
                 addListener(trackerClient, 'socketClose', onClose, 'trackers');
                 addListener(trackerClient, 'socketError', onError, 'trackers');
                 addListener(trackerClient, 'update', onUpdate, 'trackers');
                 addListener(trackerClient, 'scrape', onScrape, 'trackers');
                 addListener(trackerClient, 'warning', onWarning, 'trackers');
           });
       };

       const handleDiscoveryStarted = () => {
            console.log('Discovery Started - Attaching Tracker Listeners');
            const trackers = currentTorrent && currentTorrent.discovery && currentTorrent.discovery.tracker && currentTorrent.discovery.tracker._trackers;
            if (!trackers) {
                 console.warn('Cannot access internal trackers for detailed monitoring.');
                 return;
             }
            attachTrackerListeners(trackers);
       };

       // Add Listeners using helper
       addListener(currentTorrent, 'ready', handleReady);
       addListener(currentTorrent, 'metadata', handleMetadata);
       addListener(currentTorrent, 'peerConnect', handlePeerConnect);
       addListener(currentTorrent, 'peerCreate', handlePeerCreate);
       addListener(currentTorrent, 'peerDestroy', handlePeerDestroy);
       addListener(currentTorrent, 'trackerAnnounce', handleTrackerAnnounce);
       addListener(currentTorrent, 'error', handleError);
       addListener(currentTorrent, 'warning', handleWarning);
       addListener(currentTorrent, 'close', handleClose);
       addListener(currentTorrent, 'discoveryStarted', handleDiscoveryStarted, 'discovery');

       // Initial check in case discovery already started
        const initialTrackers = currentTorrent && currentTorrent.discovery && currentTorrent.discovery.tracker && currentTorrent.discovery.tracker._trackers;
       if (initialTrackers) {
           attachTrackerListeners(initialTrackers);
       }

       // --- Effect Cleanup Function ---
       // This function runs when torrentInstance changes (becomes null) or when the component unmounts.
       return () => {
           console.log(`Running EFFECT cleanup for ${currentTorrent?.infoHash}`);
           // Remove listeners added within THIS effect execution
           removeAllListeners();
           // Note: We don't call WebtorrentClient.remove here directly anymore.
           // stopMonitoringInternal handles triggering the removal when the instance is set to null.
       };
   }, [torrentInstance, addListener, removeAllListeners, updatePeerStatus, updateTrackerStatus, stopMonitoringInternal]);


    const handleStartMonitoring = useCallback(async (torrentId) => {
        if (monitoringStatusRef.current !== 'idle' && monitoringStatusRef.current !== 'error') {
            console.warn('Monitoring already active or stopping.');
            return;
        }
        console.log("Attempting to start monitoring:", torrentId);
        setMonitoringStatus('connecting');
        setError(null);
        setInfoHash(null);
        setTrackerMap({});
        setPeerMap({});
        removeAllListeners(); // Clean previous just in case

        try {
            // ** THIS IS THE CORE ** relies on bundled/polyfilled client
            const torrent = await WebtorrentClient.add(torrentId, { path: false });

             if (!torrent || typeof torrent.addListener !== 'function') {
                 throw new Error("Failed to get a valid torrent instance from client.");
             }

            console.log("Torrent added/retrieved:", torrent.infoHash || 'N/A');
             if (isMountedRef.current) { // Check mount status before setting state
                 setInfoHash(torrent.infoHash);
                 setTorrentInstance(torrent); // Triggers the useEffect
             } else {
                 console.warn("Component unmounted before torrent instance could be set.");
                 // Attempt cleanup if unmounted before ready
                  try { WebtorrentClient.remove(torrent.infoHash); } catch(e){}
             }

        } catch (err) {
            console.error('Failed to start monitoring:', err);
             if (isMountedRef.current) {
                 setError(err.message || String(err));
                 setMonitoringStatus('error');
                 setTorrentInstance(null);
                 removeAllListeners();
             }
        }
    }, [removeAllListeners]); // No need for monitoringStatus here if using ref inside

    const handleStopMonitoring = () => {
        stopMonitoringInternal();
    };


  return (
    <div style={styles.appContainer}>
      <h1>WebTorrent Connection Monitor</h1>

      <TorrentInput
        onStartMonitoring={handleStartMonitoring}
        disabled={monitoringStatus === 'connecting' || monitoringStatus === 'stopping'}
      />

      {error && (
        <div style={styles.errorDisplay}>
          <h2>Error</h2>
          <pre>{error}</pre>
        </div>
      )}

      <div style={styles.statusDisplay} className="info">
        <p><strong>Overall Status:</strong> <span className={monitoringStatus}>{monitoringStatus}</span></p>
        {infoHash && <p><strong>Monitoring Info Hash:</strong> {infoHash}</p>}
        {monitoringStatus === 'monitoring' && !infoHash && <p className="connecting">Waiting for metadata...</p>}
        {monitoringStatus === 'connecting' && <p className="connecting">Connecting / Fetching Metadata...</p>}
      </div>

      {(monitoringStatus === 'monitoring' || monitoringStatus === 'connecting' || monitoringStatus === 'stopping') && (
        <div style={styles.monitorSection}>
          <TrackerList trackers={trackerMap} />
          <PeerList peers={peerMap} />

          <button
            onClick={handleStopMonitoring}
            disabled={monitoringStatus === 'stopping' || monitoringStatus === 'idle'}
            style={{ ...styles.button, ...styles.buttonRed }}
          >
            Stop Monitoring
          </button>
        </div>
      )}

      {monitoringStatus === 'idle' && (
         <div style={{...styles.info, marginTop: '30px', textAlign: 'center', fontSize: '1.1em' }}>
            <p>Enter a magnet link or info hash above to begin monitoring.</p>
         </div>
      )}
    </div>
  );
}


// ========================================================================
// Basic Inline Styles
// ========================================================================
const styles = {
  bgDark: '#2c3e50', bgMedium: '#34495e', bgLight: '#3b556f',
  textLight: '#ecf0f1', textMedium: '#bdc3c7', textDark: '#95a5a6',
  accentBlue: '#3498db', accentGreen: '#2ecc71', accentOrange: '#f39c12',
  accentRed: '#e74c3c', borderColor: '#7f8c8d',

  appContainer: { maxWidth: '95%', minWidth: '320px', margin: '20px auto', padding: '20px', backgroundColor: '#34495e', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)' },
  inputContainer: { display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' },
  input: { minWidth: '250px', padding: '10px', border: '1px solid #7f8c8d', borderRadius: '4px', backgroundColor: '#ecf0f1', color: '#2c3e50', fontSize: '1em', flexGrow: 1 },
  button: { padding: '10px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1em', transition: 'background-color 0.2s, opacity 0.2s', color: 'white' },
  buttonGreen: { backgroundColor: '#2ecc71', whiteSpace: 'nowrap' },
  buttonRed: { backgroundColor: '#e74c3c', marginTop: '20px' },
  errorDisplay: { marginTop: '15px', padding: '15px', backgroundColor: 'rgba(231, 76, 60, 0.1)', border: '1px solid #e74c3c', borderRadius: '4px', color: '#e74c3c' },
  statusDisplay: { marginTop: '15px', padding: '10px', backgroundColor: '#3b556f', borderRadius: '4px', color: '#bdc3c7' },
  monitorSection: { marginTop: '25px', paddingTop: '15px', borderTop: '1px solid #7f8c8d' },
  listContainer: { marginTop: '20px' },
  listItem: { backgroundColor: '#3b556f', padding: '8px 12px', borderRadius: '4px', marginBottom: '8px', fontSize: '0.9em', wordBreak: 'break-all', border: '1px solid #4a6a8a', display: 'flex', flexDirection: 'column', gap: '5px' },
  details: { fontSize: '0.9em', color: '#bdc3c7', paddingLeft: '16px' },
  strong: { color: '#ecf0f1' },
  url: { wordBreak: 'break-all', color: '#ecf0f1' },
  statusDot: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', marginRight: '6px', verticalAlign: 'middle' },
  'dot-connected': { backgroundColor: '#2ecc71' },
  'dot-connecting': { backgroundColor: '#3498db', animation: 'pulse 1.5s infinite ease-in-out' },
  'dot-error': { backgroundColor: '#e74c3c' },
  'dot-closed': { backgroundColor: '#95a5a6' },
  'dot-destroyed': { backgroundColor: '#95a5a6' },
  'dot-unknown': { backgroundColor: '#7f8c8d' },
  info: { color: '#95a5a6' },
  warning: { color: '#f39c12' },
  error: { color: '#e74c3c' },
};

// ========================================================================
// Render the App
// ========================================================================
const rootElement = document.getElementById('root');
if (rootElement) {
  // Use legacy ReactDOM.render for compatibility with older React versions
  ReactDOM.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    rootElement
  );
} else {
  console.error('Root element #root not found in the HTML.');
}

// ========================================================================
// Inject CSS Keyframes and Class Styles
// ========================================================================
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
  @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
  .connected { color: ${styles.accentGreen}; }
  .connecting { color: ${styles.accentBlue}; }
  .error { color: ${styles.accentRed}; }
  .closed, .destroyed { color: ${styles.textDark}; }
  .warning { color: ${styles.accentOrange}; }
  .unknown { color: ${styles.textDark}; } /* Style for unknown status */
  button:hover:not(:disabled) { opacity: 0.8; }
  button:disabled { opacity: 0.5; cursor: not-allowed !important; }
  /* Responsive input container */
  @media (max-width: 500px) {
    div[style*="inputContainer"] input { width: 100%; margin-bottom: 10px; }
    div[style*="inputContainer"] button { width: 100%; }
    div[style*="inputContainer"] { gap: 0; }
  }
`;
document.head.appendChild(styleSheet);
