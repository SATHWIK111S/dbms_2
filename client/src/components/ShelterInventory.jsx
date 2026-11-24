import React, { useState, useEffect } from 'react';
import { Home, Edit3, Clock, Plus, PackageCheck } from 'lucide-react';
import { api } from '../api/client';
import { EmptyState } from './EmptyState';

export default function ShelterInventory({ shelters, supplies, activeRole, showToast, onRefresh }) {
  const [selectedShelterId, setSelectedShelterId] = useState(shelters[0]?.shelter_id || 1);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Edit stock modal
  const [editItem, setEditItem] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [saving, setSaving] = useState(false);

  // Add new item to shelter modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemSupplyId, setNewItemSupplyId] = useState('');
  const [newItemQty, setNewItemQty] = useState('');

  const canManageInventory = activeRole === 'Shelter Logistics Manager' || activeRole === 'Central Command Dispatcher';

  useEffect(() => {
    if (shelters.length > 0 && !selectedShelterId) {
      setSelectedShelterId(shelters[0].shelter_id);
    }
  }, [shelters]);

  useEffect(() => {
    if (selectedShelterId) {
      loadInventory(selectedShelterId);
    }
  }, [selectedShelterId]);

  const loadInventory = async (shelterId) => {
    setLoading(true);
    try {
      const res = await api.getShelterInventory(shelterId);
      setInventory(res.data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load shelter inventory', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    if (activeRole !== 'Shelter Logistics Manager') {
      showToast('Only Shelter Logistics Managers can update warehouse inventory.', 'error');
      return;
    }

    const qty = parseInt(adjustQty, 10);
    if (isNaN(qty) || qty < 0) {
      showToast('Quantity cannot be negative.', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.updateShelterInventory(selectedShelterId, {
        supply_id: editItem.supply_id,
        available_qty: qty
      });
      showToast(`Stock updated for ${editItem.item_name}.`, 'success');
      setEditItem(null);
      loadInventory(selectedShelterId);
      onRefresh();
    } catch (err) {
      showToast(err.message || 'Failed to update stock', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewItem = async (e) => {
    e.preventDefault();
    if (activeRole !== 'Shelter Logistics Manager') {
      showToast('Only Shelter Logistics Managers can add items to stock.', 'error');
      return;
    }
    const qty = parseInt(newItemQty, 10);
    if (isNaN(qty) || qty < 0) {
      showToast('Quantity cannot be negative.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.updateShelterInventory(selectedShelterId, {
        supply_id: parseInt(newItemSupplyId, 10),
        available_qty: qty
      });
      showToast('New item added to shelter stock successfully.', 'success');
      setShowAddModal(false);
      setNewItemSupplyId('');
      setNewItemQty('');
      loadInventory(selectedShelterId);
      onRefresh();
    } catch (err) {
      showToast(err.message || 'Failed to add item', 'error');
    } finally {
      setSaving(false);
    }
  };

  const activeShelter = shelters.find(s => s.shelter_id === selectedShelterId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Shelter Inventory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Supplies in stock across centralized depots and emergency shelters.
          </p>
        </div>

        {canManageInventory && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Stock new item</span>
          </button>
        )}
      </div>

      {/* Shelter Selectors Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {shelters.map((s) => {
          const isSelected = selectedShelterId === s.shelter_id;
          return (
            <button
              key={s.shelter_id}
              onClick={() => setSelectedShelterId(s.shelter_id)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-600 dark:border-teal-500 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400">
                  Shelter #{s.shelter_id}
                </span>
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'}`}></span>
              </div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">{s.shelter_name}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{s.address}</div>

              <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">{s.distinct_supplies_stocked || 0} items</span>
                <span className="text-slate-900 dark:text-white font-semibold">{(s.total_items_stocked || 0).toLocaleString()} units</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Shelter Details */}
      {activeShelter && (
        <div className="px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
          <div>
            <span className="font-semibold text-slate-900 dark:text-white">{activeShelter.shelter_name}</span>
            <span className="mx-2 text-slate-400">•</span>
            <span>{activeShelter.address}</span>
          </div>
          <span className="font-medium text-teal-700 dark:text-teal-400">Active distribution hub</span>
        </div>
      )}

      {/* Stock Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">Supply item</th>
                <th className="py-3 px-4">Standard unit</th>
                <th className="py-3 px-4 text-right">In stock</th>
                <th className="py-3 px-4">Last updated</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-500">Loading shelter stock...</td>
                </tr>
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <EmptyState
                      icon={Home}
                      title="No supplies in this shelter"
                      description="This shelter currently has no items in stock."
                      actionLabel={canManageInventory ? "Stock new item" : null}
                      onAction={canManageInventory ? () => setShowAddModal(true) : null}
                    />
                  </td>
                </tr>
              ) : (
                inventory.map((row) => (
                  <tr key={row.supply_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{row.item_name}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{row.unit}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-sm font-bold ${row.available_qty < 100 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                        {row.available_qty.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1.5 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(row.last_updated).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setEditItem(row);
                          setAdjustQty(row.available_qty);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        title="Update available stock quantity"
                      >
                        <Edit3 className="w-3 h-3 text-slate-500" />
                        <span>Adjust</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Edit Stock */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Update stock level</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Shelter: <span className="font-semibold text-slate-800 dark:text-slate-200">{activeShelter?.shelter_name}</span><br />
              Item: <span className="font-semibold text-teal-700 dark:text-teal-400">{editItem.item_name}</span>
            </p>

            <form onSubmit={handleUpdateStock} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Quantity on hand ({editItem.unit})
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-600 font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-xs font-medium text-white shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Save stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add New Item to Shelter */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Stock new item</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{activeShelter?.shelter_name}</p>

            <form onSubmit={handleAddNewItem} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Select item</label>
                <select
                  required
                  value={newItemSupplyId}
                  onChange={(e) => setNewItemSupplyId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-600"
                >
                  <option value="">-- Choose item --</option>
                  {supplies.map(sup => (
                    <option key={sup.supply_id} value={sup.supply_id}>
                      {sup.item_name} ({sup.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Starting quantity</label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 500"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-600 font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-xs font-medium text-white shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add to inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
