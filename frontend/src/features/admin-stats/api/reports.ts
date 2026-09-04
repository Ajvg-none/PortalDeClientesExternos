import { http } from '../../../core/http';
import type { DashboardData } from '../../../core/types';

/** API de estadisticas (feature admin-stats). */

export const reportsApi = {
  dashboard: () => http.get<DashboardData>('/reports/dashboard'),
};
