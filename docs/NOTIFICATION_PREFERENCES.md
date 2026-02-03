# Notification Preferences Guide

## Overview

HollyShip allows you to customize how and when you receive notifications about your package shipments. You can configure different notification methods with varying frequencies to match your preferences.

## Notification Methods

HollyShip supports the following notification methods:

### 1. Email
Receive notifications via email to your registered email address.

### 2. Push Notifications
Browser-based push notifications (requires browser permission).

### 3. Webhook
Send notifications to a custom webhook endpoint. Useful for integrating with other systems or automation tools.

**Requirements:**
- You must provide a valid HTTPS URL
- Your endpoint must respond to POST requests
- Webhook payloads include shipment status updates and tracking information

### 4. SMS
Receive text message notifications (availability may vary by region).

## Notification Frequencies

You can choose how often you want to receive notifications:

- **Real-time**: Immediate notifications for every shipment status change
- **Daily Digest**: Once-per-day summary of all shipment updates
- **Weekly Summary**: Weekly recap of all shipment activity
- **Never**: Disable notifications for this method

## Configuring Your Preferences

### Via Web Interface

1. Log in to your HollyShip account
2. Navigate to **Settings** > **Notification Preferences**
3. Select your preferred notification method
4. Choose your desired frequency
5. Toggle the **Enabled** switch
6. For webhooks, enter your webhook URL
7. Click **Save Preference**

### Managing Preferences

- **View All Preferences**: See all your configured notification preferences at a glance
- **Edit Preference**: Update the frequency or toggle enabled/disabled status
- **Delete Preference**: Remove a notification preference entirely

### Example Configurations

**Real-time Email Updates:**
- Method: Email
- Frequency: Real-time
- Enabled: Yes

**Daily Webhook Digest:**
- Method: Webhook
- Frequency: Daily
- Enabled: Yes
- Webhook URL: https://your-domain.com/webhook/shipments

**Weekly SMS Summary:**
- Method: SMS
- Frequency: Weekly
- Enabled: Yes

## API Integration

Developers can manage notification preferences programmatically using the HollyShip API.

### List All Preferences

```bash
GET /v1/me/notification-preferences
Authorization: Bearer YOUR_TOKEN
```

### Create or Update Preference

```bash
POST /v1/me/notification-preferences
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "method": "webhook",
  "frequency": "realtime",
  "enabled": true,
  "metadata": {
    "url": "https://example.com/webhook"
  }
}
```

### Update Specific Preference

```bash
PATCH /v1/me/notification-preferences/email
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "frequency": "daily",
  "enabled": true
}
```

### Delete Preference

```bash
DELETE /v1/me/notification-preferences/webhook
Authorization: Bearer YOUR_TOKEN
```

## Rate Limiting

To protect our systems and ensure fair usage, notification preference API endpoints are rate-limited:

- **List/Get**: 60 requests per minute
- **Create/Update/Delete**: 30 requests per minute

If you exceed these limits, you'll receive a `429 Rate Limit Exceeded` response.

## Webhook Payload Format

When using webhook notifications, HollyShip sends POST requests with the following payload structure:

```json
{
  "event": "shipment.status_changed",
  "timestamp": "2026-01-02T19:00:00Z",
  "shipment": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "trackingNumber": "1Z999AA10123456784",
    "status": "IN_TRANSIT",
    "carrier": "UPS",
    "eta": "2026-01-05T18:00:00Z",
    "origin": "Los Angeles, CA",
    "destination": "New York, NY",
    "lastEvent": {
      "status": "IN_TRANSIT",
      "location": "Memphis, TN",
      "timestamp": "2026-01-02T18:30:00Z"
    }
  }
}
```

### Webhook Security

To verify webhook authenticity, check the `X-Webhook-Signature` header if you've configured a webhook secret in your account settings.

## Best Practices

1. **Don't Over-Notify**: Use real-time notifications sparingly to avoid notification fatigue
2. **Combine Methods**: Use email for daily digests and push notifications for critical updates
3. **Test Webhooks**: Verify your webhook endpoint works before enabling in production
4. **Monitor Delivery**: Check that you're receiving notifications as expected
5. **Secure Webhooks**: Use HTTPS and validate webhook signatures

## Troubleshooting

### Not Receiving Notifications

1. Check that the preference is **Enabled**
2. Verify your email address is confirmed
3. For push notifications, ensure browser permissions are granted
4. For webhooks, check that your endpoint is accessible and responding correctly

### Webhook Failures

If your webhook is failing:
1. Verify the URL is correct and uses HTTPS
2. Check that your server is responding with 2xx status codes
3. Review your server logs for errors
4. Test with a service like webhook.site first

### Too Many Notifications

1. Switch from **Real-time** to **Daily** or **Weekly** frequency
2. Disable notifications for less important methods
3. Use filters to only receive notifications for specific shipments (coming soon)

## Privacy & Data

- Notification preferences are stored securely and encrypted
- We never share your webhook URLs or notification settings with third parties
- You can export all your data using the **Data Export** feature
- Deleting your account removes all notification preferences

## Support

For help with notification preferences:
- Check the [API Documentation](docs/openapi.yaml)
- Visit our [Help Center](https://help.hollyship.example.com)
- Contact support at support@hollyship.example.com

## Future Enhancements

We're working on additional notification features:
- ✨ Slack and Microsoft Teams integration
- ✨ Custom notification filters (by carrier, destination, etc.)
- ✨ Notification templates and customization
- ✨ Quiet hours (don't disturb periods)
- ✨ Smart notifications (AI-powered priority detection)

Stay tuned for updates!
