import type { EmbeddedWidget } from '@/types';
import type { WidgetFormData } from '@/validations';

export async function getWidgets(businessId: string): Promise<EmbeddedWidget[]> {
  const res = await fetch(`/api/widgets?businessId=${encodeURIComponent(businessId)}`);
  if (!res.ok) throw new Error('Failed to load widgets');
  return res.json();
}

export async function createWidget(
  businessId: string,
  data: WidgetFormData
): Promise<EmbeddedWidget> {
  const res = await fetch('/api/widgets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessId, ...data }),
  });
  if (!res.ok) throw new Error('Failed to create widget');
  return res.json();
}

export async function updateWidget(
  widgetId: string,
  data: Partial<WidgetFormData>
): Promise<EmbeddedWidget> {
  const res = await fetch('/api/widgets', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ widgetId, ...data }),
  });
  if (!res.ok) throw new Error('Failed to update widget');
  return res.json();
}

export async function deleteWidget(widgetId: string): Promise<void> {
  const res = await fetch(`/api/widgets?widgetId=${encodeURIComponent(widgetId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete widget');
}

export async function getWidgetByBusiness(businessId: string): Promise<EmbeddedWidget | null> {
  const res = await fetch(`/api/widget/config?businessId=${encodeURIComponent(businessId)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.widget || null;
}
