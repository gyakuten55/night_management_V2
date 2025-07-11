'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  BarChart3,
  TrendingUp,
  Crown,
  Star,
  Users,
  DollarSign
} from 'lucide-react'
import { dataService } from '@/lib/storage'
import { DailyReport, Cast, MenuItem } from '@/types'

export default function AnalyticsPage() {
  const [reports, setReports] = useState<DailyReport[]>([])
  const [casts, setCasts] = useState<Cast[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'7days' | '30days' | '90days'>('30days')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setReports(dataService.reports.getAll())
    setCasts(dataService.casts.getAll())
    setMenuItems(dataService.menu.getAllItems())
  }

  const getFilteredReports = () => {
    const now = new Date()
    const daysAgo = selectedPeriod === '7days' ? 7 : selectedPeriod === '30days' ? 30 : 90
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
    
    return reports.filter(report => new Date(report.date) >= startDate)
  }

  const filteredReports = getFilteredReports()

  // 売上統計
  const totalSales = filteredReports.reduce((sum, report) => sum + report.totalSales, 0)
  const totalCustomers = filteredReports.reduce((sum, report) => sum + report.customerCount, 0)
  const averageSpend = totalCustomers > 0 ? totalSales / totalCustomers : 0
  const averageDailySales = filteredReports.length > 0 ? totalSales / filteredReports.length : 0

  // キャストランキング
  const castStats = casts.map(cast => {
    const castReports = filteredReports.flatMap(report => 
      report.castPerformance.filter(perf => perf.castId === cast.id)
    )
    
    const totalSales = castReports.reduce((sum, perf) => sum + perf.sales, 0)
    const totalCustomers = castReports.reduce((sum, perf) => sum + perf.customerCount, 0)
    const totalShimei = castReports.reduce((sum, perf) => sum + perf.shimeiCount, 0)
    const totalDouhan = castReports.reduce((sum, perf) => sum + perf.douhanCount, 0)
    const totalAfter = castReports.reduce((sum, perf) => sum + perf.afterCount, 0)
    const totalWage = castReports.reduce((sum, perf) => sum + perf.calculatedWage, 0)

    return {
      cast,
      totalSales,
      totalCustomers,
      totalShimei,
      totalDouhan,
      totalAfter,
      totalWage,
      averageSpend: totalCustomers > 0 ? totalSales / totalCustomers : 0
    }
  }).sort((a, b) => b.totalSales - a.totalSales)

  // 日別売上推移データ
  const dailySalesData = filteredReports.map(report => ({
    date: new Date(report.date).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' }),
    sales: report.totalSales,
    customers: report.customerCount
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const getPeriodText = () => {
    switch (selectedPeriod) {
      case '7days': return '過去7日間'
      case '30days': return '過去30日間'
      case '90days': return '過去90日間'
      default: return '過去30日間'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="mr-4">
                <ArrowLeft className="h-6 w-6 text-gray-600 hover:text-gray-900" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">統計・分析</h1>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="7days">過去7日間</option>
                <option value="30days">過去30日間</option>
                <option value="90days">過去90日間</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 期間サマリー */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {getPeriodText()}の実績サマリー
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">総売上</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ¥{totalSales.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">総客数</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalCustomers}名
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">平均客単価</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ¥{Math.round(averageSpend).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">日平均売上</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ¥{Math.round(averageDailySales).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 日別売上推移 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">日別売上推移</h3>
          <div className="overflow-x-auto">
            <div className="flex items-end space-x-2 h-64 min-w-full">
              {dailySalesData.map((data, index) => {
                const maxSales = Math.max(...dailySalesData.map(d => d.sales))
                const height = maxSales > 0 ? (data.sales / maxSales) * 200 : 0
                
                return (
                  <div key={index} className="flex flex-col items-center min-w-0 flex-1">
                    <div className="text-xs text-gray-600 mb-1">
                      ¥{Math.round(data.sales / 1000)}k
                    </div>
                    <div
                      className="bg-blue-500 rounded-t w-full min-h-[4px]"
                      style={{ height: `${height}px` }}
                      title={`${data.date}: ¥${data.sales.toLocaleString()}`}
                    />
                    <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-left">
                      {data.date}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* キャストランキング */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 売上ランキング */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <Crown className="h-5 w-5 text-yellow-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">売上ランキング</h3>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {castStats.slice(0, 5).map((stat, index) => (
                  <div key={stat.cast.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">{stat.cast.name}</p>
                        <p className="text-sm text-gray-500">
                          {stat.totalCustomers}名 (平均¥{Math.round(stat.averageSpend).toLocaleString()})
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        ¥{stat.totalSales.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 指名ランキング */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <Star className="h-5 w-5 text-pink-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">指名ランキング</h3>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {castStats
                  .sort((a, b) => b.totalShimei - a.totalShimei)
                  .slice(0, 5)
                  .map((stat, index) => (
                    <div key={stat.cast.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          index === 0 ? 'bg-pink-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="ml-3">
                          <p className="font-medium text-gray-900">{stat.cast.name}</p>
                          <p className="text-sm text-gray-500">
                            同伴{stat.totalDouhan}回・アフター{stat.totalAfter}回
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          {stat.totalShimei}回
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* 詳細統計テーブル */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">キャスト別詳細統計</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    キャスト名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    売上
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    客数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    客単価
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    指名数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    同伴数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アフター数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    給与総額
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {castStats.map((stat) => (
                  <tr key={stat.cast.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {stat.cast.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ¥{stat.totalSales.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.totalCustomers}名
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ¥{Math.round(stat.averageSpend).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.totalShimei}回
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.totalDouhan}回
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.totalAfter}回
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ¥{Math.round(stat.totalWage).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
} 