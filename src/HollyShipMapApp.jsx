import { useEffect, useMemo, useRef, useState } from 'react';

const STATUS_POINTS = {
  IN_TRANSIT: 25,
  DELIVERED: 50,
};

const REWARDS = [
  { id: 1, name: '5% Off Code', points: 100, code: 'HOLLY5' },
  { id: 2, name: '10% Off Code', points: 250, code: 'HOLLY10' },
  { id: 3, name: '15% Off Code', points: 500, code: 'HOLLY15' },
  { id: 4, name: 'Free Shipping', points: 1000, code: 'HOLLYSHIP' },
];

function canonicalToUiStatus(canonicalStatus) {
  if (!canonicalStatus) return 'PENDING';
  if (canonicalStatus === 'CREATED') return 'PENDING';
  return canonicalStatus;
}

function uiToCanonicalStatus(uiStatus) {
  if (uiStatus === 'PENDING') return 'CREATED';
  return uiStatus;
}

function statusToProgress(uiStatus) {
  switch (uiStatus) {
    case 'PENDING':
      return 10;
    case 'IN_TRANSIT':
      return 50;
    case 'OUT_FOR_DELIVERY':
      return 85;
    case 'DELIVERED':
      return 100;
    default:
      return 10;
  }
}

function statusBadgeClass(uiStatus) {
  switch (uiStatus) {
    case 'PENDING':
      return 'status-pending';
    case 'IN_TRANSIT':
      return 'status-transit';
    case 'OUT_FOR_DELIVERY':
      return 'status-transit';
    case 'DELIVERED':
      return 'status-delivered';
    default:
      return 'status-pending';
  }
}

function formatStatus(uiStatus) {
  return String(uiStatus).replace(/_/g, ' ');
}

const AUTH_STORAGE_KEY = 'hollyship:auth';
const PROVIDER_ID_PREFIX = 'hollyship:provider-id-';

function loadStoredAuth() {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    return {
      userId: parsed?.userId ?? null,
      email: parsed?.email ?? null,
      token: parsed?.token ?? null,
      expiresAt: parsed?.expiresAt ?? null,
    };
  } catch {
    return null;
  }
}

function persistAuth(auth) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

function clearStoredAuth() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

function getProviderStorageKey(provider) {
  return `${PROVIDER_ID_PREFIX}${provider}`;
}

