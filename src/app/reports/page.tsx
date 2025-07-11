'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Download,
  Calculator,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  FileText
} from 'lucide-react'
import { dataService } from '@/lib/storage'
import { DailyReport, CastPerformance, Cast, StoreSettings } from '@/types'

export default function ReportsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null)
  const [casts, setCasts] = useState<Cast[]>([])
  const [settings, setSettings] = useState<StoreSettings | null>(null)


  // フォーム用の状態
  const [reportForm, setReportForm] = useState({
    totalSales: 0,
    customerCount: 0,
    castPerformances: [] as CastPerformance[]
  })

  useEffect(() => {
    loadData()
  }, [selectedDate])

  const loadData = () => {
    const date = new Date(selectedDate)
    const report = dataService.reports.getByDate(date)
    setDailyReport(report)
    
    // 既存データの型をマイグレーション
    const rawCasts = dataService.casts.getAll()
    const migratedCasts = rawCasts.map(cast => ({
      id: cast.id,
      name: cast.name,
      hourlyWage: cast.hourlyWage || (cast as any).baseWage || 3000,
      isActive: cast.isActive
    }))
    setCasts(migratedCasts)
    setSettings(dataService.settings.get())

    if (report && report.isClosed) {
      // 締め済みの場合は既存データを表示
      setReportForm({
        totalSales: report.totalSales,
        customerCount: report.customerCount,
        castPerformances: report.castPerformance
      })
    } else {
      // 未締めまたは新規の場合は自動算出
      const autoData = calculateAutoData(selectedDate)
      setReportForm({
        totalSales: autoData.totalSales,
        customerCount: autoData.customerCount,
        castPerformances: autoData.castPerformances
      })
    }
  }

  const getCastName = (castId: string) => {
    const cast = casts.find(c => c.id === castId)
    return cast?.name || '不明'
  }

  const getCast = (castId: string) => {
    return casts.find(c => c.id === castId)
  }

  // 指定した日付とキャストの同伴バック収入を計算
  // 指定した日付の完了オーダーを取得
  const getCompletedOrdersForDate = (date: string) => {
    const selectedDateObj = new Date(date)
    const selectedDateStr = selectedDateObj.toISOString().split('T')[0]
    
    return dataService.orders.getAll().filter(order => {
      if (order.status !== 'completed' || !order.endTime) return false
      const orderDateStr = new Date(order.endTime).toISOString().split('T')[0]
      return orderDateStr === selectedDateStr
    })
  }

  // キャストの勤務時間を計算
  const getWorkHoursForCast = (castId: string, date: string): number => {
    const selectedDateObj = new Date(date)
    const selectedDateStr = selectedDateObj.toISOString().split('T')[0]
    const shifts = dataService.shifts.getAll()
    
    const castShift = shifts.find(shift => 
      shift.castId === castId && 
      new Date(shift.date).toISOString().split('T')[0] === selectedDateStr
    )

    if (!castShift || !castShift.startTime) {
      return 0
    }

    const [startHour, startMin] = castShift.startTime.split(':').map(Number)
    const startMinutes = startHour * 60 + startMin
    
    let endMinutes: number
    
    if (castShift.endTime) {
      // 終了時間が設定されている場合
      const [endHour, endMin] = castShift.endTime.split(':').map(Number)
      endMinutes = endHour * 60 + endMin
    } else {
      // 終了時間が未設定の場合のデフォルト処理
      const currentDate = new Date()
      const selectedDate = new Date(date)
      
      if (selectedDate.toDateString() === currentDate.toDateString()) {
        // 当日の場合：現在時刻を使用（まだ勤務中の可能性）
        const now = new Date()
        endMinutes = now.getHours() * 60 + now.getMinutes()
      } else {
        // 過去の日付の場合：営業終了時間（翌日5時）をデフォルトとして使用
        const businessCloseTime = settings?.businessHours?.close || '05:00'
        const [closeHour, closeMin] = businessCloseTime.split(':').map(Number)
        endMinutes = closeHour * 60 + closeMin
      }
    }
    
    // 翌日まで勤務の場合
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60
    }
    
    return (endMinutes - startMinutes) / 60
  }

  // キャストの売上を計算（指名・同伴のオーダーから）
  const getSalesForCast = (castId: string, orders: any[]): number => {
    return orders.reduce((total, order) => {
      const hasShimei = order.customerInfo.guests.some((guest: any) => guest.shimeiCastId === castId)
      return hasShimei ? total + order.total : total
    }, 0)
  }

  // キャストの指名数を計算
  const getShimeiCountForCast = (castId: string, orders: any[]): number => {
    return orders.reduce((count, order) => {
      const shimeiCount = order.customerInfo.guests.filter((guest: any) => guest.shimeiCastId === castId).length
      return count + shimeiCount
    }, 0)
  }

  // キャストの同伴数を計算
  const getDouhanCountForCast = (castId: string, orders: any[]): number => {
    return orders.reduce((count, order) => {
      const douhanCount = order.customerInfo.guests.filter((guest: any) => 
        guest.shimeiCastId === castId && guest.isDouhan
      ).length
      return count + douhanCount
    }, 0)
  }

  // キャストの同伴バック収入を計算
  const getDouhanBackIncomeForCast = (castId: string, orders: any[]): number => {
    return orders.reduce((total, order) => {
      if (!order.douhanBacks) return total
      const castBacks = order.douhanBacks.filter((back: any) => back.castId === castId)
      return total + castBacks.reduce((sum: number, back: any) => sum + back.amount, 0)
    }, 0)
  }

  // 自動算出データを計算
  const calculateAutoData = (date: string) => {
    const completedOrders = getCompletedOrdersForDate(date)
    const activeCasts = casts.filter(cast => cast.isActive)

    // キャスト別データを計算
    const castPerformances = activeCasts.map(cast => {
      const workHours = getWorkHoursForCast(cast.id, date)
      const sales = getSalesForCast(cast.id, completedOrders)
      const shimeiCount = getShimeiCountForCast(cast.id, completedOrders)
      const douhanCount = getDouhanCountForCast(cast.id, completedOrders)
      const douhanBackIncome = getDouhanBackIncomeForCast(cast.id, completedOrders)

      const performance: CastPerformance = {
        castId: cast.id,
        workHours,
        sales,
        shimeiCount,
        douhanCount,
        douhanBackIncome,
        calculatedWage: calculateWage({ castId: cast.id, workHours, sales, shimeiCount, douhanCount, douhanBackIncome, calculatedWage: 0 }, cast)
      }

      return performance
    })

    // 基本情報を計算
    const totalSales = completedOrders.reduce((sum, order) => sum + order.total, 0)
    const customerCount = completedOrders.reduce((sum, order) => sum + order.customerInfo.guests.length, 0)
    const totalWages = castPerformances.reduce((sum, perf) => sum + perf.calculatedWage, 0)
    const profit = totalSales - totalWages
    const averageSpend = customerCount > 0 ? totalSales / customerCount : 0

    return {
      totalSales,
      customerCount,
      totalWages,
      profit,
      averageSpend,
      castPerformances
    }
  }

  const calculateWage = (performance: CastPerformance, cast: Cast | undefined) => {
    if (!cast) return 0

    const baseWage = (cast.hourlyWage || 3000) * performance.workHours // 時給 × 勤務時間
    const shimeiBonus = performance.shimeiCount * 1000 // 指名料
    const douhanBackIncome = performance.douhanBackIncome || 0 // 同伴バック収入

    return baseWage + shimeiBonus + douhanBackIncome
  }

  // 自動算出データを再計算
  const refreshAutoData = () => {
    if (dailyReport && dailyReport.isClosed) {
      alert('締め済みの日報は更新できません')
      return
    }
    
    const autoData = calculateAutoData(selectedDate)
    setReportForm({
      totalSales: autoData.totalSales,
      customerCount: autoData.customerCount,
      castPerformances: autoData.castPerformances
    })
  }

  const saveReport = () => {
    const totalWages = reportForm.castPerformances.reduce((sum, perf) => sum + perf.calculatedWage, 0)
    const profit = reportForm.totalSales - totalWages
    
    const report: DailyReport = {
      date: new Date(selectedDate),
      totalSales: reportForm.totalSales,
      customerCount: reportForm.customerCount,
      averageSpend: reportForm.customerCount > 0 ? reportForm.totalSales / reportForm.customerCount : 0,
      profit,
      totalWages,
      castPerformance: reportForm.castPerformances,
      isClosed: false
    }

    dataService.reports.create(report)
    setDailyReport(report)
    alert('日報を保存しました')
  }

  const closeReport = () => {
    if (!dailyReport) {
      saveReport()
    }
    
    const totalWages = reportForm.castPerformances.reduce((sum, perf) => sum + perf.calculatedWage, 0)
    const profit = reportForm.totalSales - totalWages
    
    const closedReport: DailyReport = {
      date: new Date(selectedDate),
      totalSales: reportForm.totalSales,
      customerCount: reportForm.customerCount,
      averageSpend: reportForm.customerCount > 0 ? reportForm.totalSales / reportForm.customerCount : 0,
      profit,
      totalWages,
      castPerformance: reportForm.castPerformances,
      isClosed: true
    }

    dataService.reports.create(closedReport)
    setDailyReport(closedReport)
    alert('日報を締めました。以降の編集はできません。')
    loadData() // データを再読み込み
  }

  const exportReport = () => {
    if (!dailyReport) return

    const csvContent = [
      ['日付', selectedDate],
      ['総売上', `¥${dailyReport.totalSales.toLocaleString()}`],
      ['客数', `${dailyReport.customerCount}名`],
      ['客単価', `¥${Math.round(dailyReport.averageSpend).toLocaleString()}`],
      ['総給与', `¥${dailyReport.totalWages.toLocaleString()}`],
      ['利益', `¥${dailyReport.profit.toLocaleString()}`],
      ['締め状態', dailyReport.isClosed ? '締め済み' : '未締め'],
      [''],
      ['キャスト名', '勤務時間', '売上', '指名数', '同伴数', '同伴バック収入', '給与'],
      ...dailyReport.castPerformance.map(perf => [
        getCastName(perf.castId),
        `${perf.workHours.toFixed(1)}時間`,
        `¥${perf.sales.toLocaleString()}`,
        `${perf.shimeiCount}回`,
        `${perf.douhanCount}回`,
        `¥${(perf.douhanBackIncome || 0).toLocaleString()}`,
        `¥${Math.round(perf.calculatedWage).toLocaleString()}`
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `日報_${selectedDate}.csv`
    link.click()
  }

  const totalCalculatedWages = reportForm.castPerformances.reduce(
    (sum, perf) => sum + perf.calculatedWage, 
    0
  )
  
  const profit = reportForm.totalSales - totalCalculatedWages

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
              <h1 className="text-2xl font-bold text-gray-900">日報管理</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={refreshAutoData}
                disabled={dailyReport && dailyReport.isClosed}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center disabled:opacity-50"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                自動更新
              </button>
              {dailyReport && (
                <button
                  onClick={exportReport}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV出力
                </button>
              )}
              <button
                onClick={saveReport}
                disabled={dailyReport && dailyReport.isClosed}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center disabled:opacity-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                日報保存
              </button>
              <button
                onClick={closeReport}
                disabled={dailyReport && dailyReport.isClosed}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center disabled:opacity-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                {dailyReport && dailyReport.isClosed ? '締め済み' : '締める'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 日付選択 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">対象日</h2>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
        </div>

        {/* サマリー情報 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">総売上</p>
                <p className="text-2xl font-bold text-gray-900">
                  ¥{reportForm.totalSales.toLocaleString()}
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
                <p className="text-sm font-medium text-gray-600">客数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reportForm.customerCount}名
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
                  ¥{reportForm.customerCount > 0 ? Math.round(reportForm.totalSales / reportForm.customerCount).toLocaleString() : '0'}
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
                <p className="text-sm font-medium text-gray-600">総給与</p>
                <p className="text-2xl font-bold text-gray-900">
                  ¥{Math.round(totalCalculatedWages).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${profit >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                <TrendingUp className={`h-6 w-6 ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">利益</p>
                <p className={`text-2xl font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ¥{Math.round(profit).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 締め状態表示 */}
        {dailyReport && dailyReport.isClosed && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">
                  この日報は締め済みです。データは自動算出された確定値です。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* キャスト別実績 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">キャスト別実績（自動算出）</h2>
            <p className="text-sm text-gray-600 mt-1">完了したオーダーとシフト情報から自動で算出されます</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    キャスト名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    勤務時間
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    売上
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    指名数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    同伴数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    同伴バック収入
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    計算給与
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportForm.castPerformances.map((performance) => {
                  const cast = getCast(performance.castId)
                  return (
                    <tr key={performance.castId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {getCastName(performance.castId)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {performance.workHours.toFixed(1)}時間
                        {(() => {
                          // 終了時間未設定の場合の注意表示
                          const selectedDateObj = new Date(selectedDate)
                          const selectedDateStr = selectedDateObj.toISOString().split('T')[0]
                          const shifts = dataService.shifts.getAll()
                          const castShift = shifts.find(shift => 
                            shift.castId === performance.castId && 
                            new Date(shift.date).toISOString().split('T')[0] === selectedDateStr
                          )
                          if (castShift && castShift.startTime && !castShift.endTime) {
                            const currentDate = new Date()
                            if (selectedDateObj.toDateString() === currentDate.toDateString()) {
                              return <span className="text-xs text-blue-600 block">（現在時刻まで）</span>
                            } else {
                              return <span className="text-xs text-amber-600 block">（終了時間未設定）</span>
                            }
                          }
                          return null
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ¥{performance.sales.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {performance.shimeiCount}回
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {performance.douhanCount}回
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ¥{(performance.douhanBackIncome || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ¥{Math.round(performance.calculatedWage).toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>


    </div>
  )
} 