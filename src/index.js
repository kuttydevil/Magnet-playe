import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client'; // Use createRoot for React 18+

// ========================================================================
// WARNING: Placeholder for the WebTorrent Client Setup
// ========================================================================
// This is the most critical part. In a real setup, this import MUST
// resolve to a file (like the 'webtorrent-internal.js' from the Vue example)
// that correctly initializes the WebTorrent client using the EXACT source
// code provided in your JSON, likely placed in a 'src/lib' directory and
// processed by a build tool (Webpack/Vite) with Node.js polyfills.
// The 'require' calls below WILL FAIL without a proper build environment.

/*
// --- START: Conceptual Import (Requires Build Tool & src/lib setup) ---
import { WebtorrentClient, Torrent } from './lib-placeholder/webtorrent-internal'; // Adjust path based on actual setup
// --- END: Conceptual Import ---
*/

// --- START: Mock Client for Demonstration ---
// Using mocks so the React structure runs without the real libs/build tool
const mockTrackerEventTarget = { addListener: () => {}, removeListener: () => {} };
const mockDiscovery = { tracker: { _trackers: [ { announceUrl: 'wss://mock-tracker.com', ...mockTrackerEventTarget } ] } };
const mockTorrentInstance = {
    infoHash: 'MOCK_INFO_HASH_1234567890abcdef',
    magnetURI: 'magnet:?xt=urn:btih:MOCK_INFO_HASH_1234567890abcdef',
    discovery: mockDiscovery,
    // Mock event emitter methods
    addListener: (event, handler) => { console.log(`Mock AddListener: ${event}`); },
    removeListener: (event, handler) => { console.log(`Mock RemoveListener: ${event}`); },
    // Add other methods/properties used by listeners if needed for demo
};
const WebtorrentClient = {
    add: (magnetLink, opts) => {
        console.log("Mock WebtorrentClient.add called with:", magnetLink);
        // Return a mock torrent instance after a delay
        return new Promise(resolve => setTimeout(() => resolve(mockTorrentInstance), 500));
    },
    remove: (infoHash, cb) => {
        console.log("Mock WebtorrentClient.remove called for:", infoHash);
        setTimeout(() => cb && cb(), 100); // Simulate async removal
    }
};
// --- END: Mock Client ---


// ========================================================================
// Utility Functions (Can be moved to separate file in real app)
// ========================================================================

const formatTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  try {
    return new Date(timestamp).toLocaleTimeString();
  } catch (e) {
    return 'Invalid Date';
  }
};