function getOrCreateProviderId(provider) {
  if (typeof window === 'undefined') {
    return `${provider}-${Date.now()}`;
  }

  const key = getProviderStorageKey(provider);
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const generated = `${provider}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  window.localStorage.setItem(key, generated);
  return generated;
}

function nextUiStatus(current) {
  switch (current) {
    case 'PENDING':
      return 'IN_TRANSIT';
    case 'IN_TRANSIT':
      return 'OUT_FOR_DELIVERY';
    case 'OUT_FOR_DELIVERY':
      return 'DELIVERED';
    case 'DELIVERED':
    default:
      return 'DELIVERED';
  }
}

function computeEstimatedDelivery(uiStatus, etaIso) {
  if (uiStatus === 'DELIVERED') return 'Delivered ✓';
  if (etaIso) {
    const d = new Date(etaIso);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  const days = uiStatus === 'PENDING' ? 4 : uiStatus === 'IN_TRANSIT' ? 3 : 2;
  return new Date(Date.now() + 86400000 * days).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function HollyShipMapApp() {
  const [packages, setPackages] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState(null);

  const [authUser, setAuthUser] = useState({ userId: null, email: null, token: null, expiresAt: null });
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loyaltyTier, setLoyaltyTier] = useState(null);

  const mapCanvasRef = useRef(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [destination, setDestination] = useState('');

  const [confirmDeleteById, setConfirmDeleteById] = useState({});

  const [confetti, setConfetti] = useState([]);
  const [earnedPopup, setEarnedPopup] = useState(null);

  const [fireworks, setFireworks] = useState([]);

  const popupTimerRef = useRef(null);
  const confettiTimerRef = useRef(null);
  const fireworksTimerRef = useRef(null);

  // Pickup optimization modal state
  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
  const [pickupOrigin, setPickupOrigin] = useState('');
  const [pickupDestination, setPickupDestination] = useState('');
  const [pickupOptimizing, setPickupOptimizing] = useState(false);
  const [pickupResults, setPickupResults] = useState(null);

  const totalPoints = loyaltyPoints;
  const isAuthenticated = Boolean(authUser.userId);

  function withAuthHeaders(headers) {
    const next = headers instanceof Headers ? new Headers(headers) : { ...(headers || {}) };
    if (authUser.token) {
      if (next instanceof Headers) next.set('authorization', `Bearer ${authUser.token}`);
      else next.authorization = `Bearer ${authUser.token}`;
    }
    return next;
  }

  async function apiFetch(url, options) {
    const opts = options || {};
    const headers = withAuthHeaders(opts.headers);
    return fetch(url, { ...opts, headers });
  }

  const nextReward = useMemo(() => {
    return REWARDS.find((r) => totalPoints < r.points) ?? null;
  }, [totalPoints]);

  const progressPercent = useMemo(() => {
    if (!nextReward) return 100;
    return Math.min(100, Math.max(0, (totalPoints / nextReward.points) * 100));
  }, [totalPoints, nextReward]);

  const progressText = useMemo(() => {
    if (!nextReward) return 'Max Level!';
    return `${totalPoints}/${nextReward.points}`;
  }, [totalPoints, nextReward]);

  function createConfetti() {
    const colors = ['#FFD700', '#FFA500', '#FF6347', '#4facfe', '#00f2fe'];
    const pieces = Array.from({ length: 50 }).map((_, i) => ({
      id: `${Date.now()}-${i}`,
      left: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)] ?? '#FFD700',
      delay: Math.random() * 0.5,
    }));

    setConfetti(pieces);

    if (confettiTimerRef.current) window.clearTimeout(confettiTimerRef.current);
    confettiTimerRef.current = window.setTimeout(() => setConfetti([]), 3200);
  }

  function createFireworks() {
    const colors = ['#FFD700', '#FFA500', '#FF6347', '#4facfe', '#00f2fe', '#18C37E'];
    const bursts = Array.from({ length: 4 }).map((_, b) => ({
      left: 20 + Math.random() * 60,
      top: 15 + Math.random() * 45,
      color: colors[Math.floor(Math.random() * colors.length)] ?? '#FFD700',
      burst: b,
    }));

    const sparks = bursts.flatMap((burst, burstIdx) => {
      const count = 14;
      const baseDelay = burstIdx * 0.15;
      return Array.from({ length: count }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / count;
        const distance = 70 + Math.random() * 90;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        return {
          id: `${Date.now()}-${burstIdx}-${i}`,
          left: burst.left,
          top: burst.top,
          dx,
          dy,
          color: burst.color,
          delay: baseDelay + Math.random() * 0.15,
        };
      });
    });

    setFireworks(sparks);
    if (fireworksTimerRef.current) window.clearTimeout(fireworksTimerRef.current);
    fireworksTimerRef.current = window.setTimeout(() => setFireworks([]), 1800);
  }

  function showPointsEarned(points, uiStatus) {
    setEarnedPopup({ points, uiStatus, id: `${Date.now()}` });
    if (uiStatus === 'DELIVERED') createFireworks();
    else createConfetti();

    if (popupTimerRef.current) window.clearTimeout(popupTimerRef.current);
    popupTimerRef.current = window.setTimeout(() => setEarnedPopup(null), 3000);
  }

  async function fetchLoyalty(targetUserId) {
    const id = targetUserId;
    if (!id) return;

    try {
      const resp = await apiFetch(`/v1/users/${id}/loyalty`);
      if (!resp.ok) return;
      const data = await resp.json();
      setLoyaltyPoints(Number.isFinite(data?.points) ? data.points : 0);
      setLoyaltyTier(typeof data?.tier === 'string' ? data.tier : null);
    } catch {
      // ignore: backend may be down
    }
  }

  async function fetchPackages() {
    if (!authUser.userId) return;

    try {
      const params = new URLSearchParams();
      params.set('limit', '100');

      // Backward compatibility:
      // - New auth uses bearer token (server derives userId)
      // - Old stored auth may only have userId
      if (!authUser.token) params.set('userId', authUser.userId);

      const resp = await apiFetch(`/v1/shipments?${params.toString()}`);
      if (!resp.ok) return;
      const data = await resp.json();
      const items = Array.isArray(data?.items) ? data.items : [];

      const mapped = items.map((s) => {
        const uiStatus = canonicalToUiStatus(s.status);
        const events = Array.isArray(s.events) ? s.events : [];
        const lastLocation = events.find((e) => e?.location)?.location ?? s.origin ?? '—';

        return {
          __backendId: s.id,
          trackingNumber: String(s.trackingNumber || '').toUpperCase(),
          carrier: s.carrier || '—',
          status: uiStatus,
          progress: statusToProgress(uiStatus),
          currentLocation: lastLocation,
          destination: s.destination || '—',
          estimatedDelivery: computeEstimatedDelivery(uiStatus, s.eta),
          etaConfidence: s.etaConfidence ?? null,
          originLat: s.originLat ?? null,
          originLng: s.originLng ?? null,
          destinationLat: s.destinationLat ?? null,
          destinationLng: s.destinationLng ?? null,
          currentLat: s.currentLat ?? null,
          currentLng: s.currentLng ?? null,
        };
      });

      setPackages(mapped);
      setSelectedPackageId((prev) => {
        if (prev && mapped.some((p) => p.__backendId === prev)) return prev;
        return mapped[0]?.__backendId ?? null;
      });

      await fetchLoyalty(authUser.userId);
    } catch {
      // ignore: backend may be down
    }
  }

  async function handleEmailStart(event) {
    if (event) event.preventDefault();
    if (authBusy) return;
    const email = emailInput.trim();
    if (!email) {
      setAuthMessage('Enter an email address');
      return;
    }

    setAuthBusy(true);
    setAuthMessage('');
    try {
      const resp = await fetch('/v1/auth/email/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!resp.ok) throw new Error('Unable to send code');
      const data = await resp.json();
      setCodeSent(true);
      setCodeInput('');
      setAuthMessage(`Code sent to ${email}${data.code ? ` (demo ${data.code})` : ''}`);
    } catch (err) {
      setAuthMessage('Unable to send verification code right now');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleEmailVerify(event) {
    if (event) event.preventDefault();
    if (authBusy) return;
    const email = emailInput.trim();
    const code = codeInput.trim();
    if (!email || !code) {
      setAuthMessage('Enter both email and code');
      return;
    }

    setAuthBusy(true);
    setAuthMessage('');
    try {
      const resp = await fetch('/v1/auth/email/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      if (!resp.ok) {
        const parsed = await resp.json().catch(() => null);
        throw new Error(parsed?.error || 'Invalid code');
      }

      const data = await resp.json();
      const payload = {
        userId: data.userId,
        email: data.email ?? email,
        token: data.token ?? null,
        expiresAt: data.expiresAt ?? null,
      };
      setAuthUser(payload);
      persistAuth(payload);
      setCodeSent(false);
      setCodeInput('');
      setAuthMessage(`Signed in as ${payload.email}`);
    } catch (err) {
      setAuthMessage(err.message ?? 'Unable to verify code');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleOAuth(provider) {
    if (authBusy) return;
    setAuthBusy(true);
    setAuthMessage('');
    const providerId = getOrCreateProviderId(provider);
    try {
      const resp = await fetch('/v1/auth/oauth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider,
          providerId,
          email: emailInput.trim() || undefined,
        }),
      });

      if (!resp.ok) throw new Error('OAuth flow failed');
      const data = await resp.json();
      const payload = {
        userId: data.userId,
        email: data.email ?? (emailInput.trim() || `${provider}@hollyship.app`),
        token: data.token ?? null,
        expiresAt: data.expiresAt ?? null,
      };
      setAuthUser(payload);
      persistAuth(payload);
      setCodeSent(false);
      setCodeInput('');
      setAuthMessage(`Signed in with ${provider}`);
    } catch (err) {
      setAuthMessage(err.message ?? 'OAuth login failed');
    } finally {
      setAuthBusy(false);
    }
  }

  function handleLogout() {
    clearStoredAuth();
    setAuthUser({ userId: null, email: null, token: null, expiresAt: null });
    setPackages([]);
    setLoyaltyPoints(0);
    setLoyaltyTier(null);
    setCodeSent(false);
    setCodeInput('');
    setAuthMessage('Signed out.');
  }

  useEffect(() => {
    const stored = loadStoredAuth();
    if (stored?.userId) {
      setAuthUser(stored);
    }
  }, []);

  useEffect(() => {
    if (!authUser.userId) return;

    fetchPackages();
    fetchLoyalty(authUser.userId);

    const interval = window.setInterval(() => {
      fetchPackages();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [authUser.userId]);

  useEffect(() => {
    return () => {
      if (popupTimerRef.current) window.clearTimeout(popupTimerRef.current);
      if (confettiTimerRef.current) window.clearTimeout(confettiTimerRef.current);
      if (fireworksTimerRef.current) window.clearTimeout(fireworksTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const update = () => {
      const el = mapCanvasRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setMapSize({ width: rect.width, height: rect.height });
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const activePackage = useMemo(() => {
    if (!packages.length) return null;
    return packages.find((p) => p.__backendId === selectedPackageId) || packages[0];
  }, [packages, selectedPackageId]);

  const markerPos = useMemo(() => {
    if (!activePackage) return null;

    const hasCoords =
      activePackage.currentLat != null &&
      activePackage.currentLng != null &&
      activePackage.originLat != null &&
      activePackage.originLng != null &&
      activePackage.destinationLat != null &&
      activePackage.destinationLng != null &&
      mapSize.width > 0 &&
      mapSize.height > 0;

    if (hasCoords) {
      const toPx = (lat, lng) => {
        const x = ((lng + 180) / 360) * mapSize.width;
        const y = ((90 - lat) / 180) * mapSize.height;
        return { x, y };
      };

      const start = toPx(activePackage.originLat, activePackage.originLng);
      const end = toPx(activePackage.destinationLat, activePackage.destinationLng);
      const cur = toPx(activePackage.currentLat, activePackage.currentLng);

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

      return {
        mode: 'coords',
        route: { left: start.x, top: start.y, width: dist, angle },
        marker: { left: cur.x, top: cur.y },
      };
    }

    const progress = (activePackage.progress || 0) / 100;
    const startX = 20;
    const endX = 80;
    const x = startX + (endX - startX) * progress;
    const y = 50 + Math.sin(progress * Math.PI) * 20;
    return { mode: 'fallback', x, y, startX, endX };
  }, [activePackage, mapSize.height, mapSize.width]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!isAuthenticated) {
      setAuthMessage('Sign in before tracking a new package.');
      return;
    }
    if (isSubmitting) return;
    if (packages.length >= 999) return;

    setIsSubmitting(true);

    try {
      const resp = await fetch('/v1/shipments/resolve', {
        method: 'POST',
        headers: withAuthHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({
          trackingNumber: trackingNumber.trim().toUpperCase(),
          hintCarrier: carrier === 'AUTO' ? 'AUTO' : carrier || null,
          destination: destination.trim(),
          ...(authUser.token ? {} : { userId: authUser.userId }),
        }),
      });

      if (!resp.ok) throw new Error('Failed');

      setIsModalOpen(false);
      setTrackingNumber('');
      setCarrier('');
      setDestination('');

      await fetchPackages();
    } catch {
      // keep modal open; minimal UX
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onUpdateStatus(e, pkgId) {
    e.stopPropagation();

    const pkg = packages.find((p) => p.__backendId === pkgId);
    if (!pkg) return;

    const newUiStatus = nextUiStatus(pkg.status);
    if (newUiStatus === pkg.status) return;

    // Optimistic disable handled by local state
    setPackages((prev) =>
      prev.map((p) =>
        p.__backendId === pkgId
          ? {
              ...p,
              status: newUiStatus,
              progress: statusToProgress(newUiStatus),
            }
          : p,
      ),
    );

    try {
      await apiFetch(`/v1/shipments/${pkgId}/simulate-status`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status: uiToCanonicalStatus(newUiStatus),
          ...(authUser.token ? {} : { userId: authUser.userId }),
        }),
      });

      const pointsToAward = STATUS_POINTS[newUiStatus] ?? 0;
      if (pointsToAward > 0) showPointsEarned(pointsToAward, newUiStatus);

      await fetchPackages();
    } catch {
      // revert by refetch
      await fetchPackages();
    }
  }

  async function onDelete(e, pkgId) {
    e.stopPropagation();

    if (confirmDeleteById[pkgId]) {
      setConfirmDeleteById((m) => ({ ...m, [pkgId]: false }));

      try {
        const resp = await apiFetch(`/v1/shipments/${pkgId}`, { method: 'DELETE' });
        if (!resp.ok) throw new Error('Failed');
        await fetchPackages();
      } catch {
        // ignore
      }
      return;
    }

    setConfirmDeleteById((m) => ({ ...m, [pkgId]: true }));
    window.setTimeout(() => {
      setConfirmDeleteById((m) => ({ ...m, [pkgId]: false }));
    }, 3000);
  }

  async function copyCode(code, setText) {
    try {
      await navigator.clipboard.writeText(code);
      setText('✅ Copied!');
      window.setTimeout(() => setText(`Copy Code: ${code}`), 2000);
    } catch {
      // ignore
    }
  }

  async function optimizePickup(e) {
    if (e) e.preventDefault();
    if (!pickupOrigin || !pickupDestination) return;

    setPickupOptimizing(true);
    setPickupResults(null);

    try {
      // Simple geocoding - in production, use a real geocoding API
      const originCoords = { lat: 37.7749, lng: -122.4194 }; // Default SF
      const destCoords = { lat: 40.7128, lng: -74.0060 }; // Default NYC

      const resp = await fetch('/v1/shipments/optimize-pickup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          origin: originCoords,
          destination: destCoords,
          carriers: ['UPS', 'FedEx', 'USPS', 'DHL', 'Amazon'],
          preferences: {
            costWeight: 1.0,
            speedWeight: 1.5,
            reliabilityWeight: 1.0,
          },
        }),
      });

      if (!resp.ok) throw new Error('Failed to optimize');

      const data = await resp.json();
      setPickupResults(data);
    } catch (err) {
      console.error('Pickup optimization failed:', err);
    } finally {
      setPickupOptimizing(false);
    }
  }


  return (
    <div id="app-wrapper">
      <header className="header">
        <div className="logo-section">
          <div className="logo-icon" aria-hidden="true">
            <img src="/hollyship-icon.svg" alt="" />
          </div>
          <h1 className="app-title" id="app-title">
            HollyShip
          </h1>
        </div>
        <div className="header-actions">
          {isAuthenticated ? (
            <div className="user-pill">
              <span>{authUser.email ?? 'HollyShip member'}</span>
              <button type="button" className="pill-logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : null}
          <button
            className="add-tracking-btn"
            style={{ marginRight: 8 }}
            onClick={() => setIsPickupModalOpen(true)}
            disabled={!isAuthenticated}
            type="button"
          >
            <span>🚚 Optimize Pickup</span>
          </button>
          <button
            className="add-tracking-btn"
            id="add-btn"
            onClick={() => {
              setIsModalOpen(true);
              window.setTimeout(() => {
                const el = document.getElementById('tracking-input');
                if (el) el.focus();
              }, 0);
            }}
            disabled={!isAuthenticated || isSubmitting}
            type="button"
          >
            <span id="add-btn-text">➕ Track New Package</span>
          </button>
        </div>
      </header>

      <main className="main-content">
        <section className="map-section">
          <h2 className="section-header">
            <span>🌍</span> <span id="map-title">Live GPS Tracking</span>
          </h2>
          <div className="map-container glass">
            <div className="map-canvas" id="map-canvas" ref={mapCanvasRef}>
              <div className="grid-bg"></div>

              {markerPos ? (
                <>
                  {markerPos.mode === 'coords' ? (
                    <div
                      className="route-line"
                      style={{
                        left: `${markerPos.route.left}px`,
                        top: `${markerPos.route.top}px`,
                        width: `${markerPos.route.width}px`,
                        transform: `rotate(${markerPos.route.angle}deg)`,
                      }}
                    />
                  ) : (
                    <div
                      className="route-line"
                      style={{
                        left: `${markerPos.startX}%`,
                        top: '50%',
                        width: `${markerPos.endX - markerPos.startX}%`,
                      }}
                    />
                  )}

                  <div
                    className="gps-marker"
                    style={
                      markerPos.mode === 'coords'
                        ? { left: `${markerPos.marker.left}px`, top: `${markerPos.marker.top}px` }
                        : { left: `${markerPos.x}%`, top: `${markerPos.y}%` }
                    }
                  >
                    <div className="marker-pulse"></div>
                    <div className="marker-pulse" style={{ animationDelay: '0.5s' }}></div>
                    <div className="marker-icon">📦</div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>

        <section className="packages-section">
          <h2 className="section-header">
            <span>📋</span> <span>Active Shipments</span>
          </h2>

          <div className="packages-list" id="packages-list">
            {packages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <p>No packages tracked yet</p>
                <p style={{ fontSize: 14, marginTop: 8 }}>Click "Track New Package" to get started</p>
              </div>
            ) : (
              packages.map((pkg) => {
                const isConfirm = !!confirmDeleteById[pkg.__backendId];

                return (
                  <div
                    key={pkg.__backendId}
                    className="package-card glass"
                    data-id={pkg.__backendId}
                    onClick={() => setSelectedPackageId(pkg.__backendId)}
                  >
                    <div className="package-header">
                      <div className="tracking-number">{pkg.trackingNumber}</div>
                      <div className="carrier-badge">{pkg.carrier}</div>
                    </div>

                    <div className="status-section">
                      <div className={`status-badge ${statusBadgeClass(pkg.status)}`}>
                        <span className="status-icon"></span>
                        {formatStatus(pkg.status)}
                      </div>
                      <div className="progress-bar-container">
                        <div className="progress-bar" style={{ width: `${pkg.progress}%` }}></div>
                      </div>
                    </div>

                    <div className="location-info">
                      <div className="location-row">
                        <span className="location-icon">📍</span>
                        <span>{pkg.currentLocation}</span>
                      </div>
                      <div className="location-row">
                        <span className="location-icon">🎯</span>
                        <span>{pkg.destination}</span>
                      </div>
                    </div>

                    <div className="eta-info">
                      <strong>Estimated Delivery:</strong> {pkg.estimatedDelivery}
                      {pkg.etaConfidence !== null && pkg.status !== 'DELIVERED' && (
                        <div className="confidence-score" style={{ marginTop: 4, fontSize: 13, color: '#666' }}>
                          <span>Confidence: </span>
                          <span style={{ 
                            fontWeight: 600,
                            color: pkg.etaConfidence >= 80 ? '#18C37E' : pkg.etaConfidence >= 60 ? '#FFA500' : '#FF6347'
                          }}>
                            {pkg.etaConfidence}%
                          </span>
                          <span style={{ marginLeft: 4 }}>
                            {pkg.etaConfidence >= 80 ? '🟢' : pkg.etaConfidence >= 60 ? '🟡' : '🔴'}
                          </span>
                        </div>
                      )}
                    </div>

                    {pkg.status !== 'DELIVERED' ? (
                      <button
                        className="claim-btn"
                        style={{
                          marginTop: 12,
                          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        }}
                        onClick={(e) => onUpdateStatus(e, pkg.__backendId)}
                        type="button"
                      >
                        📦 Update Status
                      </button>
                    ) : null}

                    <button className="delete-btn" onClick={(e) => onDelete(e, pkg.__backendId)} type="button">
                      {isConfirm ? '⚠️ Confirm Delete?' : '🗑️ Remove Tracking'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      <aside className="rewards-panel glass" id="rewards-panel">
        <div className="rewards-header">
          <div className="rewards-icon">🏆</div>
          <div className="rewards-title">Holly Rewards</div>
        </div>

        <div className="points-display">
          <div className="points-number" id="points-number">
            {totalPoints}
          </div>
          <div className="points-label">Total Points Earned</div>
        </div>

        {loyaltyTier ? <div className="points-label" style={{ marginTop: -10 }}>Tier: {loyaltyTier}</div> : null}

        <div className="rewards-progress">
          <div className="progress-label">
            <span>Next Reward</span>
            <span id="progress-text">{progressText}</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" id="progress-fill" style={{ width: `${progressPercent}%` }}></div>

            {[100, 250, 500, 1000].map((points, idx) => {
              const left = `${(idx + 1) * 25}%`;
              const unlocked = totalPoints >= points;
              const icon = points === 1000 ? '🏆' : '🎁';
              return (
                <div key={points} className={`milestone ${unlocked ? 'unlocked' : ''}`} style={{ left }}>
                  <span>{icon}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rewards-list">
          {REWARDS.map((reward) => (
            <RewardItem key={reward.id} reward={reward} unlocked={totalPoints >= reward.points} onCopy={copyCode} />
          ))}
        </div>
      </aside>

      <div className="celebration-overlay" id="celebration">
        {confetti.map((c) => (
          <div
            key={c.id}
            className="confetti"
            style={{ left: `${c.left}%`, backgroundColor: c.color, animationDelay: `${c.delay}s` }}
          />
        ))}
      </div>

      {earnedPopup ? (
        <div className="earned-popup glass">
          <div className="popup-icon">🎉</div>
          <div className="popup-title">+{earnedPopup.points} Points!</div>
          <div className="popup-message">Package {formatStatus(earnedPopup.uiStatus)}</div>
        </div>
      ) : null}

      {!isAuthenticated && (
        <div className="auth-overlay">
          <div className="auth-card glass" role="dialog" aria-modal="true">
            <h2>Sign in to HollyShip</h2>
            <p className="auth-teaser">
              Verify your email or continue with Google / Apple to unlock universal tracking, rewards, and
              the fireworks experience.
            </p>
            <form className="auth-form" onSubmit={codeSent ? handleEmailVerify : handleEmailStart}>
              <div className="form-group">
                <label className="form-label" htmlFor="auth-email-input">
                  Email address
                </label>
                <input
                  id="auth-email-input"
                  type="email"
                  className="form-input auth-input"
                  placeholder="you@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                />
              </div>

              {codeSent ? (
                <div className="form-group">
                  <label className="form-label" htmlFor="auth-code-input">
                    Verification code
                  </label>
                  <input
                    id="auth-code-input"
                    type="text"
                    className="form-input auth-input"
                    placeholder="123456"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    inputMode="numeric"
                    required
                  />
                </div>
              ) : null}

              <button type="submit" className="btn btn-primary auth-submit" disabled={authBusy}>
                {authBusy ? (
                  <span className="loading-spinner"></span>
                ) : codeSent ? (
                  'Verify & Continue'
                ) : (
                  'Send verification code'
                )}
              </button>
            </form>

            <div className="auth-divider">or</div>

            <div className="oauth-row">
              <button
                type="button"
                className="oauth-btn google"
                onClick={() => handleOAuth('google')}
                disabled={authBusy}
              >
                Continue with Google
              </button>
              <button
                type="button"
                className="oauth-btn apple"
                onClick={() => handleOAuth('apple')}
                disabled={authBusy}
              >
                Continue with Apple
              </button>
            </div>

            {authMessage ? <div className="auth-status">{authMessage}</div> : null}
          </div>
        </div>
      )}

      <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`} id="modal">
        <div className="modal-content glass">
          <h2 className="modal-header">Track New Package</h2>
          <form id="tracking-form" onSubmit={onSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="tracking-input">
                Tracking Number
              </label>
              <input
                type="text"
                id="tracking-input"
                className="form-input"
                placeholder="Enter tracking number..."
                required
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="carrier-select">
                Carrier
              </label>
              <select
                id="carrier-select"
                className="form-select"
                required
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
              >
                <option value="">Select carrier...</option>
                <option value="AUTO">Auto-detect</option>
                <option value="UPS">UPS</option>
                <option value="FedEx">FedEx</option>
                <option value="USPS">USPS</option>
                <option value="DHL">DHL</option>
                <option value="Amazon">Amazon Logistics</option>
                <option value="AliExpress">AliExpress</option>
                <option value="TEMU">TEMU</option>
                <option value="SHEIN">SHEIN</option>
                <option value="DHGATE">DHgate</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="destination-input">
                Destination
              </label>
              <input
                type="text"
                id="destination-input"
                className="form-input"
                placeholder="e.g., New York, NY"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                id="cancel-btn"
                onClick={() => {
                  setIsModalOpen(false);
                  setTrackingNumber('');
                  setCarrier('');
                  setDestination('');
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" id="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="loading-spinner"></span> Adding...
                  </>
                ) : (
                  <span id="submit-text">Add Tracking</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Pickup Optimization Modal */}
      <div className={`modal-overlay ${isPickupModalOpen ? 'active' : ''}`}>
        <div className="modal-content glass" style={{ maxWidth: 700 }}>
          <h2 className="modal-header">🚚 Optimize Pickup Time</h2>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>
            Compare carriers and find the best pickup time based on cost, speed, and reliability.
          </p>
          <form onSubmit={optimizePickup}>
            <div className="form-group">
              <label className="form-label" htmlFor="pickup-origin-input">
                Pickup Location
              </label>
              <input
                type="text"
                id="pickup-origin-input"
                className="form-input"
                placeholder="e.g., San Francisco, CA"
                required
                value={pickupOrigin}
                onChange={(e) => setPickupOrigin(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="pickup-dest-input">
                Delivery Destination
              </label>
              <input
                type="text"
                id="pickup-dest-input"
                className="form-input"
                placeholder="e.g., New York, NY"
                required
                value={pickupDestination}
                onChange={(e) => setPickupDestination(e.target.value)}
              />
            </div>

            {pickupResults && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ 
                  background: 'linear-gradient(135deg, #18C37E 0%, #14A664 100%)',
                  padding: 16,
                  borderRadius: 12,
                  color: 'white',
                  marginBottom: 16
                }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                    🏆 Recommended: {pickupResults.recommended.carrier}
                  </div>
                  <div style={{ fontSize: 14, opacity: 0.95, marginBottom: 4 }}>
                    Cost: ${pickupResults.recommended.estimatedCost} • {pickupResults.recommended.estimatedDays} days
                  </div>
                  <div style={{ fontSize: 14, opacity: 0.95, marginBottom: 4 }}>
                    Confidence: {pickupResults.recommended.confidence}% • Score: {pickupResults.recommended.score}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.9, marginTop: 8 }}>
                    <strong>Pickup Times:</strong> {pickupResults.recommended.pickupTimes.join(', ')}
                  </div>
                </div>

                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
                  Alternative Options:
                </div>
                {pickupResults.alternatives.map((alt, idx) => (
                  <div key={idx} style={{
                    padding: 12,
                    border: '1px solid #e0e0e0',
                    borderRadius: 8,
                    marginBottom: 8,
                    background: 'white'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {alt.carrier}
                    </div>
                    <div style={{ fontSize: 13, color: '#666' }}>
                      ${alt.estimatedCost} • {alt.estimatedDays} days • {alt.confidence}% confidence • Score: {alt.score}
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                      {alt.pickupTimes.slice(0, 3).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsPickupModalOpen(false);
                  setPickupOrigin('');
                  setPickupDestination('');
                  setPickupResults(null);
                }}
              >
                Close
              </button>
              <button type="submit" className="btn btn-primary" disabled={pickupOptimizing}>
                {pickupOptimizing ? (
                  <>
                    <span className="loading-spinner"></span> Optimizing...
                  </>
                ) : (
                  'Compare Carriers'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function RewardItem({ reward, unlocked, onCopy }) {
  const [buttonText, setButtonText] = useState(`Copy Code: ${reward.code}`);

  useEffect(() => {
    setButtonText(`Copy Code: ${reward.code}`);
  }, [reward.code, unlocked]);

  return (
    <div className={`reward-item ${unlocked ? 'unlocked' : ''}`} id={`reward-${reward.id}`}>
      <div className="reward-info">
        <div className="reward-name">{reward.name}</div>
        <div className="reward-requirement">Unlock at {reward.points} points</div>

        {unlocked ? (
          <button className="claim-btn" type="button" onClick={() => onCopy(reward.code, setButtonText)}>
            {buttonText}
          </button>
        ) : null}
      </div>

      <div className={`reward-badge ${unlocked ? 'unlocked' : 'locked'}`}>{unlocked ? `✅ ${reward.code}` : '🔒 Locked'}</div>
    </div>
  );
}
