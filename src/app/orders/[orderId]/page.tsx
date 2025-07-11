'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Plus, 
  Minus,
  DollarSign,
  Users,
  Clock,
  Receipt,
  Trash2
} from 'lucide-react'
import { dataService } from '@/lib/storage'
import { Order, MenuItem, MenuCategory, Cast, Table, DouhanBack } from '@/types'

interface OrderPageProps {
  params: { orderId: string }
}

export default function OrderPage({ params }: OrderPageProps) {
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [table, setTable] = useState<Table | null>(null)
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [casts, setCasts] = useState<Cast[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [showBackCastModal, setShowBackCastModal] = useState(false)
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  const loadData = useCallback(() => {
    const orderData = dataService.orders.getById(params.orderId)
    if (!orderData) {
      router.push('/tables')
      return
    }

    setOrder(orderData)
    
    const tableData = dataService.tables.getById(orderData.tableId)
    setTable(tableData)

    const categories = dataService.menu.getCategories()
    setMenuCategories(categories)
    setMenuItems(dataService.menu.getAllItems())
    setCasts(dataService.casts.getAll())

    if (categories.length > 0) {
      setSelectedCategory(categories[0].id)
    }
  }, [params.orderId, router])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 時間を定期的に更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000) // 1秒ごとに更新

    return () => clearInterval(timer)
  }, [])

  // 今日出勤中のキャストを取得
  const getTodayWorkingCasts = () => {
    const today = new Date().toISOString().split('T')[0]
    const todayShifts = dataService.shifts.getAll().filter(shift => 
      new Date(shift.date).toISOString().split('T')[0] === today &&
      shift.status === 'working'
    )
    
    return casts.filter(cast => 
      cast.isActive && 
      todayShifts.some(shift => shift.castId === cast.id)
    )
  }

  const addItemToOrder = (menuItem: MenuItem, selectedCastId?: string) => {
    if (!order) return

    // 同じ商品で同じバック対象キャストのアイテムを検索
    const existingItem = order.items.find(item => 
      item.menuItemId === menuItem.id && 
      item.backCastId === selectedCastId
    )
    
    let updatedItems
    if (existingItem) {
      // 既存のアイテムの数量を増加
      updatedItems = order.items.map(item =>
        item.menuItemId === menuItem.id && item.backCastId === selectedCastId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    } else {
      // 新しいアイテムを追加
      updatedItems = [
        ...order.items,
        {
          menuItemId: menuItem.id,
          quantity: 1,
          price: menuItem.price,
          notes: undefined,
          backCastId: selectedCastId
        }
      ]
    }

    updateOrderCalculation(updatedItems)
  }

  // バック対象キャスト選択の処理
  const handleMenuItemClick = (menuItem: MenuItem) => {
    if (menuItem.backRate && menuItem.backRate > 0) {
      // バック率がある商品の場合、キャスト選択モーダルを表示
      setSelectedMenuItem(menuItem)
      setShowBackCastModal(true)
    } else {
      // バック率がない商品の場合、直接注文に追加
      addItemToOrder(menuItem)
    }
  }

  const handleBackCastSelection = (castId?: string) => {
    if (selectedMenuItem) {
      addItemToOrder(selectedMenuItem, castId)
      setShowBackCastModal(false)
      setSelectedMenuItem(null)
    }
  }

  const removeItemFromOrder = (menuItemId: string, backCastId?: string) => {
    if (!order) return

    const updatedItems = order.items
      .map(item =>
        item.menuItemId === menuItemId && item.backCastId === backCastId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
      .filter(item => item.quantity > 0)

    updateOrderCalculation(updatedItems)
  }

  const updateOrderCalculation = (items: typeof order.items) => {
    if (!order) return

    const settings = dataService.settings.get()
    
    // 注文アイテムの合計
    const itemsTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    
    // 時間の計算（分単位で計算し、時間に変換）
    const currentTime = new Date()
    const startTime = new Date(order.startTime)
    const elapsedMinutes = Math.floor((currentTime.getTime() - startTime.getTime()) / (1000 * 60))
    const elapsedHours = Math.max(1, Math.ceil(elapsedMinutes / 60)) // 最低1時間、1分でも超えたら1時間追加
    
    // セット料金の計算
    const setFeeTotal = elapsedHours * (settings?.hourlySetFee || 0)
    
    // 同伴料金の計算
    const douhanCount = order.customerInfo.guests.filter(guest => guest.isDouhan || false).length
    const douhanTotal = douhanCount * (settings?.douhanFee || 3000)
    
    // 同伴バックを計算
    const douhanBacks: DouhanBack[] = []
    order.customerInfo.guests.forEach(guest => {
      if (guest.isDouhan && guest.shimeiCastId) {
        const backAmount = Math.round((settings?.douhanFee || 3000) * (settings?.douhanBackRate || 0.5))
        douhanBacks.push({
          castId: guest.shimeiCastId,
          amount: backAmount
        })
      }
    })
    
    // サービス料と税金の計算
    const subtotal = itemsTotal + setFeeTotal + douhanTotal
    const serviceFee = subtotal * (settings?.serviceFee || 0)
    const tax = (subtotal + serviceFee) * (settings?.taxRate || 0)
    const total = subtotal + serviceFee + tax

    const updatedOrder = {
      ...order,
      items,
      itemsTotal,
      setFeeTotal,
      douhanTotal,
      douhanBacks,
      serviceFee,
      tax,
      total
    }

    dataService.orders.update(order.id, updatedOrder)
    setOrder(updatedOrder)

    // テーブルの情報も更新
    if (table) {
      dataService.tables.update(table.id, { currentOrder: updatedOrder })
    }
  }

  const handleCheckout = () => {
    if (!order || !table) return

    // 会計時にリアルタイム計算で最終料金を更新
    const realtimeCalc = getRealtimeCalculation()
    
    const completedOrder = {
      ...order,
      itemsTotal: realtimeCalc.itemsTotal,
      setFeeTotal: realtimeCalc.setFeeTotal,
      douhanTotal: realtimeCalc.douhanTotal,
      douhanBacks: realtimeCalc.douhanBacks,
      serviceFee: realtimeCalc.serviceFee,
      tax: realtimeCalc.tax,
      total: realtimeCalc.total,
      status: 'completed' as const,
      endTime: new Date()
    }

    dataService.orders.update(order.id, completedOrder)
    
    // テーブルを空席に戻す
    dataService.tables.update(table.id, { 
      status: 'available',
      currentOrder: undefined
    })

    router.push('/tables')
  }

  const getMenuItemName = (menuItemId: string) => {
    const item = menuItems.find(item => item.id === menuItemId)
    return item?.name || '不明な商品'
  }

  const getCastName = (castId?: string) => {
    if (!castId) return 'フリー'
    const cast = casts.find(c => c.id === castId)
    return cast?.name || '不明'
  }

  // リアルタイムでの料金計算（会計モーダル用）
  const getRealtimeCalculation = () => {
    if (!order) return { elapsedMinutes: 0, elapsedHours: 0, itemsTotal: 0, setFeeTotal: 0, douhanTotal: 0, douhanBacks: [], serviceFee: 0, tax: 0, total: 0 }
    
    const settings = dataService.settings.get()
    const itemsTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    
    const startTime = new Date(order.startTime)
    const elapsedMinutes = Math.floor((currentTime.getTime() - startTime.getTime()) / (1000 * 60))
    const elapsedHours = Math.max(1, Math.ceil(elapsedMinutes / 60))
    
    const setFeeTotal = elapsedHours * (settings?.hourlySetFee || 0)
    
    // 同伴料金の計算
    const douhanCount = order.customerInfo.guests.filter(guest => guest.isDouhan || false).length
    const douhanTotal = douhanCount * (settings?.douhanFee || 3000)
    
    // 同伴バックを計算
    const douhanBacks: DouhanBack[] = []
    order.customerInfo.guests.forEach(guest => {
      if (guest.isDouhan && guest.shimeiCastId) {
        const backAmount = Math.round((settings?.douhanFee || 3000) * (settings?.douhanBackRate || 0.5))
        douhanBacks.push({
          castId: guest.shimeiCastId,
          amount: backAmount
        })
      }
    })
    
    const subtotal = itemsTotal + setFeeTotal + douhanTotal
    const serviceFee = subtotal * (settings?.serviceFee || 0)
    const tax = (subtotal + serviceFee) * (settings?.taxRate || 0)
    const total = subtotal + serviceFee + tax

    return { elapsedMinutes, elapsedHours, itemsTotal, setFeeTotal, douhanTotal, douhanBacks, serviceFee, tax, total }
  }

  const filteredMenuItems = menuItems.filter(item => 
    item.category === selectedCategory && item.isAvailable
  )

  if (!order || !table) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">オーダー情報を読み込み中...</p>
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
              <Link href="/tables" className="mr-4">
                <ArrowLeft className="h-6 w-6 text-gray-600 hover:text-gray-900" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                テーブル {table.number} - オーダー管理
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCheckoutModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
              >
                <Receipt className="h-4 w-4 mr-2" />
                お会計
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左側: お客様情報 & 現在のオーダー */}
          <div className="space-y-6">
                        {/* お客様情報 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">お客様情報</h2>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Users className="h-4 w-4 text-gray-400 mr-2" />
                  <span>人数: {order.customerInfo.guests.length}名</span>
                </div>
                
                {/* ゲスト一覧 */}
                <div>
                  <span className="text-sm font-medium text-gray-700 mb-2 block">ゲスト:</span>
                  <div className="space-y-2">
                    {order.customerInfo.guests.map((guest, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                              {index + 1}
                            </span>
                            <span className="font-medium">
                              {guest.name || 'フリー'}
                            </span>
                            {guest.isVip && (
                              <span className="inline-flex px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                VIP
                              </span>
                            )}
                            {guest.isDouhan && (
                              <span className="inline-flex px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded-full">
                                同伴
                              </span>
                            )}
                          </div>
                        </div>
                        {guest.shimeiCastId && (
                          <div className="text-sm text-gray-600 mt-1 ml-6">
                            指名: {getCastName(guest.shimeiCastId)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-gray-400 mr-2" />
                  <span>開始時間: {new Date(order.startTime).toLocaleTimeString()}</span>
                </div>
                
                {order.customerInfo.notes && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">備考:</span>
                    <p className="text-sm text-gray-600 mt-1">{order.customerInfo.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 現在のオーダー */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">注文内容</h2>
              <div className="space-y-3">
                {order.items.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">まだ注文がありません</p>
                ) : (
                  order.items.map((item) => (
                    <div key={item.menuItemId} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div>
                          <span className="font-medium">{getMenuItemName(item.menuItemId)}</span>
                          <span className="text-gray-500 ml-2">¥{item.price.toLocaleString()}</span>
                        </div>
                        {item.backCastId && (
                          <div className="text-xs text-purple-600">
                            バック対象: {getCastName(item.backCastId)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => removeItemFromOrder(item.menuItemId, item.backCastId)}
                          className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => {
                            const menuItem = menuItems.find(mi => mi.id === item.menuItemId)
                            if (menuItem) addItemToOrder(menuItem, item.backCastId)
                          }}
                          className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-200"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 合計金額 */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                {(() => {
                  const realtimeCalc = getRealtimeCalculation()
                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>注文料金:</span>
                        <span>¥{realtimeCalc.itemsTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>セット料金:</span>
                        <span>¥{realtimeCalc.setFeeTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>（{realtimeCalc.elapsedHours}時間）</span>
                        <span></span>
                      </div>
                      <div className="flex justify-between">
                        <span>同伴料金:</span>
                        <span>¥{realtimeCalc.douhanTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>サービス料:</span>
                        <span>¥{Math.round(realtimeCalc.serviceFee).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>税額:</span>
                        <span>¥{Math.round(realtimeCalc.tax).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>合計:</span>
                        <span>¥{Math.round(realtimeCalc.total).toLocaleString()}</span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* 右側: メニュー選択 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">メニュー</h2>
            
            {/* カテゴリ選択 */}
            <div className="mb-4">
              {menuCategories.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">
                    メニューカテゴリがありません。<br />
                    メニュー管理ページからカテゴリを作成してください。
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {menuCategories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* メニューアイテム */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {filteredMenuItems.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">🍽️</div>
                  <p className="text-lg font-medium mb-2">メニューがありません</p>
                  <p className="text-sm text-center">
                    メニュー管理ページからメニューを<br />
                    追加してください
                  </p>
                </div>
              ) : (
                filteredMenuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMenuItemClick(item)}
                    className="p-4 border border-gray-200 rounded-lg text-left hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-blue-600 font-bold">¥{item.price.toLocaleString()}</div>
                    {item.backRate && (
                      <div className="text-xs text-purple-600 font-medium">
                        バック率: {(item.backRate * 100).toFixed(0)}%
                      </div>
                    )}
                    {item.description && (
                      <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                    )}
                    {item.isSeasonalSpecial && (
                      <div className="inline-block mt-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                        季節限定
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

            {/* 会計確認モーダル */}
      {showCheckoutModal && (() => {
        const realtimeCalc = getRealtimeCalculation()
        return (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  お会計確認
                </h3>
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">テーブル {table.number}</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>人数:</span>
                        <span>{order.customerInfo.guests.length}名</span>
                      </div>
                      <div className="flex justify-between">
                        <span>利用時間:</span>
                        <span>{realtimeCalc.elapsedMinutes}分</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>注文料金:</span>
                      <span>¥{realtimeCalc.itemsTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>セット料金:</span>
                      <span>¥{realtimeCalc.setFeeTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>（{realtimeCalc.elapsedHours}時間）</span>
                      <span></span>
                    </div>
                    <div className="flex justify-between">
                      <span>同伴料金:</span>
                      <span>¥{realtimeCalc.douhanTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>サービス料:</span>
                      <span>¥{Math.round(realtimeCalc.serviceFee).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>税額:</span>
                      <span>¥{Math.round(realtimeCalc.tax).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>合計:</span>
                      <span>¥{Math.round(realtimeCalc.total).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowCheckoutModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleCheckout}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    会計完了
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* バック対象キャスト選択モーダル */}
      {showBackCastModal && selectedMenuItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                バック対象キャスト選択
              </h3>
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-900">{selectedMenuItem.name}</div>
                <div className="text-sm text-gray-600">¥{selectedMenuItem.price.toLocaleString()}</div>
                <div className="text-sm text-purple-600">
                  バック率: {selectedMenuItem.backRate && (selectedMenuItem.backRate * 100).toFixed(0)}%
                </div>
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-gray-600">今日出勤中のキャストから選択してください：</p>
                
                {/* バックなしオプション */}
                <button
                  onClick={() => handleBackCastSelection()}
                  className="w-full p-3 border border-gray-300 rounded-lg text-left hover:bg-gray-50"
                >
                  <div className="font-medium text-gray-600">バック対象なし</div>
                  <div className="text-xs text-gray-500">このオーダーにはバックをつけません</div>
                </button>

                {/* 出勤中キャストリスト */}
                {getTodayWorkingCasts().map((cast) => (
                  <button
                    key={cast.id}
                    onClick={() => handleBackCastSelection(cast.id)}
                    className="w-full p-3 border border-gray-300 rounded-lg text-left hover:bg-blue-50 hover:border-blue-300"
                  >
                    <div className="font-medium text-gray-900">{cast.name}</div>
                    <div className="text-xs text-gray-500">出勤中</div>
                  </button>
                ))}

                {getTodayWorkingCasts().length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <p>今日出勤中のキャストがいません</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowBackCastModal(false)
                    setSelectedMenuItem(null)
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 