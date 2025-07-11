// テーブル管理関連の型
export interface Table {
  id: string;
  number: number;
  seats: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  position: { x: number; y: number };
  currentOrder?: Order;
}

// メニュー管理関連の型
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  isAvailable: boolean;
  isSeasonalSpecial?: boolean;
  backRate?: number; // バック率（0-1、undefinedの場合はバックなし）
}

export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

// オーダー関連の型
export interface OrderItem {
  menuItemId: string;
  quantity: number;
  price: number;
  notes?: string;
  backCastId?: string; // バック対象キャストID（バック率がある商品の場合）
}

export interface CustomerGuest {
  name: string; // お客様名（フリーの場合は空文字）
  shimeiCastId?: string; // 指名キャスト
  isVip?: boolean; // VIP設定
  isDouhan?: boolean; // 同伴あり
}

export interface CustomerInfo {
  guests: CustomerGuest[]; // ゲスト情報配列
  notes?: string; // 備考
}

// 顧客履歴保存用
export interface SavedCustomer {
  id: string;
  name: string;
  visitCount: number;
  lastVisit: Date;
  isVip: boolean;
  preferredCastId?: string;
  notes?: string;
}

export interface DouhanBack {
  castId: string;
  amount: number;
}

export interface Order {
  id: string;
  tableId: string;
  customerInfo: CustomerInfo;
  items: OrderItem[];
  itemsTotal: number; // 注文アイテムの合計
  setFeeTotal: number; // セット料金の合計（時間 × hourlySetFee）
  douhanTotal: number; // 同伴料金の合計
  douhanBacks: DouhanBack[]; // 同伴バック詳細
  serviceFee: number; // サービス料
  tax: number; // 税額
  total: number; // 合計
  status: 'active' | 'completed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
}

// キャスト管理関連の型
export interface Cast {
  id: string;
  name: string;
  hourlyWage: number; // 時給
  isActive: boolean;
}

export interface Shift {
  id: string;
  castId: string;
  date: Date;
  startTime: string;
  endTime?: string;
  status: 'working'; // 出勤のみ
}

// 店舗設定関連の型
export interface StoreSettings {
  hourlySetFee: number; // 1時間あたりのセット料金
  douhanFee: number; // 同伴料金
  douhanBackRate: number; // 同伴バック率（0.1 = 10%）
  serviceFee: number; // サービス料率（0.1 = 10%）
  taxRate: number; // 税率（0.1 = 10%）
  businessHours: {
    open: string;
    close: string;
  };
}

// 日報関連の型
export interface DailyReport {
  date: Date;
  totalSales: number;
  customerCount: number;
  averageSpend: number;
  profit: number; // 利益
  totalWages: number; // 総給与
  castPerformance: CastPerformance[];
  isClosed: boolean; // 締め状態
}

export interface CastPerformance {
  castId: string;
  workHours: number; // 勤務時間
  sales: number;
  shimeiCount: number; // 指名数
  douhanCount: number; // 同伴数
  douhanBackIncome: number; // 同伴バック収入
  calculatedWage: number;
}

// 統計関連の型
export interface SalesAnalytics {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  data: {
    date: string;
    sales: number;
    customers: number;
  }[];
} 