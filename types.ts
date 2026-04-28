export enum OrderStatus {
  PENDING = '待接单',          // Pending Acceptance
  ACCEPTED = '已接单',         // Accepted
  PENDING_VISIT = '待上门',    // Pending Visit
  PROCESSING = '处理中',       // Processing
  DEPARTED = '已出发',         // Departed
  ARRIVED = '已到达',          // Arrived
  IN_PROGRESS = '到店维修中',      // In Progress
  PENDING_ACCEPTANCE = '待验收', // Pending Acceptance
  PENDING_PAYMENT = '待付款',  // Pending Payment
  CLOSED = '已关闭',           // Closed
  PENDING_REVIEW = '待评价',   // Pending Review
  REFUNDING = '退款中',        // Refunding
  CANCELLED = '已取消',        // Cancelled
  RESTARTED = '重启',           // Restarted
  ARCHIVED = '已归档'          // Archived
}

export enum UrgencyLevel {
  LOW = '一般',      // Low
  MEDIUM = '中等',   // Medium
  HIGH = '紧急',     // High
  CRITICAL = '严重'  // Critical
}

export interface TimelineEvent {
  title: string;
  timestamp: string;
  description?: string;
  isActive: boolean;
}

export interface Engineer {
  id: string;
  name: string;
  phone: string;
  rating: number;
  latitude: number;
  longitude: number;
  distance: string; // e.g., "2.5km"
  avatarUrl?: string;
}

export interface RepairReport {
  solutionMethod: string;
  solutionDescription: string;
  mediaUrls: string[];
}

export interface CostBreakdown {
  callOutFee: number;
  laborFee: number;
  partsFee: number;
}

export interface WorkOrder {
  id: string;
  title: string;
  location: string;
  status: OrderStatus;
  urgency: UrgencyLevel;
  dateCreated: string; // ISO Date String
  equipmentId?: string;
  imageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  timeline: TimelineEvent[];
  description?: string;
  remarks?: string; // User editable remarks
  engineer?: Engineer;
  cost?: number;
  costBreakdown?: CostBreakdown;
  serialNumber?: string; // Device Serial Number
  scheduledTime?: string; // Scheduled visit time (e.g., "ASAP" or ISO String)
  userRating?: number; // User provided rating (1-5)
  userReview?: string; // User provided review text
  repairReport?: RepairReport;
}

export interface AnalysisResult {
  title: string;
  description: string;
  urgency: UrgencyLevel;
  category: string;
}