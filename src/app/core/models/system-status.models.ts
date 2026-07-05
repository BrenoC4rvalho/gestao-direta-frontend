export type SystemStatusValue = 'UP' | 'DOWN' | 'DEGRADED';

export interface SystemStatus {
  status: SystemStatusValue;
  database: SystemStatusValue;
}
