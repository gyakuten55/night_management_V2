'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign,
  Package,
  Star,
  Search
} from 'lucide-react'
import { dataService } from '@/lib/storage'
import { MenuItem, MenuCategory } from '@/types'

export default function MenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [allItems, setAllItems] = useState<MenuItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showItemModal, setShowItemModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)

  // 新規アイテム用のフォーム状態
  const [newItem, setNewItem] = useState({
    name: '',
    price: 0,
    category: '',
    description: '',
    isAvailable: true,
    isSeasonalSpecial: false,
    backRate: undefined as number | undefined
  })

  // 新規カテゴリ用のフォーム状態
  const [newCategory, setNewCategory] = useState({
    name: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setCategories(dataService.menu.getCategories())
    setAllItems(dataService.menu.getAllItems())
  }

  const filteredItems = allItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleSaveItem = () => {
    if (editingItem) {
      // 更新
      dataService.menu.updateItem(editingItem.id, newItem)
    } else {
      // 新規作成
      dataService.menu.createItem(newItem)
    }
    
    loadData()
    setShowItemModal(false)
    setEditingItem(null)
    setNewItem({
      name: '',
      price: 0,
      category: '',
      description: '',
      isAvailable: true,
      isSeasonalSpecial: false,
      backRate: undefined
    })
  }

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item)
    setNewItem({
      name: item.name,
      price: item.price,
      category: item.category,
      description: item.description || '',
      isAvailable: item.isAvailable,
      isSeasonalSpecial: item.isSeasonalSpecial || false,
      backRate: item.backRate
    })
    setShowItemModal(true)
  }

  const handleDeleteItem = (itemId: string) => {
    if (confirm('このメニューアイテムを削除しますか？')) {
      dataService.menu.deleteItem(itemId)
      loadData()
    }
  }

  const handleSaveCategory = () => {
    if (editingCategory) {
      dataService.menu.updateCategory(editingCategory.id, newCategory)
    } else {
      dataService.menu.createCategory({ ...newCategory, items: [] })
    }
    
    loadData()
    setShowCategoryModal(false)
    setEditingCategory(null)
    setNewCategory({ name: '' })
  }

  const handleEditCategory = (category: MenuCategory) => {
    setEditingCategory(category)
    setNewCategory({ name: category.name })
    setShowCategoryModal(true)
  }

  const handleDeleteCategory = (categoryId: string) => {
    if (confirm('このカテゴリを削除しますか？関連するメニューアイテムも削除されます。')) {
      // カテゴリ内のアイテムを削除
      allItems.filter(item => item.category === categoryId).forEach(item => {
        dataService.menu.deleteItem(item.id)
      })
      // カテゴリを削除
      dataService.menu.deleteCategory(categoryId)
      loadData()
    }
  }

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    return category?.name || '不明なカテゴリ'
  }

  const statsData = {
    totalItems: allItems.length,
    totalCategories: categories.length,
    availableItems: allItems.filter(item => item.isAvailable).length,
    seasonalItems: allItems.filter(item => item.isSeasonalSpecial).length
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
              <h1 className="text-2xl font-bold text-gray-900">メニュー管理</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCategoryModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                カテゴリ追加
              </button>
              <button
                onClick={() => setShowItemModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                メニュー追加
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
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">総メニュー数</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.totalItems}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">カテゴリ数</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.totalCategories}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Package className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">提供可能</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.availableItems}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">季節限定</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.seasonalItems}</p>
              </div>
            </div>
          </div>
        </div>

        {/* フィルターとサーチ */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                カテゴリフィルター
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">すべてのカテゴリ</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メニュー検索
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="メニュー名で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* メニュー一覧 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              メニュー一覧 ({filteredItems.length}件)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    メニュー名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    カテゴリ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    価格・バック率
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.name}
                            {item.isSeasonalSpecial && (
                              <Star className="inline h-4 w-4 text-yellow-500 ml-1" />
                            )}
                          </div>
                          {item.description && (
                            <div className="text-sm text-gray-500">{item.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getCategoryName(item.category)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">
                        ¥{item.price.toLocaleString()}
                      </div>
                      {item.backRate && (
                        <div className="text-xs text-blue-600">
                          バック率: {(item.backRate * 100).toFixed(0)}%
                        </div>
                      )}
                      {!item.backRate && (
                        <div className="text-xs text-gray-400">
                          バックなし
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.isAvailable 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.isAvailable ? '提供中' : '提供停止'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEditItem(item)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* カテゴリ管理セクション */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">カテゴリ管理</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {categories.map((category) => (
                <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-900">{category.name}</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    {allItems.filter(item => item.category === category.id).length}個のメニュー
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* メニューアイテム追加/編集モーダル */}
      {showItemModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingItem ? 'メニュー編集' : 'メニュー追加'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メニュー名
                  </label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    価格
                  </label>
                  <input
                    type="number"
                    value={newItem.price}
                    onChange={(e) => setNewItem({...newItem, price: Number(e.target.value)})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    カテゴリ
                  </label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">カテゴリを選択</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    説明
                  </label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    バック率 (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={newItem.backRate ? (newItem.backRate * 100) : ''}
                    onChange={(e) => {
                      const value = e.target.value
                      setNewItem({
                        ...newItem, 
                        backRate: value === '' ? undefined : Number(value) / 100
                      })
                    }}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="バックなしの場合は空欄"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    空欄の場合はバックなし。1-100の数値で入力してください。
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newItem.isAvailable}
                      onChange={(e) => setNewItem({...newItem, isAvailable: e.target.checked})}
                      className="mr-2"
                    />
                    提供可能
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newItem.isSeasonalSpecial}
                      onChange={(e) => setNewItem({...newItem, isSeasonalSpecial: e.target.checked})}
                      className="mr-2"
                    />
                    季節限定
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowItemModal(false)
                    setEditingItem(null)
                    setNewItem({
                      name: '',
                      price: 0,
                      category: '',
                      description: '',
                      isAvailable: true,
                      isSeasonalSpecial: false,
                      backRate: undefined
                    })
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveItem}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* カテゴリ追加/編集モーダル */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCategory ? 'カテゴリ編集' : 'カテゴリ追加'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    カテゴリ名
                  </label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCategoryModal(false)
                    setEditingCategory(null)
                    setNewCategory({ name: '' })
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveCategory}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 