'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Users,
  DollarSign,
  Star,
  Search
} from 'lucide-react'
import { dataService } from '@/lib/storage'
import { Cast } from '@/types'

export default function CastsPage() {
  const [casts, setCasts] = useState<Cast[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showCastModal, setShowCastModal] = useState(false)
  const [editingCast, setEditingCast] = useState<Cast | null>(null)

  // 新規キャスト用のフォーム状態
  const [newCast, setNewCast] = useState({
    name: '',
    hourlyWage: 3000,
    isActive: true
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    const rawCasts = dataService.casts.getAll()
    // 既存データの型をマイグレーション
    const migratedCasts = rawCasts.map(cast => ({
      id: cast.id,
      name: cast.name,
      hourlyWage: cast.hourlyWage || (cast as any).baseWage || 3000,
      isActive: cast.isActive
    }))
    setCasts(migratedCasts)
  }

  const filteredCasts = casts.filter(cast => 
    cast.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSaveCast = () => {
    if (editingCast) {
      dataService.casts.update(editingCast.id, newCast)
    } else {
      dataService.casts.create(newCast)
    }
    
    loadData()
    setShowCastModal(false)
    setEditingCast(null)
    setNewCast({
      name: '',
      hourlyWage: 3000,
      isActive: true
    })
  }

  const handleEditCast = (cast: Cast) => {
    setEditingCast(cast)
    setNewCast({
      name: cast.name,
      hourlyWage: cast.hourlyWage,
      isActive: cast.isActive
    })
    setShowCastModal(true)
  }

  const handleDeleteCast = (castId: string) => {
    if (confirm('このキャストを削除しますか？')) {
      dataService.casts.delete(castId)
      loadData()
    }
  }

  const statsData = {
    totalCasts: casts.length,
    activeCasts: casts.filter(cast => cast.isActive).length,
    averageWage: casts.length > 0 ? Math.round(casts.reduce((sum, cast) => sum + (cast.hourlyWage || 3000), 0) / casts.length) : 0
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
              <h1 className="text-2xl font-bold text-gray-900">キャスト管理</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/shifts"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
              >
                シフト管理
              </Link>
              <button
                onClick={() => setShowCastModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                キャスト追加
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">総キャスト数</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.totalCasts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Star className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">在籍中</p>
                <p className="text-2xl font-bold text-gray-900">{statsData.activeCasts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">平均時給</p>
                <p className="text-2xl font-bold text-gray-900">¥{statsData.averageWage.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 検索 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              キャスト検索
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="キャスト名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* キャスト一覧 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              キャスト一覧 ({filteredCasts.length}名)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    キャスト名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    時給
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
                {filteredCasts.map((cast) => (
                  <tr key={cast.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <Users className="h-5 w-5 text-purple-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {cast.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ¥{(cast.hourlyWage || 3000).toLocaleString()}/時
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        cast.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {cast.isActive ? '在籍中' : '退職'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEditCast(cast)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCast(cast.id)}
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

      </main>

      {/* キャスト追加/編集モーダル */}
      {showCastModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCast ? 'キャスト編集' : 'キャスト追加'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    キャスト名
                  </label>
                  <input
                    type="text"
                    value={newCast.name}
                    onChange={(e) => setNewCast({...newCast, name: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    時給
                  </label>
                  <input
                    type="number"
                    value={newCast.hourlyWage}
                    onChange={(e) => setNewCast({...newCast, hourlyWage: Number(e.target.value)})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newCast.isActive}
                      onChange={(e) => setNewCast({...newCast, isActive: e.target.checked})}
                      className="mr-2"
                    />
                    在籍中
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCastModal(false)
                    setEditingCast(null)
                    setNewCast({
                      name: '',
                      hourlyWage: 3000,
                      isActive: true
                    })
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveCast}
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