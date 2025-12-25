import { useEffect, useMemo, useRef, useState } from 'react';

function LogoIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* Main Package Box */}
      <rect x="14" y="16" width="12" height="12" rx="1.5" fill="url(#logoGradient)" opacity="0.95" />
      {/* Box Tape Lines */}
      <line x1="14" y1="22" x2="26" y2="22" stroke="white" strokeWidth="1.2" opacity="0.4" />
      <line x1="20" y1="16" x2="20" y2="28" stroke="white" strokeWidth="1.2" opacity="0.4" />
      {/* Left Wing */}
      <path
        d="M14 22 L4 18 Q2 17.5 2.5 16.5 Q3 15.5 4.5 16 L14 19.5 Z"
        fill="url(#logoGradient)"
        opacity="0.9"
      />
      {/* Right Wing */}
      <path
        d="M26 22 L36 18 Q38 17.5 37.5 16.5 Q37 15.5 35.5 16 L26 19.5 Z"
        fill="url(#logoGradient)"
        opacity="0.9"
      />
      {/* Wing Feather Details Left */}
      <line x1="5" y1="16.5" x2="13" y2="20" stroke="white" strokeWidth="0.8" opacity="0.5" />
      <line x1="6" y1="17.2" x2="13.5" y2="20.5" stroke="white" strokeWidth="0.6" opacity="0.4" />
      <line x1="7" y1="17.8" x2="14" y2="21" stroke="white" strokeWidth="0.6" opacity="0.3" />
      {/* Wing Feather Details Right */}
      <line x1="35" y1="16.5" x2="27" y2="20" stroke="white" strokeWidth="0.8" opacity="0.5" />
      <line x1="34" y1="17.2" x2="26.5" y2="20.5" stroke="white" strokeWidth="0.6" opacity="0.4" />
      <line x1="33" y1="17.8" x2="26" y2="21" stroke="white" strokeWidth="0.6" opacity="0.3" />
      {/* Holly Decoration */}
      <circle cx="20" cy="22" r="1.8" fill="#34c759" opacity="0.95" />
      <circle cx="18.2" cy="23" r="1.4" fill="#34c759" opacity="0.9" />
      <circle cx="21.8" cy="23" r="1.4" fill="#34c759" opacity="0.9" />
      {/* Red Holly Berries */}
      <circle cx="20" cy="22" r="0.8" fill="#ff3b30" />
      <circle cx="18.5" cy="22.8" r="0.6" fill="#ff3b30" opacity="0.9" />
      <circle cx="21.5" cy="22.8" r="0.6" fill="#ff3b30" opacity="0.9" />
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5e8cff" />
          <stop offset="100%" stopColor="#7ba5ff" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="11" y="14" width="10" height="10" rx="1" fill="white" opacity="0.9" />
      <line x1="11" y1="19" x2="21" y2="19" stroke="white" strokeWidth="1" opacity="0.6" />
      <line x1="16" y1="14" x2="16" y2="24" stroke="white" strokeWidth="1" opacity="0.6" />
      <path d="M11 19 L3 16 Q2 15.5 3 15 L11 17 Z" fill="white" opacity="0.85" />
      <path d="M21 19 L29 16 Q30 15.5 29 15 L21 17 Z" fill="white" opacity="0.85" />
      <line x1="5" y1="15.5" x2="10" y2="17.5" stroke="white" strokeWidth="0.5" opacity="0.5" />
      <line x1="27" y1="15.5" x2="22" y2="17.5" stroke="white" strokeWidth="0.5" opacity="0.5" />
    </svg>
  );
}

function BoatIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M8 20 L6 24 Q6 25 7 25 L25 25 Q26 25 26 24 L24 20 Z" fill="white" opacity="0.9" />
      <rect x="10" y="15" width="5" height="5" rx="0.5" fill="white" opacity="0.85" />
      <rect x="16" y="15" width="5" height="5" rx="0.5" fill="white" opacity="0.75" />
      <line x1="10" y1="17.5" x2="15" y2="17.5" stroke="#5e8cff" strokeWidth="0.5" opacity="0.6" />
      <line x1="16" y1="17.5" x2="21" y2="17.5" stroke="#5e8cff" strokeWidth="0.5" opacity="0.6" />
      <path
        d="M4 26 Q6 27 8 26 T12 26 T16 26 T20 26 T24 26 T28 26"
        stroke="white"
        strokeWidth="1"
        opacity="0.4"
        fill="none"
      />
    </svg>
  );
}

function DeliveredPackageIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="11" y="14" width="10" height="10" rx="1" fill="white" opacity="0.9" />
      <line x1="11" y1="19" x2="21" y2="19" stroke="white" strokeWidth="1" opacity="0.6" />
      <line x1="16" y1="14" x2="16" y2="24" stroke="white" strokeWidth="1" opacity="0.6" />
      <path d="M11 19 L3 16 Q2 15.5 3 15 L11 17 Z" fill="white" opacity="0.85" />
      <path d="M21 19 L29 16 Q30 15.5 29 15 L21 17 Z" fill="white" opacity="0.85" />
      <line x1="5" y1="15.5" x2="10" y2="17.5" stroke="white" strokeWidth="0.5" opacity="0.5" />
      <line x1="27" y1="15.5" x2="22" y2="17.5" stroke="white" strokeWidth="0.5" opacity="0.5" />
      <path d="M13 19 L15 21 L19 17" stroke="#34c759" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Modal({ id, title, isOpen, onClose, children, footer }) {
  return (
    <div
      className={`modal-overlay ${isOpen ? 'active' : ''}`}
      id={id}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-hidden={!isOpen}
    >
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} type="button" aria-label="Close modal">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}

function ToastStack({ toasts }) {
  // Render last toast only (matches the original “one toast at a time” feel)
  const toast = toasts[toasts.length - 1];
  if (!toast) return null;

  return (
    <div className="toast" role="status" aria-live="polite">
      {toast.message}
    </div>
  );
}

function statusToBadgeClass(status) {
  switch (status) {
    case 'IN_TRANSIT':
      return 'status-in-transit';
    case 'OUT_FOR_DELIVERY':
      return 'status-out-for-delivery';
    case 'DELIVERED':
      return 'status-delivered';
    case 'CREATED':
    case 'DELAYED':
    case 'ACTION_REQUIRED':
    case 'FAILURE':
    default:
      return 'status-pending';
  }
}

