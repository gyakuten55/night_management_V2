'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Plus, 
  Users, 
  Clock, 
  DollarSign, 
  Edit,
  ShoppingCart,
  Trash2
} from 'lucide-react'
import { dataService } from '@/lib/storage'
import { Table, Order, Cast, CustomerInfo, CustomerGuest, SavedCustomer, DouhanBack } from '@/types'

export default function TablesPage() {
  const router = useRouter()
  const [tables, setTables] = useState<Table[]>([])

  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showAddTableModal, setShowAddTableModal] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [selectedTableForOrder, setSelectedTableForOrder] = useState<Table | null>(null)
  const [casts, setCasts] = useState<Cast[]>([])
  const [savedCustomers, setSavedCustomers] = useState<SavedCustomer[]>([])
  const [partySize, setPartySize] = useState(1)
  const [guests, setGuests] = useState<CustomerGuest[]>([{ name: '', shimeiCastId: '', isVip: false, isDouhan: false }])
  const [orderNotes, setOrderNotes] = useState('')
  const [nameSearchResults, setNameSearchResults] = useState<{ [key: number]: SavedCustomer[] }>({})
  const [newTable, setNewTable] = useState({
    number: 0
  })

  useEffect(() => {
    // データを読み込み
    setTables(dataService.tables.getAll())
    setCasts(dataService.casts.getAll())
    setSavedCustomers(dataService.customers.getAll())
  }, [])

  const getStatusColor = (status: Table['status']) => {
    switch (status) {
      case 'available':
        return 'bg-green-500 text-white'
      case 'occupied':
        return 'bg-red-500 text-white'
      case 'reserved':
        return 'bg-yellow-500 text-white'
      case 'cleaning':
        return 'bg-gray-500 text-white'
      default:
        return 'bg-gray-300 text-gray-700'
    }
  }

  const getStatusText = (status: Table['status']) => {
    switch (status) {
      case 'available':
        return '空席'
      case 'occupied':
        return '使用中'
      case 'reserved':
        return '予約済'
      case 'cleaning':
        return '清掃中'
      default:
        return '不明'
    }
  }

  const handleTableStatusChange = (tableId: string, newStatus: Table['status']) => {
    dataService.tables.update(tableId, { status: newStatus })
    setTables(dataService.tables.getAll())
  }

  const handleCreateOrder = (table: Table) => {
    setSelectedTableForOrder(table)
    setPartySize(1)
    setGuests([{ name: '', shimeiCastId: '', isVip: false, isDouhan: false }])
    setOrderNotes('')
    setNameSearchResults({})
    setShowCustomerModal(true)
  }

  const handlePartySizeChange = (newSize: number) => {
    setPartySize(newSize)
    const newGuests = Array.from({ length: newSize }, (_, index) => 
      guests[index] || { name: '', shimeiCastId: '', isVip: false, isDouhan: false }
    )
    setGuests(newGuests)
  }

  const handleGuestNameChange = (index: number, name: string) => {
    const newGuests = [...guests]
    newGuests[index] = { ...newGuests[index], name }
    setGuests(newGuests)

    // 名前の検索を実行
    if (name.length > 0) {
      const searchResults = dataService.customers.searchByName(name)
      setNameSearchResults(prev => ({ ...prev, [index]: searchResults }))
    } else {
      setNameSearchResults(prev => ({ ...prev, [index]: [] }))
    }
  }

  const handleSelectSavedCustomer = (index: number, customer: SavedCustomer) => {
    const newGuests = [...guests]
    newGuests[index] = {
      name: customer.name,
      shimeiCastId: customer.preferredCastId || '',
      isVip: customer.isVip,
      isDouhan: false // 保存された顧客情報からは同伴情報は引き継がない
    }
    setGuests(newGuests)
    setNameSearchResults(prev => ({ ...prev, [index]: [] }))
  }

  const handleSaveCustomerInfo = () => {
    if (!selectedTableForOrder) return

    const settings = dataService.settings.get()
    const itemsTotal = 0 // 初期は注文なし
    const setFeeTotal = 0 // 初期は0時間
    
    // 同伴料金を計算
    const douhanCount = guests.filter(guest => guest.isDouhan || false).length
    const douhanTotal = douhanCount * (settings?.douhanFee || 3000)
    
    // 同伴バックを計算
    const douhanBacks: DouhanBack[] = []
    guests.forEach(guest => {
      if (guest.isDouhan && guest.shimeiCastId) {
        const backAmount = Math.round((settings?.douhanFee || 3000) * (settings?.douhanBackRate || 0.5))
        douhanBacks.push({
          castId: guest.shimeiCastId,
          amount: backAmount
        })
      }
    })
    
    const serviceFee = (itemsTotal + setFeeTotal + douhanTotal) * (settings?.serviceFee || 0)
    const tax = (itemsTotal + setFeeTotal + douhanTotal + serviceFee) * (settings?.taxRate || 0)
    const total = itemsTotal + setFeeTotal + douhanTotal + serviceFee + tax

    const customerInfo: CustomerInfo = {
      guests: guests,
      notes: orderNotes || undefined
    }

    const newOrder: Omit<Order, 'id'> = {
      tableId: selectedTableForOrder.id,
      customerInfo,
      items: [],
      itemsTotal,
      setFeeTotal,
      douhanTotal,
      douhanBacks,
      serviceFee,
      tax,
      total,
      status: 'active',
      startTime: new Date()
    }
    
    const order = dataService.orders.create(newOrder)
    
    // 顧客履歴を保存
    dataService.customers.saveFromOrder(customerInfo)
    
    dataService.tables.update(selectedTableForOrder.id, { 
      status: 'occupied',
      currentOrder: order
    })
    
    setTables(dataService.tables.getAll())
    setSavedCustomers(dataService.customers.getAll())
    setShowCustomerModal(false)
    setSelectedTableForOrder(null)
  }

  const handleAddTable = () => {
    // 次のテーブル番号を自動生成
    const existingNumbers = tables.map(t => t.number)
    const nextNumber = Math.max(0, ...existingNumbers) + 1
    setNewTable({ number: nextNumber })
    setShowAddTableModal(true)
  }

  const handleSaveTable = () => {
    // テーブル番号の重複チェック
    const existingTable = tables.find(t => t.number === newTable.number)
    if (existingTable) {
      alert('このテーブル番号は既に使用されています')
      return
    }

    dataService.tables.create({
      number: newTable.number,
      seats: 4, // デフォルトで4席
      status: 'available',
      position: { x: 0, y: 0 }
    })
    
    setTables(dataService.tables.getAll())
    setShowAddTableModal(false)
    setNewTable({ number: 0 })
  }

  const handleDeleteTable = (tableId: string) => {
    const table = tables.find(t => t.id === tableId)
    if (!table) return

    if (table.status === 'occupied') {
      alert('使用中のテーブルは削除できません')
      return
    }

    if (confirm(`テーブル ${table.number} を削除しますか？`)) {
      dataService.tables.delete(tableId)
      setTables(dataService.tables.getAll())
    }
  }

  const statsData = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    cleaning: tables.filter(t => t.status === 'cleaning').length
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
              <h1 className="text-2xl font-bold text-gray-900">テーブル管理</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleAddTable}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                新規テーブル
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">総テーブル数</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">空席</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.available}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">使用中</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.occupied}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">予約済</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.reserved}</p>
              </div>
            </div>
          </div>
        </div>

        {/* テーブルレイアウト */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">フロアレイアウト</h2>
                      <div className="relative bg-gray-100 rounded-lg p-4 min-h-96 overflow-hidden">
              {tables.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <div className="text-4xl mb-4">🍽️</div>
                  <p className="text-lg font-medium mb-2">テーブルがありません</p>
                  <p className="text-sm">「新規テーブル」ボタンからテーブルを追加してください</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 h-full">
                  {tables.map((table) => (
                  <div
                    key={table.id}
                    className={`relative w-full h-16 md:h-20 rounded-lg border-2 border-white shadow-md cursor-pointer transform hover:scale-105 transition-all duration-200 flex flex-col items-center justify-center text-xs md:text-sm font-medium ${getStatusColor(table.status)}`}
                    onClick={() => {
                      if (table.status === 'available') {
                        handleCreateOrder(table)
                      } else if (table.currentOrder) {
                        router.push(`/orders/${table.currentOrder.id}`)
                      }
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteTable(table.id)
                      }}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                      title="テーブルを削除"
                    >
                      ×
                    </button>
                                        <div className="text-sm md:text-base font-bold">
                      {table.status === 'occupied' && table.currentOrder?.customerInfo.guests[0]?.name 
                        ? table.currentOrder.customerInfo.guests[0].name 
                        : table.status === 'occupied' && table.currentOrder
                        ? 'フリー'
                        : `T${table.number}`
                      }
                    </div>
                    <div className="text-xs">{table.seats}席</div>
                  </div>
                  ))}
                </div>
              )}
            </div>
        </div>

        {/* テーブル一覧 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">テーブル一覧</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    テーブル番号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    席数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    オーダー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tables.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <div className="text-3xl mb-2">🍽️</div>
                        <p>テーブルがありません</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tables.map((table) => (
                  <tr key={table.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      テーブル {table.number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {table.seats}名
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(table.status)}`}>
                        {getStatusText(table.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {table.currentOrder ? (
                        <div className="flex items-center">
                          <ShoppingCart className="h-4 w-4 mr-1 text-green-600" />
                          <span>¥{table.currentOrder.total.toLocaleString()}</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {table.status === 'available' && (
                        <button
                          onClick={() => handleCreateOrder(table)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          席立て
                        </button>
                      )}
                      {table.currentOrder && (
                        <Link
                          href={`/orders/${table.currentOrder.id}`}
                          className="text-green-600 hover:text-green-900 ml-2"
                        >
                          オーダー管理
                        </Link>
                      )}
                      <select
                        value={table.status}
                        onChange={(e) => handleTableStatusChange(table.id, e.target.value as Table['status'])}
                        className="ml-2 text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="available">空席</option>
                        <option value="occupied">使用中</option>
                        <option value="reserved">予約済</option>
                        <option value="cleaning">清掃中</option>
                      </select>
                      <button className="text-gray-400 hover:text-gray-600 ml-2">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteTable(table.id)}
                        className="text-red-400 hover:text-red-600 ml-2"
                        title="テーブルを削除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                                          </td>
                    </tr>
                  ))
                )}
                </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 顧客情報入力モーダル */}
      {showCustomerModal && selectedTableForOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                テーブル {selectedTableForOrder.number} - お客様情報
              </h3>
              
              <div className="space-y-6">
                {/* 人数選択 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    人数
                  </label>
                  <select
                    value={partySize}
                    onChange={(e) => handlePartySizeChange(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    {[...Array(selectedTableForOrder.seats)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}名</option>
                    ))}
                  </select>
                </div>

                {/* ゲスト情報入力 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    お客様情報
                  </label>
                  <div className="space-y-4">
                    {guests.map((guest, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-600 mb-3">
                          {index + 1}人目
                        </h4>
                        
                        {/* お客様名 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              お客様名
                            </label>
                            <input
                              type="text"
                              value={guest.name}
                              onChange={(e) => handleGuestNameChange(index, e.target.value)}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                              placeholder="名前を入力（フリーの場合は空欄）"
                            />
                            
                            {/* オートコンプリート */}
                            {nameSearchResults[index] && nameSearchResults[index].length > 0 && (
                              <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                                {nameSearchResults[index].map((customer) => (
                                  <button
                                    key={customer.id}
                                    onClick={() => handleSelectSavedCustomer(index, customer)}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                                  >
                                    <div className="font-medium">{customer.name}</div>
                                    <div className="text-xs text-gray-500">
                                      {customer.visitCount}回来店 
                                      {customer.isVip && <span className="ml-1 text-yellow-600">VIP</span>}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* 指名キャスト */}
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              指名キャスト
                            </label>
                            <select
                              value={guest.shimeiCastId || ''}
                              onChange={(e) => {
                                const newGuests = [...guests]
                                newGuests[index] = { ...newGuests[index], shimeiCastId: e.target.value }
                                setGuests(newGuests)
                              }}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            >
                              <option value="">フリー</option>
                              {casts.filter(cast => cast.isActive).map(cast => (
                                <option key={cast.id} value={cast.id}>{cast.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* VIP設定と同伴設定 */}
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={guest.isVip || false}
                              onChange={(e) => {
                                const newGuests = [...guests]
                                newGuests[index] = { ...newGuests[index], isVip: e.target.checked }
                                setGuests(newGuests)
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm">VIP顧客</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={guest.isDouhan || false}
                              onChange={(e) => {
                                const newGuests = [...guests]
                                newGuests[index] = { ...newGuests[index], isDouhan: e.target.checked }
                                setGuests(newGuests)
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm">同伴あり</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 備考 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    備考
                  </label>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    rows={3}
                    placeholder="特別な要望など"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCustomerModal(false)
                    setSelectedTableForOrder(null)
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveCustomerInfo}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  席立て完了
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* テーブル追加モーダル */}
      {showAddTableModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                新規テーブル追加
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    テーブル番号
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newTable.number}
                    onChange={(e) => setNewTable({...newTable, number: Number(e.target.value)})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <p className="text-sm text-gray-600">※ 席数は自動的に4席に設定されます</p>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAddTableModal(false)
                    setNewTable({ number: 0 })
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveTable}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  追加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  )
} 