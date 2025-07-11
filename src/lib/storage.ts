import { 
  Table, 
  MenuItem, 
  MenuCategory, 
  Order, 
  Cast, 
  Shift, 
  StoreSettings, 
  DailyReport,
  SavedCustomer 
} from '@/types';

// キャッシュベースストレージクラス
class CacheStorage {
  private storage: { [key: string]: any } = {};

  // 汎用的なCRUD操作
  set<T>(key: string, data: T): void {
    this.storage[key] = JSON.parse(JSON.stringify(data));
  }

  get<T>(key: string): T | null {
    const data = this.storage[key];
    return data ? JSON.parse(JSON.stringify(data)) : null;
  }

  getAll<T>(prefix: string): T[] {
    const results: T[] = [];
    Object.keys(this.storage).forEach(key => {
      if (key.startsWith(prefix)) {
        results.push(this.storage[key]);
      }
    });
    return results;
  }

  delete(key: string): boolean {
    if (this.storage[key]) {
      delete this.storage[key];
      return true;
    }
    return false;
  }

  update<T>(key: string, updater: (current: T) => T): T | null {
    const current = this.get<T>(key);
    if (current) {
      const updated = updater(current);
      this.set(key, updated);
      return updated;
    }
    return null;
  }

  clear(): void {
    this.storage = {};
  }

  // 検索機能
  search<T>(prefix: string, predicate: (item: T) => boolean): T[] {
    return this.getAll<T>(prefix).filter(predicate);
  }
}

// シングルトンインスタンス
export const cacheStorage = new CacheStorage();