function statusToText(status) {
  if (!status) return 'Processing';
  return String(status)
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function iconForStatus(status) {
  if (status === 'DELIVERED') return <DeliveredPackageIcon />;
  return <PackageIcon />;
}

export default function App() {
  const [activeModal, setActiveModal] = useState(null);
  const [toasts, setToasts] = useState([]);

  const [trackingNumber, setTrackingNumber] = useState('');
  const [packageName, setPackageName] = useState('');
  const [carrier, setCarrier] = useState('');
  const [isAddingOrder, setIsAddingOrder] = useState(false);

  const forwardEmailRef = useRef('track-abc123xyz@hollyship.app');

  const initialOrders = useMemo(
    () => [
      {
        id: 'order-1',
        icon: <PackageIcon />,
        statusClass: 'status-in-transit',
        statusText: 'In Transit',
        title: 'Apple AirPods Pro',
        tracking: '1Z999AA10123456784',
        timeline: [
          { active: true, title: 'Out for delivery', time: 'Today, 8:45 AM' },
          { active: true, title: 'Arrived at facility', time: 'Today, 6:20 AM' },
          { active: false, title: 'In transit', time: 'Yesterday, 11:30 PM' },
        ],
        carrierLogo: '📮',
        carrierName: 'UPS',
        eta: 'ETA: Today by 7:00 PM',
      },
      {
        id: 'order-2',
        icon: <BoatIcon />,
        statusClass: 'status-out-for-delivery',
        statusText: 'Out for Delivery',
        title: 'Nike Air Max 2024',
        tracking: '9274899998520123456',
        timeline: [
          { active: true, title: 'On delivery vehicle', time: 'Today, 9:15 AM' },
          { active: true, title: 'Loaded on truck', time: 'Today, 7:00 AM' },
        ],
        carrierLogo: '✈️',
        carrierName: 'FedEx',
        eta: 'ETA: Today by 5:00 PM',
      },
      {
        id: 'order-3',
        icon: <DeliveredPackageIcon />,
        statusClass: 'status-delivered',
        statusText: 'Delivered',
        title: 'MacBook Pro 16"',
        tracking: '9400111202123456789',
        timeline: [
          { active: true, title: 'Delivered - Front door', time: 'Yesterday, 2:45 PM' },
          { active: true, title: 'Out for delivery', time: 'Yesterday, 8:30 AM' },
        ],
        carrierLogo: '📦',
        carrierName: 'USPS',
        eta: 'Delivered ✓',
      },
    ],
    [],
  );

  const [orders, setOrders] = useState(initialOrders);

  const didLoadRef = useRef(false);

  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;

    (async () => {
      try {
        const resp = await fetch('/v1/shipments?limit=30');
        if (!resp.ok) return;
        const data = await resp.json();
        const items = Array.isArray(data?.items) ? data.items : [];

        setOrders(
          items.map((s) => {
            const events = Array.isArray(s.events) ? s.events : [];
            const timelineItems = events.length
              ? events.slice(0, 3).map((e, idx) => ({
                  active: idx < 2,
                  title: statusToText(e.canonicalStatus),
                  time: new Date(e.eventTime).toLocaleString(),
                }))
              : [{ active: true, title: 'Created', time: new Date(s.createdAt).toLocaleString() }];

            return {
              id: s.id,
              icon: iconForStatus(s.status),
              statusClass: statusToBadgeClass(s.status),
              statusText: statusToText(s.status),
              title: s.label || 'Package',
              tracking: s.trackingNumber,
              timeline: timelineItems,
              carrierLogo: '📮',
              carrierName: s.carrier || 'Carrier',
              eta: s.eta ? `ETA: ${new Date(s.eta).toLocaleString()}` : 'Tracking...',
            };
          }),
        );
      } catch {
        // If backend isn't available, keep demo content.
      }
    })();
  }, []);

  function showToast(message) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }

  function openModal(name) {
    setActiveModal(name);
  }

  function closeModal() {
    setActiveModal(null);
  }

  async function submitAddOrder() {
    if (!trackingNumber || !packageName || !carrier) {
      showToast('❌ Please fill in all fields');
      return;
    }

    setIsAddingOrder(true);

    try {
      const resp = await fetch('/v1/shipments/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber, hintCarrier: carrier, label: packageName }),
      });

      if (!resp.ok) {
        throw new Error(`resolve failed: ${resp.status}`);
      }

      const shipment = await resp.json();

      setOrders((prev) => [
        {
          id: shipment.id ?? `order-${Date.now()}`,
          icon: iconForStatus(shipment.status),
          statusClass: statusToBadgeClass(shipment.status),
          statusText: statusToText(shipment.status),
          title: shipment.label ?? packageName,
          tracking: shipment.trackingNumber ?? trackingNumber,
          timeline: [{ active: true, title: 'Order received', time: 'Just now' }],
          carrierLogo: '📮',
          carrierName: shipment.carrier ?? carrier,
          eta: shipment.eta ? `ETA: ${new Date(shipment.eta).toLocaleString()}` : 'Tracking...',
        },
        ...prev,
      ]);

      closeModal();
      showToast('✅ Order added successfully! Tracking now...');
      setTrackingNumber('');
      setPackageName('');
      setCarrier('');
    } catch {
      showToast('❌ Could not reach backend. Added locally.');
      setOrders((prev) => [
        {
          id: `order-${Date.now()}`,
          icon: <PackageIcon />,
          statusClass: 'status-pending',
          statusText: 'Processing',
          title: packageName,
          tracking: trackingNumber,
          timeline: [{ active: true, title: 'Order received', time: 'Just now' }],
          carrierLogo: '📮',
          carrierName: carrier,
          eta: 'Tracking...',
        },
        ...prev,
      ]);
      closeModal();
      setTrackingNumber('');
      setPackageName('');
      setCarrier('');
    } finally {
      setIsAddingOrder(false);
    }
  }

  function connectEmail(provider) {
    const label = provider.charAt(0).toUpperCase() + provider.slice(1);
    showToast(`🔗 Connecting to ${label}...`);

    window.setTimeout(() => {
      closeModal();
      showToast(`✅ ${label} connected successfully!`);
    }, 2000);
  }

  async function copyForwardEmail() {
    const email = forwardEmailRef.current;
    try {
      await navigator.clipboard.writeText(email);
      showToast('📋 Email address copied to clipboard!');
    } catch {
      showToast('❌ Could not copy address');
    }
  }

  return (
    <>
      <nav className="top-nav">
        <div className="logo">
          <div className="logo-icon">
            <img src="/hollyship-icon.svg" alt="" aria-hidden="true" />
          </div>
          <span>HollyShip</span>
        </div>

        <div className="nav-actions">
          <button className="nav-btn" id="connectEmailBtn" type="button" onClick={() => openModal('connectEmail')}>
            ➕ Connect Email
          </button>
          <button className="nav-btn primary" id="addOrderBtn" type="button" onClick={() => openModal('addOrder')}>
            Add Order
          </button>
        </div>
      </nav>

      <main className="main-container">
        <section className="hero-section">
          <h1 className="hero-title">Track Every Package</h1>
          <p className="hero-subtitle">Automatic tracking from Gmail, Outlook, and 200+ carriers worldwide</p>
        </section>

        <section className="quick-actions">
          <div className="action-card" onClick={() => openModal('addOrder')} role="button" tabIndex={0}>
            <div className="action-icon">📦</div>
            <div className="action-title">Add Manually</div>
            <div className="action-subtitle">Enter tracking number</div>
          </div>

          <div className="action-card" onClick={() => openModal('connectEmail')} role="button" tabIndex={0}>
            <div className="action-icon">📧</div>
            <div className="action-title">Connect Email</div>
            <div className="action-subtitle">Auto-track orders</div>
          </div>

          <div className="action-card" onClick={() => openModal('forward')} role="button" tabIndex={0}>
            <div className="action-icon">↗️</div>
            <div className="action-title">Forward Email</div>
            <div className="action-subtitle">Get unique address</div>
          </div>
        </section>

        <div className="section-header">
          <h2 className="section-title">Connected Accounts</h2>
          <button className="view-all-btn" type="button">
            Manage
          </button>
        </div>

        <div className="accounts-grid">
          <div className="account-card">
            <div className="account-icon gmail-icon">📧</div>
            <div className="account-info">
              <div className="account-name">Gmail</div>
              <div className="account-email">john.doe@gmail.com</div>
            </div>
            <div className="account-status">Connected</div>
          </div>

          <div className="account-card">
            <div className="account-icon outlook-icon">📨</div>
            <div className="account-info">
              <div className="account-name">Outlook</div>
              <div className="account-email">Not connected</div>
            </div>
            <div className="account-status disconnected">Disconnected</div>
          </div>

          <div className="account-card">
            <div className="account-icon" style={{ background: 'linear-gradient(135deg, #ff9500 0%, #ff6b00 100%)' }}>
              🛍️
            </div>
            <div className="account-info">
              <div className="account-name">Shop Pay</div>
              <div className="account-email">Automatic tracking</div>
            </div>
            <div className="account-status">Active</div>
          </div>
        </div>

        <div className="section-header">
          <h2 className="section-title">Active Deliveries</h2>
          <button className="view-all-btn" type="button">
            View All
          </button>
        </div>

        <div className="orders-grid" id="ordersGrid">
          {orders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <div className="empty-title">No deliveries yet</div>
              <div className="empty-subtitle">Add an order to start tracking</div>
            </div>
          ) : (
            orders.map((order) => (
              <div className="order-card" key={order.id}>
                <div className="order-header">
                  <div className="order-icon">{order.icon}</div>
                  <div className={`order-status-badge ${order.statusClass}`}>{order.statusText}</div>
                </div>

                <h3 className="order-title">{order.title}</h3>
                <div className="order-tracking">Tracking: {order.tracking}</div>

                <div className="order-timeline">
                  {order.timeline.map((item, idx) => (
                    <div className="timeline-item" key={`${order.id}-t-${idx}`}>
                      <div className={`timeline-dot ${item.active ? '' : 'inactive'}`}></div>
                      <div className="timeline-content">
                        <div className="timeline-title">{item.title}</div>
                        <div className="timeline-time">{item.time}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="order-footer">
                  <div className="carrier-info">
                    <div className="carrier-logo">{order.carrierLogo}</div>
                    <span>{order.carrierName}</span>
                  </div>
                  <div className="order-eta">{order.eta}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <Modal
        id="addOrderModal"
        title="Add Order Manually"
        isOpen={activeModal === 'addOrder'}
        onClose={closeModal}
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal} type="button">
              Cancel
            </button>
            <button className="btn btn-primary" onClick={submitAddOrder} type="button" disabled={isAddingOrder}>
              {isAddingOrder ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span className="loading-spinner"></span>
                  <span>Adding...</span>
                </span>
              ) : (
                'Add Order'
              )}
            </button>
          </>
        }
      >
        <form
          id="addOrderForm"
          onSubmit={(e) => {
            e.preventDefault();
            submitAddOrder();
          }}
        >
          <div className="form-group">
            <label className="form-label" htmlFor="trackingNumber">
              Tracking Number
            </label>
            <input
              type="text"
              className="form-input"
              id="trackingNumber"
              placeholder="1Z999AA10123456784"
              required
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
            />
            <div className="form-helper">Enter the tracking number from your shipping email</div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="packageName">
              Package Name
            </label>
            <input
              type="text"
              className="form-input"
              id="packageName"
              placeholder="iPhone 15 Pro"
              required
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="carrier">
              Carrier
            </label>
            <select
              className="form-select"
              id="carrier"
              required
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            >
              <option value="">Select carrier...</option>
              <option value="UPS">UPS</option>
              <option value="FedEx">FedEx</option>
              <option value="USPS">USPS</option>
              <option value="DHL">DHL</option>
              <option value="Amazon">Amazon Logistics</option>
              <option value="OnTrac">OnTrac</option>
              <option value="LaserShip">LaserShip</option>
            </select>
          </div>
        </form>
      </Modal>

      <Modal
        id="connectEmailModal"
        title="Connect Email"
        isOpen={activeModal === 'connectEmail'}
        onClose={closeModal}
        footer={
          <button className="btn btn-secondary" onClick={closeModal} type="button">
            Cancel
          </button>
        }
      >
        <div className="form-helper" style={{ marginBottom: 24 }}>
          Connect your email to automatically track orders from the last 30 days
        </div>

        <div className="email-option" onClick={() => connectEmail('gmail')} role="button" tabIndex={0}>
          <div className="email-option-icon gmail-icon">📧</div>
          <div className="email-option-info">
            <div className="email-option-title">Connect Gmail</div>
            <div className="email-option-desc">Scan for tracking emails automatically</div>
          </div>
          <span style={{ fontSize: 20, color: '#8e8e93' }}>→</span>
        </div>

        <div className="email-option" onClick={() => connectEmail('outlook')} role="button" tabIndex={0}>
          <div className="email-option-icon outlook-icon">📨</div>
          <div className="email-option-info">
            <div className="email-option-title">Connect Outlook</div>
            <div className="email-option-desc">Including Hotmail and Live accounts</div>
          </div>
          <span style={{ fontSize: 20, color: '#8e8e93' }}>→</span>
        </div>

        <div style={{ marginTop: 24, padding: 16, background: 'rgba(142, 142, 147, 0.1)', borderRadius: 12 }}>
          <div style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.6 }}>
            <strong>🔒 Privacy First:</strong> We only read shipping emails. Your personal emails remain private and secure.
          </div>
        </div>
      </Modal>

      <Modal
        id="forwardModal"
        title="Forward Tracking Emails"
        isOpen={activeModal === 'forward'}
        onClose={closeModal}
        footer={
          <button className="btn btn-secondary" onClick={closeModal} type="button">
            Close
          </button>
        }
      >
        <div className="form-helper" style={{ marginBottom: 20 }}>
          Forward your shipping confirmation emails to this unique address:
        </div>

        <div
          style={{
            padding: 20,
            background: '#f5f5f7',
            borderRadius: 12,
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: "'SF Mono', monospace",
              fontSize: 15,
              fontWeight: 700,
              color: '#667eea',
              marginBottom: 12,
            }}
            id="forwardEmail"
          >
            {forwardEmailRef.current}
          </div>
          <button
            className="btn btn-primary"
            onClick={copyForwardEmail}
            type="button"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}
          >
            <span>📋</span>
            <span>Copy Address</span>
          </button>
        </div>

        <div
          style={{
            background: 'rgba(0, 122, 255, 0.1)',
            padding: 16,
            borderRadius: 12,
            borderLeft: '4px solid #007aff',
          }}
        >
          <div style={{ fontSize: 14, color: '#1a1a1a', lineHeight: 1.6 }}>
            <strong>💡 Tip:</strong> Set up automatic email forwarding in Gmail or Outlook settings to never miss a package!
          </div>
        </div>
      </Modal>

      <ToastStack toasts={toasts} />
    </>
  );
}
