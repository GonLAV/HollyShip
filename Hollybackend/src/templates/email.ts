export type EmailTemplateName = 'eta_overdue' | 'status_update' | 'digest';

export function renderEmail(template: EmailTemplateName, data: Record<string, unknown> = {}): { subject: string; html: string; text: string } {
  switch (template) {
    case 'eta_overdue': {
      const tn = String(data.trackingNumber ?? '');
      const carrier = String(data.carrier ?? '');
      const eta = String(data.eta ?? '');
      const subject = `Heads up: Delivery window passed for ${tn}`;
      const html = `<h2>Delivery overdue</h2><p>Your package ${tn} (${carrier}) missed its estimated delivery window (${eta}).</p><p>If this persists, please contact support or the carrier.</p>`;
      return { subject, html, text: html.replace(/<[^>]+>/g, '') };
    }
    case 'status_update': {
      const tn = String(data.trackingNumber ?? '');
      const status = String(data.status ?? 'Updated');
      const subject = `Status update: ${status} for ${tn}`;
      const html = `<h2>Status update</h2><p>Package ${tn} is now: <strong>${status}</strong>.</p>`;
      return { subject, html, text: html.replace(/<[^>]+>/g, '') };
    }
    case 'digest': {
      const subject = 'Your HollyShip daily summary';
      const shipped = Number(data.shipmentsToday ?? 0);
      const overdue = Number(data.overdue ?? 0);
      const html = `<h2>Daily summary</h2><p>New shipments today: <strong>${shipped}</strong></p><p>Overdue: <strong style="color:#c00;">${overdue}</strong></p>`;
      return { subject, html, text: html.replace(/<[^>]+>/g, '') };
    }
    default: {
      return { subject: 'HollyShip Notification', html: '<p>Update</p>', text: 'Update' };
    }
  }
}

export const DELAY_REASON_TAXONOMY = [
  'WEATHER',
  'CUSTOMS',
  'ADDRESS_ISSUE',
  'RECIPIENT_UNAVAILABLE',
  'DAMAGED',
  'OPERATIONAL_DELAY',
  'OTHER',
] as const;
