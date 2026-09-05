import { http, qs } from '../../../core/http';
import type { OrderDetail, OrderListItem } from '../../../core/types';

/** API de ordenes (feature orders-client / orders-lab). */

export interface OrdersList {
  data: OrderListItem[];
  total: number;
}

export interface OrderCreateInput {
  orderNumber: string;
  patient: string;
  [k: string]: unknown;
}

export const ordersApi = {
  list: (params?: Record<string, string>) => http.get<OrdersList>(`/orders${qs(params)}`),
  get: (id: string) => http.get<OrderDetail>(`/orders/${id}`),
  create: (input: OrderCreateInput) => http.post<OrderDetail>('/orders', input),
  checkOrderNumber: (value: string) =>
    http.get<{ available: boolean }>(`/orders/order-number/${encodeURIComponent(value)}`),
};
