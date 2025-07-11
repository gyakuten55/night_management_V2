'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Save,
  DollarSign,
  Clock,
  Settings as SettingsIcon,
  Percent
} from 'lucide-react'
import { dataService } from '@/lib/storage'
import { StoreSettings } from '@/types'

export default function SettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>({
    hourlySetFee: 5000,
    douhanFee: 3000,
    douhanBackRate: 0.5,
    serviceFee: 0.1,
    taxRate: 0.1,
    businessHours: {
      open: "20:00",
      close: "05:00"
    }
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = () => {
    const currentSettings = dataService.settings.get()
    if (currentSettings) {
      // 既存設定に同伴料金・バック率がない場合はデフォルト値を設定
      setSettings({
        ...currentSettings,
        douhanFee: currentSettings.douhanFee || 3000,
        douhanBackRate: currentSettings.douhanBackRate || 0.5
      })
    }
    setIsLoading(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      dataService.settings.set(settings)
      setSaveMessage('設定を保存しました')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      setSaveMessage('保存に失敗しました')
    }
    setIsSaving(false)
  }

  const handleInputChange = (field: keyof StoreSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleBusinessHoursChange = (field: 'open' | 'close', value: string) => {
    setSettings(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [field]: value
      }
    }))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">設定を読み込み中...</p>
        </div>
      </div>
    )
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
              <h1 className="text-2xl font-bold text-gray-900">店舗設定</h1>
            </div>
            <div className="flex items-center space-x-4">
              {saveMessage && (
                <span className="text-green-600 text-sm">{saveMessage}</span>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? '保存中...' : '設定保存'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* 料金設定 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">料金設定</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    1時間あたりのセット料金
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">¥</span>
                    <input
                      type="number"
                      value={settings.hourlySetFee}
                      onChange={(e) => handleInputChange('hourlySetFee', Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">1時間ごとに課金される基本料金</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    サービス料率
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={settings.serviceFee}
                      onChange={(e) => handleInputChange('serviceFee', Number(e.target.value))}
                      className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      ({(settings.serviceFee * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">（注文料金 + セット料金 + 同伴料金）に対するサービス料の割合</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    同伴料金
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">¥</span>
                    <input
                      type="number"
                      value={settings.douhanFee}
                      onChange={(e) => handleInputChange('douhanFee', Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">同伴ありのお客様1名あたりの料金</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    同伴バック率
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={settings.douhanBackRate}
                      onChange={(e) => handleInputChange('douhanBackRate', Number(e.target.value))}
                      className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      ({(settings.douhanBackRate * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">同伴料金のうち指名キャストに支払われる割合</p>
                </div>
              </div>
            </div>
          </div>

          {/* 税率設定 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <Percent className="h-5 w-5 text-green-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">税率設定</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  消費税率
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={settings.taxRate}
                    onChange={(e) => handleInputChange('taxRate', Number(e.target.value))}
                    className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    ({(settings.taxRate * 100).toFixed(0)}%)
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">請求時に適用される消費税率</p>
              </div>
            </div>
          </div>

          {/* 営業時間設定 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-purple-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">営業時間設定</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    開店時間
                  </label>
                  <input
                    type="time"
                    value={settings.businessHours.open}
                    onChange={(e) => handleBusinessHoursChange('open', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">店舗の開店時間</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    閉店時間
                  </label>
                  <input
                    type="time"
                    value={settings.businessHours.close}
                    onChange={(e) => handleBusinessHoursChange('close', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">店舗の閉店時間（翌日の場合は翌日時間）</p>
                </div>
              </div>
            </div>
          </div>

          {/* 設定プレビュー */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <SettingsIcon className="h-5 w-5 text-orange-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">設定プレビュー</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">現在の設定一覧</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">1時間あたりのセット料金:</span>
                    <span className="font-medium">¥{settings.hourlySetFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">同伴料金:</span>
                    <span className="font-medium">¥{settings.douhanFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">同伴バック率:</span>
                    <span className="font-medium">{(settings.douhanBackRate * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">サービス料:</span>
                    <span className="font-medium">{(settings.serviceFee * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">消費税:</span>
                    <span className="font-medium">{(settings.taxRate * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">営業時間:</span>
                    <span className="font-medium">
                      {settings.businessHours.open} - {settings.businessHours.close}
                    </span>
                  </div>
                </div>
              </div>

              {/* 料金計算例 */}
              <div className="mt-6 bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-3">料金計算例（3時間利用、ドリンク2杯注文、同伴1名の場合）</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <div className="flex justify-between">
                    <span>注文料金:</span>
                    <span>¥2,400（ドリンク2杯）</span>
                  </div>
                  <div className="flex justify-between">
                    <span>セット料金 (3時間):</span>
                    <span>¥{(settings.hourlySetFee * 3).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>同伴料金 (1名):</span>
                    <span>¥{settings.douhanFee.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-blue-200 pt-1 mt-2">
                    <div className="flex justify-between">
                      <span>小計:</span>
                      <span>¥{(2400 + settings.hourlySetFee * 3 + settings.douhanFee).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>サービス料:</span>
                      <span>¥{Math.round((2400 + settings.hourlySetFee * 3 + settings.douhanFee) * settings.serviceFee).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>消費税:</span>
                      <span>¥{Math.round((2400 + settings.hourlySetFee * 3 + settings.douhanFee) * (1 + settings.serviceFee) * settings.taxRate).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t border-blue-300 pt-1 mt-1">
                      <span>合計:</span>
                      <span>¥{Math.round((2400 + settings.hourlySetFee * 3 + settings.douhanFee) * (1 + settings.serviceFee) * (1 + settings.taxRate)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 同伴バック計算例 */}
              <div className="mt-4 bg-pink-50 rounded-lg p-4">
                <h4 className="font-medium text-pink-900 mb-3">同伴バック計算例（上記例で指名キャストがいる場合）</h4>
                <div className="space-y-1 text-sm text-pink-800">
                  <div className="flex justify-between">
                    <span>同伴料金:</span>
                    <span>¥{settings.douhanFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>同伴バック率:</span>
                    <span>{(settings.douhanBackRate * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between font-medium border-t border-pink-300 pt-1 mt-1">
                    <span>指名キャストへのバック:</span>
                    <span>¥{Math.round(settings.douhanFee * settings.douhanBackRate).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 