const getStatusClass = (status) => {
  switch (status?.toLowerCase()) {
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
// React Components (Can be moved to separate files in real app)
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
                Status: <span className={tracker.status}>{tracker.status}</span>
                {(tracker.status === 'connected' || tracker.peers !== undefined) && (
                    <>
                        {tracker.peers !== undefined && <span style={styles.info}> | Peers: {tracker.peers}</span>}
                        {tracker.seeders !== undefined && <span style={styles.info}> | Seeds: {tracker.seeders}</span>}
                        {tracker.leechers !== undefined && <span style={styles.info}> | Leeches: {tracker.leechers}</span>}
                    </>
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
                 Status: <span className={peerInfo.status}>{peerInfo.status}</span>
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
// Main Application Component (Equivalent to Vue App/Store Logic)
// ========================================================================

function App() {
  const [monitoringStatus, setMonitoringStatus] = useState('idle'); // idle, connecting, monitoring, stopping, error
  const [torrentInstance, setTorrentInstance] = useState(null);
  const [infoHash, setInfoHash] = useState(null);
  const [error, setError] = useState(null);
  const [trackerMap, setTrackerMap] = useState({});
  const [peerMap, setPeerMap] = useState({});

  // Ref to store listener cleanup functions, similar to Vuex state management
  const listenerCleanupRef = useRef({ torrent: [], discovery: [], trackers: [] });

  // Helper to add listener and store cleanup
  const addListener = useCallback((target, event, handler, type = 'torrent') => {
    if (!target || typeof target.addListener !== 'function' || typeof target.removeListener !== 'function') {
        console.warn(`Target for event "${event}" does not have listener methods.`);
        return;
    }
    console.log(`Attaching listener: ${type} - ${event}`);
    target.addListener(event, handler);
    listenerCleanupRef.current[type].push({ target, event, handler });
  }, []); // No dependencies needed for the helper itself

  // Cleanup function
  const removeAllListeners = useCallback(() => {
    console.log('Cleaning up listeners...');
    Object.values(listenerCleanupRef.current).flat().forEach(({ target, event, handler }) => {
      if (target && typeof target.removeListener === 'function') {
        console.log(`Removing listener: ${event}`);
        target.removeListener(event, handler);
      }
    });
    listenerCleanupRef.current = { torrent: [], discovery: [], trackers: [] };
  }, []); // No dependencies needed for the cleanup function itself

  // --- State Update Callbacks (Equivalent to Vuex Mutations) ---
   const updateTrackerStatus = useCallback(({ url, status, data = {} }) => {
        setTrackerMap(prevMap => ({
            ...prevMap,
            [url]: {
                ...(prevMap[url] || {}),
                status: status,
                lastUpdated: Date.now(),
                ...data,
                warning: data.warning || (status === 'error' ? (data.error?.message || 'Unknown Error') : (prevMap[url]?.warning || null)), // Keep warning unless overridden or status changes from error
                error: data.error ? (data.error.message || String(data.error)) : (status !== 'error' ? null : (prevMap[url]?.error || null)) // Set error or clear if status not error
            }
        }));
    }, []);

   const updatePeerStatus = useCallback(({ peerId, status, type, address, error }) => {
      setPeerMap(prevMap => {
          // Prevent overwriting 'destroyed' unless the new status is 'destroyed'
          if (prevMap[peerId]?.status === 'destroyed' && status !== 'destroyed') {
              return prevMap;
          }
          return {
            ...prevMap,
            [peerId]: {
              ...(prevMap[peerId] || {}),
              status: status,
              type: type ?? prevMap[peerId]?.type,
              address: address ?? prevMap[peerId]?.address,
              error: error || null,
              lastUpdated: Date.now()
            }
          };
      });
   }, []);

   // --- Monitoring Logic Effect ---
   useEffect(() => {
       let currentTorrent = torrentInstance; // Capture instance for cleanup closure
       if (!currentTorrent) {
           return; // Not monitoring anything
       }

       // --- Attach Listeners using the helper ---
       const handleReady = () => {
           console.log(`Torrent ready: ${currentTorrent?.infoHash}`);
           setMonitoringStatus('monitoring');
       };
       const handleMetadata = () => {
           console.log(`Metadata received: ${currentTorrent?.infoHash}`);
           setInfoHash(currentTorrent?.infoHash); // Update infohash if received later
            // Re-attach tracker listeners potentially
           if (currentTorrent?.discovery?.tracker?._trackers) {
                attachTrackerListeners(currentTorrent.discovery.tracker._trackers);
           }
       };
       const handlePeerConnect = (peerId, wire, remoteAddr) => {
           console.log('Peer Connected:', peerId, wire.type, remoteAddr);
           updatePeerStatus({ peerId, status: 'connected', type: wire.type, address: remoteAddr });
       };
        const handlePeerCreate = (peerId) => {
            console.log('Peer Created:', peerId);
            updatePeerStatus({ peerId, status: 'connecting', type: 'unknown' });
        };
       const handlePeerDestroy = (peerId, errMessage) => {
           console.log('Peer Destroyed:', peerId, errMessage);
            updatePeerStatus({ peerId, status: 'destroyed', error: errMessage || 'Closed' });
       };
       const handleTrackerAnnounce = () => {
           console.log('Tracker announce completed (some tracker)');
       };
       const handleError = (err) => {
           console.error('Torrent Error:', err);
           setError(err.message || String(err));
           // Optionally setMonitoringStatus('error'); depending on severity
       };
       const handleWarning = (warn) => {
           console.warn('Torrent Warning:', warn);
           // Potentially display warnings
       };
        const handleClose = () => {
            console.log('Torrent instance closed');
            // Check status before resetting to avoid race conditions if stopped manually
             if (monitoringStatusRef.current !== 'stopping' && monitoringStatusRef.current !== 'idle') {
                 stopMonitoringInternal(); // Trigger cleanup
             }
        };

        const attachTrackerListeners = (trackerClients) => {
            if (!Array.isArray(trackerClients)) return;

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

                // Initial status if not already set
                 setTrackerMap(prev => prev[url] ? prev : {...prev, [url]: { status: 'connecting'}});

                 const onConnect = () => { updateTrackerStatus({ url, status: 'connected' }); };
                 const onClose = () => { updateTrackerStatus({ url, status: 'closed' }); };
                 const onError = (err) => { updateTrackerStatus({ url, status: 'error', data: { error: err } }); };
                 const onUpdate = (data) => { updateTrackerStatus({ url, status: 'connected', data: { peers: (data?.complete ?? 0) + (data?.incomplete ?? 0), seeders: data?.complete, leechers: data?.incomplete } }); };
                 const onScrape = (data) => { updateTrackerStatus({ url, status: 'connected', data: { peers: (data?.complete ?? 0) + (data?.incomplete ?? 0), seeders: data?.complete, leechers: data?.incomplete } }); };
                 const onWarning = (warn) => { updateTrackerStatus({ url, data: { warning: warn?.message || String(warn) } }); };

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
             if (!currentTorrent?.discovery?.tracker?._trackers) {
                 console.warn('Cannot access internal trackers for detailed monitoring.');
                 return;
             }
            attachTrackerListeners(currentTorrent.discovery.tracker._trackers);
       };

       // Add Torrent Listeners
       addListener(currentTorrent, 'ready', handleReady);
       addListener(currentTorrent, 'metadata', handleMetadata);
       addListener(currentTorrent, 'peerConnect', handlePeerConnect);
        addListener(currentTorrent, 'peerCreate', handlePeerCreate);
       addListener(currentTorrent, 'peerDestroy', handlePeerDestroy);
       addListener(currentTorrent, 'trackerAnnounce', handleTrackerAnnounce);
       addListener(currentTorrent, 'error', handleError);
       addListener(currentTorrent, 'warning', handleWarning);
        addListener(currentTorrent, 'close', handleClose);

       // Add Discovery Listener (which attaches tracker listeners)
       addListener(currentTorrent, 'discoveryStarted', handleDiscoveryStarted, 'discovery');

       // Initial check in case discovery already started before listener attached
       if (currentTorrent?.discovery?.tracker?._trackers) {
           attachTrackerListeners(currentTorrent.discovery.tracker._trackers);
       }

       // --- Cleanup Function ---
       return () => {
           console.log(`Running cleanup for ${currentTorrent?.infoHash}`);
           removeAllListeners(); // Remove listeners added by addListener helper

           if (currentTorrent) {
               try {
                   // Use a timeout to decouple removal from potential state updates during cleanup
                   setTimeout(() => {
                       console.log(`Attempting WebtorrentClient.remove for ${currentTorrent.infoHash}`);
                       WebtorrentClient.remove(currentTorrent.infoHash, (removeErr) => {
                           if (removeErr) {
                               console.error(`Error removing torrent ${currentTorrent.infoHash} during cleanup:`, removeErr);
                           } else {
                               console.log(`Torrent ${currentTorrent.infoHash} removed by cleanup.`);
                           }
                       });
                   }, 50); // Short delay
               } catch (cleanupError) {
                   console.error(`Error initiating torrent removal during cleanup for ${currentTorrent?.infoHash}:`, cleanupError);
               }
           }
           // Reset state AFTER initiating removal/cleanup
           setTorrentInstance(null);
           setInfoHash(null);
           setTrackerMap({});
           setPeerMap({});
           setError(null);
            // Avoid setting status back to 'idle' immediately if an error caused the stop
            if (monitoringStatusRef.current !== 'error') {
                 setMonitoringStatus('idle');
            }
       };
   }, [torrentInstance, addListener, removeAllListeners, updatePeerStatus, updateTrackerStatus]); // Effect dependencies

    // --- Actions ---
    const handleStartMonitoring = useCallback(async (torrentId) => {
        if (monitoringStatus !== 'idle' && monitoringStatus !== 'error') {
            console.warn('Monitoring already active or stopping.');
            return;
        }
        console.log("Attempting to start monitoring:", torrentId);
        setMonitoringStatus('connecting');
        setError(null);
        setInfoHash(null); // Clear old hash
        setTrackerMap({});
        setPeerMap({});
        removeAllListeners(); // Clean previous listeners just in case

        try {
            // This relies on the placeholder/mock or a REAL bundled WebtorrentClient
            const torrent = await WebtorrentClient.add(torrentId, { path: false }); // path: false might prevent storage use

             if (!torrent || typeof torrent.addListener !== 'function') {
                 throw new Error("Failed to get a valid torrent instance from client.");
             }

            console.log("Torrent added/retrieved:", torrent.infoHash || 'N/A');
            setInfoHash(torrent.infoHash);
            setTorrentInstance(torrent); // This will trigger the useEffect
            // Status set to 'monitoring' inside useEffect's 'ready' handler

        } catch (err) {
            console.error('Failed to start monitoring:', err);
            setError(err.message || String(err));
            setMonitoringStatus('error');
            setTorrentInstance(null); // Ensure no stale instance
            removeAllListeners(); // Cleanup failed attempt
        }
    }, [monitoringStatus, removeAllListeners]); // Include monitoringStatus to prevent starting while stopping etc.

     // Ref to keep track of status inside cleanup without adding status to useEffect deps
     const monitoringStatusRef = useRef(monitoringStatus);
     useEffect(() => {
         monitoringStatusRef.current = monitoringStatus;
     }, [monitoringStatus]);

     const stopMonitoringInternal = useCallback(() => {
          if (!torrentInstance || monitoringStatus === 'stopping' || monitoringStatus === 'idle') {
            return;
          }
          console.log(`stopMonitoringInternal called for ${torrentInstance?.infoHash}`);
          setMonitoringStatus('stopping');
          // The actual cleanup (listener removal, client.remove) happens
          // in the useEffect's *return* function when torrentInstance becomes null.
          setTorrentInstance(null); // Trigger the useEffect cleanup
         // Reset status to idle is now handled within the cleanup effect return function
     }, [torrentInstance, monitoringStatus]);

    const handleStopMonitoring = () => {
        stopMonitoringInternal();
    };


  // --- Render ---
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
        {monitoringStatus === 'connecting' && <p>Connecting / Fetching Metadata...</p>}
      </div>

      {monitoringStatus !== 'idle' && monitoringStatus !== 'error' && (
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

      {/* Debugging Output - Optional */}
      {/* <details>
          <summary>Debug State</summary>
          <pre style={{fontSize: '10px'}}>
              Status: {monitoringStatus}{'\n'}
              InfoHash: {infoHash}{'\n'}
              Error: {error}{'\n'}
              Trackers: {JSON.stringify(trackerMap, null, 2)}{'\n'}
              Peers: {JSON.stringify(peerMap, null, 2)}{'\n'}
          </pre>
      </details> */}

    </div>
  );
}


// ========================================================================
// Basic Inline Styles (Move to CSS file/modules in real app)
// ========================================================================
const styles = {
  // Colors (based on public/index.html)
  bgDark: '#2c3e50',
  bgMedium: '#34495e',
  bgLight: '#3b556f',
  textLight: '#ecf0f1',
  textMedium: '#bdc3c7',
  textDark: '#95a5a6',
  accentBlue: '#3498db',
  accentGreen: '#2ecc71',
  accentOrange: '#f39c12',
  accentRed: '#e74c3c',
  borderColor: '#7f8c8d',

  // Element Styles
  appContainer: {
    maxWidth: '95%',
    minWidth: '320px',
    margin: '20px auto',
    padding: '20px',
    backgroundColor: '#34495e', // bgMedium
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
  },
  inputContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  input: {
    minWidth: '250px',
    padding: '10px',
    border: '1px solid #7f8c8d', // borderColor
    borderRadius: '4px',
    backgroundColor: '#ecf0f1', // textLight
    color: '#2c3e50', // bgDark
    fontSize: '1em',
    flexGrow: 1,
  },
  button: {
    padding: '10px 15px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1em',
    transition: 'background-color 0.2s, opacity 0.2s',
    color: 'white',
  },
  buttonGreen: {
     backgroundColor: '#2ecc71', // accentGreen
     whiteSpace: 'nowrap',
  },
   buttonRed: {
     backgroundColor: '#e74c3c', // accentRed
     marginTop: '20px',
   },
  errorDisplay: {
    marginTop: '15px',
    padding: '15px',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    border: '1px solid #e74c3c', // accentRed
    borderRadius: '4px',
    color: '#e74c3c', // accentRed
  },
  statusDisplay: {
    marginTop: '15px',
    padding: '10px',
    backgroundColor: '#3b556f', // bgLight
    borderRadius: '4px',
    color: '#bdc3c7', // textMedium
  },
   monitorSection: {
      marginTop: '25px',
      paddingTop: '15px',
      borderTop: '1px solid #7f8c8d', // borderColor
    },
  listContainer: {
    marginTop: '20px',
  },
  listItem: {
    backgroundColor: '#3b556f', // bgLight
    padding: '8px 12px',
    borderRadius: '4px',
    marginBottom: '8px',
    fontSize: '0.9em',
    wordBreak: 'break-all',
    border: '1px solid #4a6a8a',
     display: 'flex',
     flexDirection: 'column',
     gap: '5px',
  },
  details: {
     fontSize: '0.9em',
     color: '#bdc3c7', // textMedium
     paddingLeft: '16px',
   },
   strong: {
     color: '#ecf0f1', // textLight
   },
   url: {
        wordBreak: 'break-all',
        color: '#ecf0f1', // textLight
   },
  statusDot: {
    display: 'inline-block',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    marginRight: '6px',
    verticalAlign: 'middle',
  },
  // Dot colors - MUST match CSS in index.html or a separate CSS file
  'dot-connected': { backgroundColor: '#2ecc71' },
  'dot-connecting': { backgroundColor: '#3498db', animation: 'pulse 1.5s infinite ease-in-out' }, // requires @keyframes pulse
  'dot-error': { backgroundColor: '#e74c3c' },
  'dot-closed': { backgroundColor: '#95a5a6' },
  'dot-destroyed': { backgroundColor: '#95a5a6' }, // same as closed
  'dot-unknown': { backgroundColor: '#7f8c8d' },

  // Text colors - use className for these in JSX
  info: { color: '#95a5a6' }, // textDark
  warning: { color: '#f39c12' }, // accentOrange
  error: { color: '#e74c3c' }, // accentRed
};


// ========================================================================
// Render the App
// ========================================================================

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('Root element #root not found in the HTML.');
}


// ========================================================================
// Add Keyframes for Pulse Animation (needed for dot-connecting)
// ========================================================================
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.4; }
    100% { opacity: 1; }
  }

  // Add class styles matching the 'styles' object for status text colors
  .connected { color: ${styles.accentGreen}; }
  .connecting { color: ${styles.accentBlue}; }
  .error { color: ${styles.accentRed}; }
  .closed, .destroyed { color: ${styles.textDark}; }
  .warning { color: ${styles.accentOrange}; }

  // Fix button hover/disabled styles (inline styles don't support pseudo-classes)
  button:hover:not(:disabled) { opacity: 0.8; }
  button:disabled { opacity: 0.5; cursor: not-allowed !important; }
`;
document.head.appendChild(styleSheet);


// Export the App component if this file were part of a larger module system
// export default App; // Not needed for direct rendering in a single file context
