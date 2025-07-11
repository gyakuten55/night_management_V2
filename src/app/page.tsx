import Link from 'next/link'
import { 
  Users, 
  TableProperties, 
  MenuSquare, 
  Settings, 
  FileText, 
  BarChart3,
  Clock,
  Calendar
} from 'lucide-react'

export default function Home() {
  const currentTime = new Date().toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short'
  });

  const menuItems = [
    {
      title: 'テーブル管理',
      description: '席の配置・状況管理・オーダー管理',
      icon: TableProperties,
      href: '/tables',
      color: 'bg-blue-500'
    },
    {
      title: 'メニュー管理',
      description: 'メニュー項目・価格・カテゴリ管理',
      icon: MenuSquare,
      href: '/menu',
      color: 'bg-green-500'
    },
    {
      title: 'キャスト管理',
      description: 'キャスト情報・シフト・給与管理',
      icon: Users,
      href: '/casts',
      color: 'bg-purple-500'
    },
    {
      title: '日報機能',
      description: '売上集計・スタッフ実績・給料計算',
      icon: FileText,
      href: '/reports',
      color: 'bg-orange-500'
    },
    {
      title: '月報機能',
      description: '月間売上分析・キャスト実績・CSV出力',
      icon: Calendar,
      href: '/monthly-reports',
      color: 'bg-indigo-500'
    },
    {
      title: '統計・分析',
      description: '売上分析・ランキング・収益性分析',
      icon: BarChart3,
      href: '/analytics',
      color: 'bg-pink-500'
    },
    {
      title: '店舗設定',
      description: '料金体系・営業時間・その他設定',
      icon: Settings,
      href: '/settings',
      color: 'bg-gray-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                夜職管理システム
              </h1>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{currentTime}</span>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ウェルカムセクション */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            ダッシュボード
          </h2>
          <p className="text-gray-600">
            店舗運営に必要な機能にアクセスできます
          </p>
        </div>

        {/* メニューグリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:scale-105"
              >
                <div className="flex items-center mb-4">
                  <div className={`p-3 rounded-lg ${item.color} text-white mr-4`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>
                </div>
                <p className="text-gray-600 text-sm">
                  {item.description}
                </p>
              </Link>
            );
          })}
        </div>

        {/* クイック情報 */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              本日の状況
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>営業開始時間: 20:00</p>
              <p>現在空席: 8席</p>
              <p>本日の売上: ¥0</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              出勤状況
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>本日出勤予定: 4名</p>
              <p>現在出勤中: 0名</p>
              <p>待機中: 0名</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              システム情報
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>バージョン: 2.0.0</p>
              <p>最終更新: 2024/01/01</p>
              <p>データベース: キャッシュ</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 