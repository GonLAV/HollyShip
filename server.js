const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory database for demo purposes
const shipments = new Map();
const trackingHistory = new Map();
let nextShipmentId = 100001; // Counter for unique IDs

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'hollyship@example.com',
    pass: process.env.EMAIL_PASS || 'demo_password'
  }
});

// Initialize sample shipments
const sampleShipments = [
  {
    id: 'HS100001',
    orderId: 'ORD-2024-001',
    status: 'in_transit',
    origin: 'New York, NY',
    destination: 'Los Angeles, CA',
    carrier: 'FedEx',
    estimatedDelivery: '2024-12-28',
    currentLocation: { lat: 40.7128, lng: -74.0060, name: 'New York, NY' },
    recipientEmail: 'customer@example.com',
    recipientName: 'John Doe',
    packageWeight: '2.5 kg',
    dimensions: '30x20x15 cm'
  },
  {
    id: 'HS100002',
    orderId: 'ORD-2024-002',
    status: 'delivered',
    origin: 'San Francisco, CA',
    destination: 'Seattle, WA',
    carrier: 'UPS',
    estimatedDelivery: '2024-12-25',
    currentLocation: { lat: 47.6062, lng: -122.3321, name: 'Seattle, WA' },
    recipientEmail: 'jane@example.com',
    recipientName: 'Jane Smith',
    packageWeight: '1.2 kg',
    dimensions: '25x15x10 cm'
  },
  {
    id: 'HS100003',
    orderId: 'ORD-2024-003',
    status: 'pending',
    origin: 'Chicago, IL',
    destination: 'Miami, FL',
    carrier: 'DHL',
    estimatedDelivery: '2024-12-30',
    currentLocation: { lat: 41.8781, lng: -87.6298, name: 'Chicago, IL' },
    recipientEmail: 'bob@example.com',
    recipientName: 'Bob Johnson',
    packageWeight: '3.8 kg',
    dimensions: '40x30x20 cm'
  }
];

sampleShipments.forEach(shipment => {
  shipments.set(shipment.id, shipment);
  // Update counter to be higher than any sample ID
  const idNum = parseInt(shipment.id.replace('HS', ''));
  if (idNum >= nextShipmentId) {
    nextShipmentId = idNum + 1;
  }
  trackingHistory.set(shipment.id, [
    {
      timestamp: new Date('2024-12-24T10:00:00'),
      status: 'order_placed',
      location: shipment.origin,
      message: 'Order placed and confirmed'
    },
    {
      timestamp: new Date('2024-12-24T14:30:00'),
      status: 'picked_up',
      location: shipment.origin,
      message: 'Package picked up by carrier'
    }
  ]);
});

// Send email notification
async function sendEmailNotification(email, trackingId, status, message) {
  const mailOptions = {
    from: process.env.EMAIL_USER || 'hollyship@example.com',
    to: email,
    subject: `HollyShip - Shipment Update: ${trackingId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: #4F46E5; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🚢 HollyShip</h1>
          <p style="color: white; margin: 10px 0 0 0;">Advanced Shipment Tracking</p>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #4F46E5; margin-top: 0;">Shipment Status Update</h2>
          <p style="font-size: 16px; color: #333;">Your shipment <strong>${trackingId}</strong> has been updated:</p>
          <div style="background-color: #F3F4F6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Status:</strong> ${status.toUpperCase().replace('_', ' ')}</p>
            <p style="margin: 5px 0;"><strong>Update:</strong> ${message}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <a href="http://localhost:${PORT}?track=${trackingId}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Track Your Shipment</a>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
          <p>© 2024 HollyShip - Next Generation Shipment Tracking</p>
        </div>
      </div>
    `
  };

  try {
    // Send email in production, log in demo mode
    if (process.env.EMAIL_ENABLED === 'true') {
      await transporter.sendMail(mailOptions);
      console.log(`📧 Email sent to ${email} for tracking ${trackingId}`);
    } else {
      // Demo mode - just log instead of sending
      console.log(`📧 Email notification sent to ${email} for tracking ${trackingId}`);
      console.log(`   Status: ${status} - ${message}`);
    }
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// API Routes

// Get all shipments
app.get('/api/shipments', (req, res) => {
  res.json(Array.from(shipments.values()));
});

// Get shipment by tracking ID
app.get('/api/shipment/:id', (req, res) => {
  const shipment = shipments.get(req.params.id);
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }
  
  const history = trackingHistory.get(req.params.id) || [];
  res.json({ ...shipment, history });
});

// Update shipment status
app.post('/api/shipment/:id/update', async (req, res) => {
  const { id } = req.params;
  const { status, location, message, lat, lng } = req.body;
  
  const shipment = shipments.get(id);
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  // Update shipment
  shipment.status = status;
  if (location) {
    shipment.currentLocation = {
      lat: lat || shipment.currentLocation.lat,
      lng: lng || shipment.currentLocation.lng,
      name: location
    };
  }

  // Add to history
  const history = trackingHistory.get(id) || [];
  history.push({
    timestamp: new Date(),
    status,
    location: location || shipment.currentLocation.name,
    message
  });
  trackingHistory.set(id, history);

  // Send email notification
  await sendEmailNotification(
    shipment.recipientEmail,
    id,
    status,
    message
  );

  res.json({ success: true, shipment, history });
});

// Create new shipment
app.post('/api/shipment', async (req, res) => {
  const {
    orderId,
    origin,
    destination,
    carrier,
    estimatedDelivery,
    recipientEmail,
    recipientName,
    packageWeight,
    dimensions
  } = req.body;

  const id = `HS${nextShipmentId++}`;
  
  const newShipment = {
    id,
    orderId,
    status: 'pending',
    origin,
    destination,
    carrier,
    estimatedDelivery,
    currentLocation: { lat: 0, lng: 0, name: origin },
    recipientEmail,
    recipientName,
    packageWeight,
    dimensions
  };

  shipments.set(id, newShipment);
  
  const initialHistory = [{
    timestamp: new Date(),
    status: 'order_placed',
    location: origin,
    message: 'Order placed and confirmed'
  }];
  trackingHistory.set(id, initialHistory);

  // Send initial email
  await sendEmailNotification(
    recipientEmail,
    id,
    'order_placed',
    'Your order has been placed and confirmed'
  );

  res.json({ success: true, shipment: newShipment });
});

// Subscribe to notifications
app.post('/api/subscribe', async (req, res) => {
  const { email, trackingId } = req.body;
  
  const shipment = shipments.get(trackingId);
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  // Update recipient email if different
  shipment.recipientEmail = email;
  
  await sendEmailNotification(
    email,
    trackingId,
    'subscription',
    'You have successfully subscribed to updates for this shipment'
  );

  res.json({ success: true, message: 'Subscribed to notifications' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚢 HollyShip server running on port ${PORT}`);
  console.log(`📦 ${shipments.size} shipments loaded`);
});