// データアクセス関数群
export const dataService = {
  // テーブル管理
  tables: {
    getAll: (): Table[] => cacheStorage.getAll<Table>('table_'),
    getById: (id: string): Table | null => cacheStorage.get<Table>(`table_${id}`),
    create: (table: Omit<Table, 'id'>): Table => {
      const id = `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newTable = { ...table, id };
      cacheStorage.set(`table_${id}`, newTable);
      return newTable;
    },
    update: (id: string, updates: Partial<Table>): Table | null => {
      return cacheStorage.update<Table>(`table_${id}`, (current) => ({ ...current, ...updates }));
    },
    delete: (id: string): boolean => cacheStorage.delete(`table_${id}`),
    getAvailable: (): Table[] => cacheStorage.search<Table>('table_', t => t.status === 'available'),
  },

  // メニュー管理
  menu: {
    getCategories: (): MenuCategory[] => cacheStorage.getAll<MenuCategory>('menu_category_'),
    getCategory: (id: string): MenuCategory | null => cacheStorage.get<MenuCategory>(`menu_category_${id}`),
    createCategory: (category: Omit<MenuCategory, 'id'>): MenuCategory => {
      const id = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newCategory = { ...category, id };
      cacheStorage.set(`menu_category_${id}`, newCategory);
      return newCategory;
    },
    updateCategory: (id: string, updates: Partial<MenuCategory>): MenuCategory | null => {
      return cacheStorage.update<MenuCategory>(`menu_category_${id}`, (current) => ({ ...current, ...updates }));
    },
    deleteCategory: (id: string): boolean => cacheStorage.delete(`menu_category_${id}`),
    
    getAllItems: (): MenuItem[] => cacheStorage.getAll<MenuItem>('menu_item_'),
    getItem: (id: string): MenuItem | null => cacheStorage.get<MenuItem>(`menu_item_${id}`),
    createItem: (item: Omit<MenuItem, 'id'>): MenuItem => {
      const id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newItem = { ...item, id };
      cacheStorage.set(`menu_item_${id}`, newItem);
      return newItem;
    },
    updateItem: (id: string, updates: Partial<MenuItem>): MenuItem | null => {
      return cacheStorage.update<MenuItem>(`menu_item_${id}`, (current) => ({ ...current, ...updates }));
    },
    deleteItem: (id: string): boolean => cacheStorage.delete(`menu_item_${id}`),
  },

  // オーダー管理
  orders: {
    getAll: (): Order[] => cacheStorage.getAll<Order>('order_'),
    getById: (id: string): Order | null => cacheStorage.get<Order>(`order_${id}`),
    getByTable: (tableId: string): Order[] => cacheStorage.search<Order>('order_', o => o.tableId === tableId),
    getActive: (): Order[] => cacheStorage.search<Order>('order_', o => o.status === 'active'),
    create: (order: Omit<Order, 'id'>): Order => {
      const id = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newOrder = { ...order, id };
      cacheStorage.set(`order_${id}`, newOrder);
      return newOrder;
    },
    update: (id: string, updates: Partial<Order>): Order | null => {
      return cacheStorage.update<Order>(`order_${id}`, (current) => ({ ...current, ...updates }));
    },
    delete: (id: string): boolean => cacheStorage.delete(`order_${id}`),
  },

  // キャスト管理
  casts: {
    getAll: (): Cast[] => cacheStorage.getAll<Cast>('cast_'),
    getById: (id: string): Cast | null => cacheStorage.get<Cast>(`cast_${id}`),
    getActive: (): Cast[] => cacheStorage.search<Cast>('cast_', c => c.isActive),
    create: (cast: Omit<Cast, 'id'>): Cast => {
      const id = `cast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newCast = { ...cast, id };
      cacheStorage.set(`cast_${id}`, newCast);
      return newCast;
    },
    update: (id: string, updates: Partial<Cast>): Cast | null => {
      return cacheStorage.update<Cast>(`cast_${id}`, (current) => ({ ...current, ...updates }));
    },
    delete: (id: string): boolean => cacheStorage.delete(`cast_${id}`),
  },

  // シフト管理
  shifts: {
    getAll: (): Shift[] => cacheStorage.getAll<Shift>('shift_'),
    getById: (id: string): Shift | null => cacheStorage.get<Shift>(`shift_${id}`),
    getByCast: (castId: string): Shift[] => cacheStorage.search<Shift>('shift_', s => s.castId === castId),
    getByDate: (date: Date): Shift[] => {
      const dateStr = date.toISOString().split('T')[0];
      return cacheStorage.search<Shift>('shift_', s => 
        new Date(s.date).toISOString().split('T')[0] === dateStr
      );
    },
    create: (shift: Omit<Shift, 'id'>): Shift => {
      const id = `shift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newShift = { ...shift, id };
      cacheStorage.set(`shift_${id}`, newShift);
      return newShift;
    },
    update: (id: string, updates: Partial<Shift>): Shift | null => {
      return cacheStorage.update<Shift>(`shift_${id}`, (current) => ({ ...current, ...updates }));
    },
    delete: (id: string): boolean => cacheStorage.delete(`shift_${id}`),
  },

  // 店舗設定
  settings: {
    get: (): StoreSettings | null => cacheStorage.get<StoreSettings>('store_settings'),
    set: (settings: StoreSettings): void => cacheStorage.set('store_settings', settings),
    update: (updates: Partial<StoreSettings>): StoreSettings | null => {
      return cacheStorage.update<StoreSettings>('store_settings', (current) => ({ ...current, ...updates }));
    },
  },

  // 日報
  reports: {
    getAll: (): DailyReport[] => cacheStorage.getAll<DailyReport>('report_'),
    getByDate: (date: Date): DailyReport | null => {
      const dateStr = date.toISOString().split('T')[0];
      return cacheStorage.get<DailyReport>(`report_${dateStr}`);
    },
    create: (report: DailyReport): DailyReport => {
      const dateStr = report.date.toISOString().split('T')[0];
      cacheStorage.set(`report_${dateStr}`, report);
      return report;
    },
    update: (date: Date, updates: Partial<DailyReport>): DailyReport | null => {
      const dateStr = date.toISOString().split('T')[0];
      return cacheStorage.update<DailyReport>(`report_${dateStr}`, (current) => ({ ...current, ...updates }));
    },
  },

  // 顧客履歴
  customers: {
    getAll: (): SavedCustomer[] => cacheStorage.getAll<SavedCustomer>('customer_'),
    getById: (id: string): SavedCustomer | null => cacheStorage.get<SavedCustomer>(`customer_${id}`),
    searchByName: (name: string): SavedCustomer[] => {
      return cacheStorage.search<SavedCustomer>('customer_', customer => 
        customer.name.toLowerCase().includes(name.toLowerCase())
      );
    },
    create: (customer: Omit<SavedCustomer, 'id'>): SavedCustomer => {
      const id = `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newCustomer = { ...customer, id };
      cacheStorage.set(`customer_${id}`, newCustomer);
      return newCustomer;
    },
    update: (id: string, updates: Partial<SavedCustomer>): SavedCustomer | null => {
      return cacheStorage.update<SavedCustomer>(`customer_${id}`, (current) => ({ ...current, ...updates }));
    },
    delete: (id: string): boolean => cacheStorage.delete(`customer_${id}`),
    saveFromOrder: (orderCustomerInfo: any): SavedCustomer[] => {
      const customers: SavedCustomer[] = [];
      
      if (orderCustomerInfo.guests) {
        orderCustomerInfo.guests.forEach((guest: any) => {
          if (guest.name && guest.name.trim() !== '') {
            // 既存顧客を検索
            const existingCustomers = dataService.customers.searchByName(guest.name);
            let customer: SavedCustomer;
            
            if (existingCustomers.length > 0) {
              // 既存顧客の場合、訪問回数を増やす
              customer = existingCustomers[0];
              dataService.customers.update(customer.id, {
                visitCount: customer.visitCount + 1,
                lastVisit: new Date(),
                isVip: guest.isVip || customer.isVip,
                preferredCastId: guest.shimeiCastId || customer.preferredCastId
              });
              customers.push(customer);
            } else {
              // 新規顧客の場合
              customer = dataService.customers.create({
                name: guest.name,
                visitCount: 1,
                lastVisit: new Date(),
                isVip: guest.isVip || false,
                preferredCastId: guest.shimeiCastId
              });
              customers.push(customer);
            }
          }
        });
      }
      
      return customers;
    }
  },

  // 初期データセットアップ
  initializeSampleData: (): void => {
    // デフォルト設定
    if (!dataService.settings.get()) {
      dataService.settings.set({
        hourlySetFee: 5000, // 1時間あたり5000円
        douhanFee: 3000, // 同伴料金3000円
        douhanBackRate: 0.5, // 同伴バック率50%
        serviceFee: 0.1, // 10%
        taxRate: 0.1, // 10%
        businessHours: {
          open: "20:00",
          close: "05:00"
        }
      });
    }

    // サンプルテーブルは作成しない（空の状態からスタート）

    // サンプルメニューは作成しない（メニュー管理ページで手動作成）

    // サンプルキャスト
    if (dataService.casts.getAll().length === 0) {
      const sampleCasts = [
        { name: "美咲", hourlyWage: 3000, isActive: true },
        { name: "愛", hourlyWage: 2500, isActive: true },
        { name: "麗", hourlyWage: 2000, isActive: true },
        { name: "花音", hourlyWage: 1500, isActive: true },
      ];

      sampleCasts.forEach(cast => {
        dataService.casts.create(cast);
      });
    }
  }
};

    // データマイグレーション処理
    if (typeof window !== 'undefined') {
      // ブラウザ環境でのみ実行
      const storage = (cacheStorage as any).storage;
      
      // 既存オーダーにdouhanBacksフィールドを追加
      Object.keys(storage).forEach(key => {
        if (key.startsWith('order_')) {
          const order = storage[key];
          if (order && !order.douhanBacks) {
            order.douhanBacks = [];
            storage[key] = order;
          }
        }
        
        // 既存日報データの型変更マイグレーション
        if (key.startsWith('report_')) {
          const report = storage[key];
          if (report) {
            // 新しいフィールドを追加
            if (typeof report.profit === 'undefined') {
              report.profit = 0;
            }
            if (typeof report.totalWages === 'undefined') {
              report.totalWages = 0;
            }
            if (typeof report.isClosed === 'undefined') {
              report.isClosed = false;
            }
            
            // キャスト実績データの型変更
            if (report.castPerformance) {
              report.castPerformance = report.castPerformance.map((perf: any) => ({
                castId: perf.castId,
                workHours: perf.workHours || 0,
                sales: perf.sales || 0,
                shimeiCount: perf.shimeiCount || 0,
                douhanCount: perf.douhanCount || 0,
                douhanBackIncome: perf.douhanBackIncome || 0,
                calculatedWage: perf.calculatedWage || 0
              }));
            }
            
            storage[key] = report;
          }
        }
      });
    }

    dataService.initializeSampleData(); 