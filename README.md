# 🚢 HollyShip - Advanced Shipment Tracking Application

> **Next-Generation Shipment Tracking** - Competing with Track17 and AfterShip with revolutionary features!

HollyShip is a modern, feature-rich shipment tracking application designed to be **1000x better** than traditional tracking services. Built with cutting-edge technology and a focus on exceptional user experience.

## ✨ Features

### 🎨 Modern UI/UX
- **Beautiful gradient design** with smooth animations
- **Responsive layout** that works on all devices
- **Interactive cards** with hover effects
- **Real-time status updates** with visual feedback
- **Intuitive navigation** with smooth transitions

### 📍 GPS Navigation & Tracking
- **Interactive maps** powered by Leaflet.js
- **Real-time location tracking** of shipments
- **Visual route display** from origin to destination
- **Custom markers** for origin, current location, and destination
- **Automatic map centering** and zoom

### 📧 Email Notifications
- **Instant email alerts** for every status change
- **Beautiful HTML emails** with branded design
- **Subscription management** for tracking updates
- **Order confirmation emails** when shipments are created
- **Delivery notifications** and more

### 📦 Comprehensive Tracking
- **Multiple shipment management** with grid view
- **Detailed tracking history** with timeline visualization
- **Real-time status updates** (Pending, In Transit, Delivered, etc.)
- **Support for major carriers** (FedEx, UPS, DHL, USPS)
- **Package details** including weight and dimensions

### 📊 Dashboard & Analytics
- **Statistics overview** showing total shipments, in-transit, delivered, and pending
- **Quick search** by tracking number
- **View all shipments** at a glance
- **Filter and sort** capabilities

### 🔧 Additional Features
- **Create new shipments** with easy-to-use form
- **Order management** with unique IDs
- **Recipient information** tracking
- **Estimated delivery dates**
- **Carrier selection**

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/GonLAV/HollyShip.git
   cd HollyShip
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment** (optional)
   ```bash
   cp .env.example .env
   # Edit .env to add your email credentials for production
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open your browser**
   ```
   http://localhost:5000
   ```

## 📖 Usage

### Tracking a Shipment
1. Enter a tracking number in the search box (e.g., `HS100001`)
2. Click "Track" or press Enter
3. View detailed tracking information including:
   - Current status and location
   - GPS map with navigation
   - Complete tracking history
   - Package details

### Creating a New Shipment
1. Click "New Shipment" button
2. Fill in the shipment details:
   - Order ID
   - Carrier
   - Origin and destination
   - Recipient information
   - Package details
3. Click "Create Shipment"
4. Recipient receives confirmation email

### Subscribing to Email Notifications
1. Track a shipment
2. Scroll to "Email Notifications" section
3. Enter your email address
4. Click "Subscribe"
5. Receive instant updates for every status change

## 🎯 API Endpoints

### GET `/api/shipments`
Get all shipments

### GET `/api/shipment/:id`
Get specific shipment details with history

### POST `/api/shipment`
Create a new shipment
```json
{
  "orderId": "ORD-2024-001",
  "carrier": "FedEx",
  "origin": "New York, NY",
  "destination": "Los Angeles, CA",
  "recipientName": "John Doe",
  "recipientEmail": "customer@example.com",
  "packageWeight": "2.5 kg",
  "dimensions": "30x20x15 cm",
  "estimatedDelivery": "2024-12-28"
}
```

### POST `/api/shipment/:id/update`
Update shipment status
```json
{
  "status": "in_transit",
  "location": "Chicago, IL",
  "message": "Package arrived at sorting facility",
  "lat": 41.8781,
  "lng": -87.6298
}
```

### POST `/api/subscribe`
Subscribe to email notifications
```json
{
  "email": "customer@example.com",
  "trackingId": "HS100001"
}
```

## 🛠️ Technology Stack

### Frontend
- **HTML5** with modern semantic markup
- **CSS3** with animations and gradients
- **JavaScript (ES6+)** for interactive features
- **Leaflet.js** for GPS mapping
- **Font Awesome** for icons

### Backend
- **Node.js** runtime
- **Express.js** web framework
- **Nodemailer** for email notifications
- **CORS** for cross-origin requests
- **dotenv** for configuration

## 🎨 Key Differentiators

### vs Track17
✅ More intuitive and modern UI  
✅ Better GPS visualization with interactive maps  
✅ Instant email notifications for all status changes  
✅ Comprehensive tracking history with timeline view  
✅ Support for creating and managing shipments  

### vs AfterShip
✅ Cleaner, more responsive design  
✅ Real-time GPS navigation features  
✅ Beautiful email templates  
✅ Better user experience with animations  
✅ Integrated shipment creation  

## 📱 Screenshots

The application features:
- Vibrant purple gradient background
- Clean white cards with shadows
- Animated transitions and hover effects
- Color-coded status badges
- Interactive maps with custom markers
- Timeline visualization for tracking history

## 🔒 Security Notes

- In demo mode, emails are logged to console instead of being sent
- For production, configure real SMTP credentials in `.env`
- Sensitive data should be encrypted in production
- Use environment variables for all secrets

## 🚀 Future Enhancements

- [ ] SMS notifications
- [ ] Mobile app (iOS/Android)
- [ ] QR code tracking
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Webhook integrations
- [ ] API rate limiting
- [ ] User authentication
- [ ] Database persistence (PostgreSQL/MongoDB)

## 📄 License

MIT License - feel free to use this project for any purpose!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For support, email support@hollyship.example.com or open an issue on GitHub.

---

**Built with ❤️ to revolutionize shipment tracking**