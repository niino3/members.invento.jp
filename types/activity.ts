export type ActivityType = 
  | 'customer_created'
  | 'customer_updated'
  | 'service_created'
  | 'service_updated'
  | 'service_log_created'
  | 'inquiry_created'
  | 'inquiry_resolved';

export interface Activity {
  id: string;
  type: ActivityType;
  entityId: string;
  entityName: string;
  userId: string;
  userName: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface ActivityFirestore {
  type: ActivityType;
  entityId: string;
  entityName: string;
  userId: string;
  userName: string;
  createdAt: FirebaseFirestore.Timestamp;
  metadata?: Record<string, any>;
}