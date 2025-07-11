'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  ChevronLeft,
  ChevronRight,
  Users,
  Clock
} from 'lucide-react'
import { dataService } from '@/lib/storage'
import { Shift, Cast } from '@/types'

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [casts, setCasts] = useState<Cast[]>([])
  const [currentWeek, setCurrentWeek] = useState(new Date())

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setShifts(dataService.shifts.getAll())
    setCasts(dataService.casts.getActive())
  }

  // 30分刻みの時間選択肢を生成
  const generateTimeOptions = () => {
    const options = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        options.push(timeString)
      }
    }
    return options
  }

  const timeOptions = generateTimeOptions()

  // 週の開始日（日曜日）を取得
  const getWeekStart = (date: Date) => {
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    return weekStart
  }

  // 週の日付配列を取得
  const getWeekDates = () => {
    const weekStart = getWeekStart(currentWeek)
    const dates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  // 前週・次週の移動
  const goToPreviousWeek = () => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(currentWeek.getDate() - 7)
    setCurrentWeek(newWeek)
  }

  const goToNextWeek = () => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(currentWeek.getDate() + 7)
    setCurrentWeek(newWeek)
  }

  const goToToday = () => {
    setCurrentWeek(new Date())
  }

  // 特定日のキャストのシフト状況を取得
  const getShift = (castId: string, date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return shifts.find(s => 
      s.castId === castId && 
      new Date(s.date).toISOString().split('T')[0] === dateStr
    )
  }

  // シフト状況の変更
  const updateShiftStatus = (castId: string, date: Date, isWorking: boolean) => {
    const dateStr = date.toISOString().split('T')[0]
    const existingShift = shifts.find(s => 
      s.castId === castId && 
      new Date(s.date).toISOString().split('T')[0] === dateStr
    )

    if (!isWorking) {
      // 休みが選択された場合は既存シフトを削除
      if (existingShift) {
        dataService.shifts.delete(existingShift.id)
      }
    } else {
      if (existingShift) {
        // 既存シフトの状態を更新
        dataService.shifts.update(existingShift.id, { status: 'working' })
      } else {
        // 新規シフト作成
        dataService.shifts.create({
          castId,
          date,
          startTime: '20:00',
          endTime: '01:00',
          status: 'working'
        })
      }
    }
    loadData()
  }

  // 時間の更新
  const updateShiftTime = (castId: string, date: Date, timeType: 'start' | 'end', value: string) => {
    const dateStr = date.toISOString().split('T')[0]
    const existingShift = shifts.find(s => 
      s.castId === castId && 
      new Date(s.date).toISOString().split('T')[0] === dateStr
    )

    if (existingShift) {
      if (timeType === 'start') {
        dataService.shifts.update(existingShift.id, { startTime: value })
      } else {
        // 終了時間は空文字列（未設定）も許可
        dataService.shifts.update(existingShift.id, { endTime: value || undefined })
      }
      loadData()
    }
  }

  // 今日の統計
  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0]
    const todayShifts = shifts.filter(s => 
      new Date(s.date).toISOString().split('T')[0] === today
    )
    return {
      working: todayShifts.length,
      total: casts.length
    }
  }

  const weekDates = getWeekDates()
  const todayStats = getTodayStats()
  const today = new Date()
  const isToday = (date: Date) => 
    date.toDateString() === today.toDateString()

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
              <h1 className="text-2xl font-bold text-gray-900">シフト管理</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                出勤状況と時間を設定
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 今日の統計 */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{todayStats.working}</div>
              <div className="text-sm text-gray-600">本日出勤</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{todayStats.total - todayStats.working}</div>
              <div className="text-sm text-gray-600">本日休み</div>
            </div>
          </div>
        </div>

        {/* 週間ナビゲーション */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousWeek}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {weekDates[0].toLocaleDateString('ja-JP', { month: 'long' })}
              </div>
              <div className="text-sm text-gray-600">
                {weekDates[0].toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
              >
                今日
              </button>
              <button
                onClick={goToNextWeek}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* シフト表 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed">
              {/* ヘッダー：曜日 */}
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900 w-32">
                    キャスト
                  </th>
                  {weekDates.map((date, index) => (
                    <th key={index} className={`px-2 py-4 text-center text-sm font-medium w-36 ${
                      isToday(date) ? 'bg-blue-50 text-blue-900' : 'text-gray-700'
                    }`}>
                      <div>{['日', '月', '火', '水', '木', '金', '土'][index]}</div>
                      <div className="text-xs font-normal">
                        {date.getDate()}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* ボディ：キャスト別シフト */}
              <tbody className="divide-y divide-gray-200">
                {casts.map((cast) => (
                  <tr key={cast.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                            <Users className="h-4 w-4 text-purple-600" />
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {cast.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    {weekDates.map((date, index) => {
                      const shift = getShift(cast.id, date)
                      const isWorking = shift !== undefined
                      return (
                        <td key={index} className={`px-1 py-3 text-center w-36 ${
                          isToday(date) ? 'bg-blue-50' : ''
                        }`}>
                          <div className="min-h-[60px] flex flex-col justify-center space-y-1">
                            {/* 状況選択 */}
                            <select
                              value={isWorking ? 'working' : 'off'}
                              onChange={(e) => updateShiftStatus(cast.id, date, e.target.value === 'working')}
                              className={`w-full px-1 py-1 rounded border text-xs font-medium ${
                                isWorking 
                                  ? 'bg-green-100 text-green-800 border-green-200' 
                                  : 'bg-gray-100 text-gray-600 border-gray-200'
                              }`}
                            >
                              <option value="off">休み</option>
                              <option value="working">出勤</option>
                            </select>
                            
                            {/* 時間設定（出勤時のみ） */}
                            {isWorking && shift && (
                              <div className="flex items-center justify-center space-x-0.5">
                                <select
                                  value={shift.startTime}
                                  onChange={(e) => updateShiftTime(cast.id, date, 'start', e.target.value)}
                                  className="text-xs px-0.5 py-0.5 border rounded w-14"
                                >
                                  {timeOptions.map((time) => (
                                    <option key={time} value={time}>
                                      {time}
                                    </option>
                                  ))}
                                </select>
                                <span className="text-xs text-gray-400">-</span>
                                <select
                                  value={shift.endTime || ''}
                                  onChange={(e) => updateShiftTime(cast.id, date, 'end', e.target.value)}
                                  className="text-xs px-0.5 py-0.5 border rounded w-14"
                                >
                                  <option value="">未設定</option>
                                  {timeOptions.map((time) => (
                                    <option key={time} value={time}>
                                      {time}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 使い方ガイド */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">使い方</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <div className="font-medium mb-2">シフト設定：</div>
              <div className="space-y-1">
                <div>• <span className="text-gray-600">休み</span>：勤務なし</div>
                <div>• <span className="text-green-600">出勤</span>：勤務予定</div>
              </div>
            </div>
            <div>
              <div className="font-medium mb-2">操作方法：</div>
              <div className="space-y-1">
                <div>• プルダウンで出勤状況を選択</div>
                <div>• 出勤時は30分刻みで時間を設定</div>
                <div>• 終了時間は「未設定」も選択可能</div>
                <div>• 「今日」ボタンで当日に移動</div>
                <div>• 矢印ボタンで週を移動</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 