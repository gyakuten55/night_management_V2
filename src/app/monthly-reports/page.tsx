'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Download,
  Calendar,
  DollarSign,
  Calculator,
  TrendingUp,
  Users,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { dataService } from '@/lib/storage'
import { DailyReport, Cast } from '@/types'

interface MonthlySummary {
  totalSales: number
  totalWages: number
  totalProfit: number
  totalCustomers: number
  workingDays: number
  averageSpend: number
}

interface MonthlyCastPerformance {
  castId: string
  castName: string
  totalWorkHours: number
  totalSales: number
  totalShimeiCount: number
  totalDouhanCount: number
  totalDouhanBackIncome: number
  totalWage: number
  workingDays: number
  averageWorkHours: number
}

export default function MonthlyReportsPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([])
  const [casts, setCasts] = useState<Cast[]>([])
  const [selectedDailyReport, setSelectedDailyReport] = useState<DailyReport | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const loadData = useCallback(() => {
    // 締め済みの日報データのみを取得
    const allReports = dataService.reports.getAll()
    const closedReports = allReports.filter(report => 
      report.isClosed && 
      new Date(report.date).getFullYear() === selectedYear &&
      new Date(report.date).getMonth() + 1 === selectedMonth
    )
    
    // 日付順でソート
    closedReports.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    setDailyReports(closedReports)
    setCasts(dataService.casts.getAll())
  }, [selectedYear, selectedMonth])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 月間サマリーを計算
  const calculateMonthlySummary = (): MonthlySummary => {
    return dailyReports.reduce((summary, report) => ({
      totalSales: summary.totalSales + report.totalSales,
      totalWages: summary.totalWages + report.totalWages,
      totalProfit: summary.totalProfit + report.profit,
      totalCustomers: summary.totalCustomers + report.customerCount,
      workingDays: summary.workingDays + 1,
      averageSpend: 0 // 後で計算
    }), {
      totalSales: 0,
      totalWages: 0,
      totalProfit: 0,
      totalCustomers: 0,
      workingDays: 0,
      averageSpend: 0
    })
  }

  // キャスト別月間実績を計算
  const calculateMonthlyCastPerformance = (): MonthlyCastPerformance[] => {
    const castPerformanceMap = new Map<string, MonthlyCastPerformance>()

    // 各キャストの初期化
    casts.forEach(cast => {
      castPerformanceMap.set(cast.id, {
        castId: cast.id,
        castName: cast.name,
        totalWorkHours: 0,
        totalSales: 0,
        totalShimeiCount: 0,
        totalDouhanCount: 0,
        totalDouhanBackIncome: 0,
        totalWage: 0,
        workingDays: 0,
        averageWorkHours: 0
      })
    })

    // 日報データから集計
    dailyReports.forEach(report => {
      report.castPerformance.forEach(perf => {
        const current = castPerformanceMap.get(perf.castId)
        if (current) {
          current.totalWorkHours += perf.workHours
          current.totalSales += perf.sales
          current.totalShimeiCount += perf.shimeiCount
          current.totalDouhanCount += perf.douhanCount
          current.totalDouhanBackIncome += perf.douhanBackIncome || 0
          current.totalWage += perf.calculatedWage
          if (perf.workHours > 0) {
            current.workingDays += 1
          }
        }
      })
    })

    // 平均勤務時間を計算
    const result = Array.from(castPerformanceMap.values()).map(perf => ({
      ...perf,
      averageWorkHours: perf.workingDays > 0 ? perf.totalWorkHours / perf.workingDays : 0
    }))

    // 総売上で降順ソート
    return result.sort((a, b) => b.totalSales - a.totalSales)
  }

  const monthlySummary = calculateMonthlySummary()
  const monthlyCastPerformance = calculateMonthlyCastPerformance()
  
  // 客単価を計算
  monthlySummary.averageSpend = monthlySummary.totalCustomers > 0 
    ? monthlySummary.totalSales / monthlySummary.totalCustomers 
    : 0

  // 前月・次月の移動
  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear(selectedYear - 1)
      setSelectedMonth(12)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear(selectedYear + 1)
      setSelectedMonth(1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  const goToCurrentMonth = () => {
    const now = new Date()
    setSelectedYear(now.getFullYear())
    setSelectedMonth(now.getMonth() + 1)
  }

  // 日報詳細表示
  const showDailyDetail = (report: DailyReport) => {
    setSelectedDailyReport(report)
    setShowDetailModal(true)
  }

  // CSV出力
  const exportMonthlyReport = () => {
    const csvContent = [
      [`${selectedYear}年${selectedMonth}月 月報`],
      [''],
      ['=== 月間サマリー ==='],
      ['営業日数', `${monthlySummary.workingDays}日`],
      ['総売上', `¥${monthlySummary.totalSales.toLocaleString()}`],
      ['総人件費', `¥${monthlySummary.totalWages.toLocaleString()}`],
      ['総利益', `¥${monthlySummary.totalProfit.toLocaleString()}`],
      ['総客数', `${monthlySummary.totalCustomers}名`],
      ['客単価', `¥${Math.round(monthlySummary.averageSpend).toLocaleString()}`],
      [''],
      ['=== キャスト別実績 ==='],
      ['キャスト名', '勤務日数', '総勤務時間', '平均勤務時間', '総売上', '総指名数', '総同伴数', '総同伴バック', '総給与'],
      ...monthlyCastPerformance.map(perf => [
        perf.castName,
        `${perf.workingDays}日`,
        `${perf.totalWorkHours.toFixed(1)}時間`,
        `${perf.averageWorkHours.toFixed(1)}時間`,
        `¥${perf.totalSales.toLocaleString()}`,
        `${perf.totalShimeiCount}回`,
        `${perf.totalDouhanCount}回`,
        `¥${perf.totalDouhanBackIncome.toLocaleString()}`,
        `¥${Math.round(perf.totalWage).toLocaleString()}`
      ]),
      [''],
      ['=== 日別詳細 ==='],
      ['日付', '売上', '客数', '客単価', '人件費', '利益'],
      ...dailyReports.map(report => [
        new Date(report.date).toLocaleDateString('ja-JP'),
        `¥${report.totalSales.toLocaleString()}`,
        `${report.customerCount}名`,
        `¥${Math.round(report.averageSpend).toLocaleString()}`,
        `¥${report.totalWages.toLocaleString()}`,
        `¥${report.profit.toLocaleString()}`
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `月報_${selectedYear}年${selectedMonth.toString().padStart(2, '0')}月.csv`
    link.click()
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
              <h1 className="text-2xl font-bold text-gray-900">月報管理</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={exportMonthlyReport}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV出力
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 月選択 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">対象月</h2>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">
                  {selectedYear}年{selectedMonth}月
                </div>
                <div className="text-sm text-gray-600">
                  営業日数: {monthlySummary.workingDays}日
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={goToCurrentMonth}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                >
                  今月
                </button>
                <button
                  onClick={goToNextMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 月間サマリー */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">総売上</p>
                <p className="text-2xl font-bold text-gray-900">
                  ¥{monthlySummary.totalSales.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calculator className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">総人件費</p>
                <p className="text-2xl font-bold text-gray-900">
                  ¥{monthlySummary.totalWages.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${monthlySummary.totalProfit >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                <TrendingUp className={`h-6 w-6 ${monthlySummary.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">総利益</p>
                <p className={`text-2xl font-bold ${monthlySummary.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ¥{monthlySummary.totalProfit.toLocaleString()}
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
                  {monthlySummary.totalCustomers}名
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
                <p className="text-sm font-medium text-gray-600">客単価</p>
                <p className="text-2xl font-bold text-gray-900">
                  ¥{Math.round(monthlySummary.averageSpend).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 日別一覧 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">日別実績</h2>
            <p className="text-sm text-gray-600 mt-1">締め済みの日報のみ表示されます。日付をクリックで詳細表示</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    日付
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
                    人件費
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    利益
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    詳細
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dailyReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      締め済みの日報データがありません
                    </td>
                  </tr>
                ) : (
                  dailyReports.map((report) => (
                    <tr key={report.date.toString()} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {new Date(report.date).toLocaleDateString('ja-JP', { 
                          month: 'short', 
                          day: 'numeric',
                          weekday: 'short'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ¥{report.totalSales.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {report.customerCount}名
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ¥{Math.round(report.averageSpend).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ¥{report.totalWages.toLocaleString()}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        report.profit >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        ¥{report.profit.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <button
                          onClick={() => showDailyDetail(report)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          詳細
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* キャスト別月間実績 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">キャスト別月間実績</h2>
            <p className="text-sm text-gray-600 mt-1">締め済み日報から自動算出</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    キャスト名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    勤務日数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    総勤務時間
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    平均勤務時間
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    総売上
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    総指名数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    総同伴数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    総同伴バック
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    総給与
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {monthlyCastPerformance.map((performance) => (
                  <tr key={performance.castId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {performance.castName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {performance.workingDays}日
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {performance.totalWorkHours.toFixed(1)}時間
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {performance.averageWorkHours.toFixed(1)}時間
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ¥{performance.totalSales.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {performance.totalShimeiCount}回
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {performance.totalDouhanCount}回
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ¥{performance.totalDouhanBackIncome.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ¥{Math.round(performance.totalWage).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 日報詳細モーダル */}
      {showDetailModal && selectedDailyReport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {new Date(selectedDailyReport.date).toLocaleDateString('ja-JP', { 
                    year: 'numeric',
                    month: 'long', 
                    day: 'numeric',
                    weekday: 'long'
                  })} の日報詳細
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* サマリー */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-xs text-blue-600">売上</p>
                  <p className="text-lg font-bold text-blue-900">
                    ¥{selectedDailyReport.totalSales.toLocaleString()}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-xs text-green-600">客数</p>
                  <p className="text-lg font-bold text-green-900">
                    {selectedDailyReport.customerCount}名
                  </p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-xs text-yellow-600">客単価</p>
                  <p className="text-lg font-bold text-yellow-900">
                    ¥{Math.round(selectedDailyReport.averageSpend).toLocaleString()}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-xs text-purple-600">人件費</p>
                  <p className="text-lg font-bold text-purple-900">
                    ¥{selectedDailyReport.totalWages.toLocaleString()}
                  </p>
                </div>
                <div className={`p-4 rounded-lg ${selectedDailyReport.profit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  <p className={`text-xs ${selectedDailyReport.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>利益</p>
                  <p className={`text-lg font-bold ${selectedDailyReport.profit >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                    ¥{selectedDailyReport.profit.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* キャスト別実績 */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        キャスト
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        勤務時間
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        売上
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        指名数
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        同伴数
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        給与
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedDailyReport.castPerformance.map((perf) => {
                      const cast = casts.find(c => c.id === perf.castId)
                      return (
                        <tr key={perf.castId}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">
                            {cast?.name || '不明'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {perf.workHours.toFixed(1)}時間
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            ¥{perf.sales.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {perf.shimeiCount}回
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {perf.douhanCount}回
                          </td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">
                            ¥{Math.round(perf.calculatedWage).toLocaleString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 