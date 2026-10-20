'use client';
import { useState, useMemo, useEffect } from 'react';
import { useMarsam } from '@/lib/store';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { Pagination } from '@/components/common/Pagination';
import { BarcodeStickerModal } from '@/components/supplies/BarcodeStickerModal';
import { playScanSuccessBeep, playScanErrorBeep } from '@/lib/audio/beep';
import {
  ShoppingBag, Search, Plus, Minus, Trash2, Printer, CheckCircle,
  AlertTriangle, DollarSign, Package, TrendingUp, Barcode, ArrowUpRight,
  Filter, Tag, User as UserIcon, X, Edit3, Volume2
} from 'lucide-react';

export default function SuppliesPage() {
  const {
    supplyItems, supplySales, students,
    addSupplyItem, updateSupplyItem, deleteSupplyItem, updateSupplyStock, createSupplySale, settings
  } = useMarsam();

  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'financials'>('pos');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Pagination States
  const [inventoryPage, setInventoryPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const { isSubmitting: isCheckingOut, execute: executeCheckout } = useAsyncAction();
  const { isSubmitting: isAddingProduct, execute: executeAddProduct } = useAsyncAction();
  const { isSubmitting: isUpdatingProduct, execute: executeUpdateProduct } = useAsyncAction();
  const { isSubmitting: isDeletingProduct, execute: executeDeleteProduct } = useAsyncAction();

  // Edit and Delete Modal States
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    category: 'ألوان',
    barcode: '',
    costPrice: 0,
    sellPrice: 0,
    stockQty: 10,
    minStock: 3
  });
  const [deletingProduct, setDeletingProduct] = useState<any | null>(null);

  // POS Cart State
  const [cart, setCart] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [customerType, setCustomerType] = useState<'walkin' | 'student'>('student');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [walkinName, setWalkinName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'instapay' | 'vodafone' | 'card'>('cash');
  const [notes, setNotes] = useState('');
  
  // Barcode quick input
  const [barcodeInput, setBarcodeInput] = useState('');

  // Add Product Modal
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'ألوان',
    barcode: '',
    costPrice: 0,
    sellPrice: 0,
    stockQty: 10,
    minStock: 3
  });

  // Invoice Modal
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);

  // Barcode Sticker Modal State
  const [stickerProduct, setStickerProduct] = useState<any | null>(null);

  // Instant Scanner Feedback Toast
  const [scanToast, setScanToast] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!scanToast) return;
    const timer = setTimeout(() => setScanToast(null), 3500);
    return () => clearTimeout(timer);
  }, [scanToast]);

  // Central Barcode Processor (Works with USB Handheld Laser Scanners & Screen Input)
  const processScannedBarcode = (scanned: string) => {
    const code = scanned.trim();
    if (!code) return;

    const found = supplyItems.find(p => p.barcode.trim().toLowerCase() === code.toLowerCase());
    if (found) {
      if (found.stockQty <= 0) {
        playScanErrorBeep();
        setScanToast({ type: 'error', message: `⚠️ نفد مخزون: "${found.name}" (الرصيد: 0)` });
        return;
      }
      addToCart(found.id);
      playScanSuccessBeep();
      setScanToast({ type: 'success', message: `✅ تم مسح بالسكانر: "${found.name}" (+1 في الفاتورة)` });
    } else {
      playScanErrorBeep();
      setScanToast({ type: 'warning', message: `⚠️ الباركود [${code}] غير مسجل في المخزن!` });
    }
  };

  // Global Hardware Barcode Scanner Hook
  useBarcodeScanner({
    onScan: (scanned) => processScannedBarcode(scanned),
    enabled: true
  });

  const categories = useMemo(() => {
    const set = new Set(supplyItems.map(i => i.category));
    return ['all', ...Array.from(set)];
  }, [supplyItems]);

  const filteredItems = useMemo(() => {
    return supplyItems.filter(item => {
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = item.name.includes(search) || item.barcode.includes(search);
      return matchesCat && matchesSearch;
    });
  }, [supplyItems, selectedCategory, search]);

  const paginatedInventory = useMemo(() => {
    const start = (inventoryPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, inventoryPage]);

  const paginatedSales = useMemo(() => {
    const start = (salesPage - 1) * ITEMS_PER_PAGE;
    return supplySales.slice(start, start + ITEMS_PER_PAGE);
  }, [supplySales, salesPage]);

  // Cart operations
  const addToCart = (productId: string) => {
    const product = supplyItems.find(p => p.id === productId);
    if (!product || product.stockQty <= 0) return;

    setCart(prev => {
      const existing = prev.find(i => i.productId === productId);
      if (existing) {
        if (existing.quantity >= product.stockQty) return prev;
        return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    const product = supplyItems.find(p => p.id === productId);
    setCart(prev => {
      return prev.map(i => {
        if (i.productId === productId) {
          const newQty = i.quantity + delta;
          if (newQty <= 0) return null;
          if (product && newQty > product.stockQty) return i;
          return { ...i, quantity: newQty };
        }
        return i;
      }).filter(Boolean) as Array<{ productId: string; quantity: number }>;
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    processScannedBarcode(barcodeInput);
    setBarcodeInput('');
  };

  // Handle Edit Product
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editForm.name.trim() || Number(editForm.sellPrice) <= 0) {
      alert('برجاء كتابة اسم الأداة وتحديد سعر بيع صحيح أكبر من الصفر');
      return;
    }

    executeUpdateProduct(() => {
      updateSupplyItem(editingProduct.id, {
        name: editForm.name,
        category: editForm.category,
        barcode: editForm.barcode,
        costPrice: Number(editForm.costPrice),
        sellPrice: Number(editForm.sellPrice),
        stockQty: Number(editForm.stockQty),
        minStock: Number(editForm.minStock)
      });
      setEditingProduct(null);
    });
  };

  // Handle Delete Product
  const handleConfirmDelete = () => {
    if (!deletingProduct) return;
    executeDeleteProduct(() => {
      deleteSupplyItem(deletingProduct.id);
      setCart(prev => prev.filter(c => c.productId !== deletingProduct.id));
      setDeletingProduct(null);
    });
  };

  // Cart totals
  const cartSummary = useMemo(() => {
    let subtotal = 0;
    let totalItems = 0;
    cart.forEach(c => {
      const p = supplyItems.find(item => item.id === c.productId);
      if (p) {
        subtotal += p.sellPrice * c.quantity;
        totalItems += c.quantity;
      }
    });
    return { subtotal, totalItems };
  }, [cart, supplyItems]);

  // Checkout
  const handleCheckout = () => {
    if (cart.length === 0) return;

    let customerName = walkinName || 'عميل زائر';
    let customerId: string | undefined = undefined;

    if (customerType === 'student') {
      const student = students.find(s => s.id === selectedStudentId);
      if (student) {
        customerName = student.name;
        customerId = student.id;
      } else {
        alert('برجاء اختيار الطالب المشتري');
        return;
      }
    }

    executeCheckout(() => {
      const sale = createSupplySale({
        customerType,
        customerName,
        customerId,
        items: cart,
        paymentMethod,
        notes
      });

      setCart([]);
      setNotes('');
      setWalkinName('');
      setCurrentInvoice(sale);
    });
  };

  // Financial calculations
  const totalSalesRevenue = supplySales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalSalesCost = supplySales.reduce((acc, s) => acc + s.totalCost, 0);
  const totalSalesProfit = totalSalesRevenue - totalSalesCost;
  const profitMargin = totalSalesRevenue > 0 ? Math.round((totalSalesProfit / totalSalesRevenue) * 100) : 0;
  const inventoryAssetValue = supplyItems.reduce((acc, i) => acc + (i.costPrice * i.stockQty), 0);
  const lowStockCount = supplyItems.filter(i => i.stockQty <= i.minStock).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black gradient-text flex items-center gap-2">
            <ShoppingBag className="text-teal-400" size={26} />
            متجر ومخزن الأدوات الفنية
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            بيع الأدوات ومتابعة المخزون مع فصل مالي كامل عن حسابات الكورسات
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1.5 p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'pos' ? 'bg-teal-600 text-white shadow-md shadow-blue-600/25' : 'text-slate-600 hover:text-teal-400 hover:bg-slate-50'}`}
          >
            نقطة البيع (POS)
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'inventory' ? 'bg-teal-600 text-white shadow-md shadow-blue-600/25' : 'text-slate-600 hover:text-teal-400 hover:bg-slate-50'}`}
          >
            المخزون
            {lowStockCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                {lowStockCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('financials')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'financials' ? 'bg-teal-600 text-white shadow-md shadow-blue-600/25' : 'text-slate-600 hover:text-teal-400 hover:bg-slate-50'}`}
          >
            الماليات والأرباح
          </button>
        </div>
      </div>

      {/* ================= TAB 1: POS ================= */}
      {activeTab === 'pos' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Products Catalog (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Live Barcode Scanner Feedback Toast */}
            {scanToast && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all shadow-md ${
                  scanToast.type === 'success'
                    ? 'bg-teal-600 text-white shadow-teal-500/20'
                    : scanToast.type === 'error'
                    ? 'bg-red-600 text-white shadow-red-500/20'
                    : 'bg-amber-500 text-white shadow-amber-500/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Volume2 size={16} />
                  <span>{scanToast.message}</span>
                </div>
                <button onClick={() => setScanToast(null)} className="text-white/80 hover:text-white">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Search, Barcode & Quick Add Button */}
            <div className="grid sm:grid-cols-12 gap-3">
              <form onSubmit={handleBarcodeSubmit} className="relative sm:col-span-5">
                <Barcode size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-400" />
                <input
                  className="input pr-10 text-sm font-mono"
                  placeholder="امسح الباركود بالسكانر..."
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  autoFocus
                />
              </form>
              <div className="relative sm:col-span-4">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pr-10 text-sm"
                  placeholder="بحث باسم الأداة..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowAddProduct(true)}
                className="btn btn-primary text-xs font-bold py-2.5 px-3 flex items-center justify-center gap-1.5 sm:col-span-3 shadow-md shadow-teal-500/15"
                title="إضافة خامة أو أداة جديدة للمخزن"
              >
                <Plus size={15} /> إضافة صنف جديد
              </button>
            </div>

            {/* Categories Chips */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-teal-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-500/30 hover:text-teal-400'}`}
                >
                  {cat === 'all' ? 'جميع الأدوات' : cat}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredItems.map(item => {
                const isOutOfStock = item.stockQty <= 0;
                const isLowStock = item.stockQty <= item.minStock && !isOutOfStock;
                const inCart = cart.find(c => c.productId === item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => !isOutOfStock && addToCart(item.id)}
                    className={`glass p-4 rounded-xl flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group bg-white border border-slate-200 ${isOutOfStock ? 'opacity-40 cursor-not-allowed' : 'hover:border-teal-500/40 hover:shadow-md hover:shadow-blue-500/5'}`}
                  >
                    {/* Card Header: Category & Quick Actions */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-teal-400 font-semibold">{item.category}</span>
                      <div className="flex items-center gap-1">
                        {inCart && (
                          <span className="bg-teal-600 text-white font-bold text-xs px-1.5 py-0.5 rounded-full flex items-center justify-center shadow-xs">
                            {inCart.quantity}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStickerProduct(item);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                          title="طباعة استيكرات باركود للقطعة"
                        >
                          <Barcode size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProduct(item);
                            setEditForm({
                              name: item.name,
                              category: item.category,
                              barcode: item.barcode,
                              costPrice: item.costPrice,
                              sellPrice: item.sellPrice,
                              stockQty: item.stockQty,
                              minStock: item.minStock
                            });
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-teal-400 hover:bg-slate-100 transition-colors"
                          title="تعديل بيانات وسعر الأداة"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingProduct(item);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="حذف الأداة من المخزن"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mt-0.5 line-clamp-2">{item.name}</h4>
                      <p className="text-xs text-slate-400 font-mono mt-1">كود: {item.barcode}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-lg font-black text-teal-300 font-mono">{item.sellPrice} ج</span>
                      </div>
                      <span className={`badge text-xs ${isOutOfStock ? 'badge-danger' : isLowStock ? 'badge-info' : 'badge-gray'}`}>
                        {isOutOfStock ? 'نفد المخزون' : `متبقي ${item.stockQty}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cart & Checkout Sidebar (1 Col) */}
          <div className="glass p-5 rounded-2xl flex flex-col justify-between space-y-4 bg-white border border-slate-200">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <ShoppingBag size={20} className="text-teal-400" />
                  فاتورة البيع الحالية
                </h3>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="text-xs text-red-500 hover:underline">
                    مسح السلة
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              <div className="space-y-2 mt-4 max-h-60 overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-sm">
                    السلة فارغة. اضغط على أداة أو امسح الباركود لإضافتها.
                  </div>
                ) : (
                  cart.map(c => {
                    const product = supplyItems.find(p => p.id === c.productId);
                    if (!product) return null;
                    return (
                      <div key={c.productId} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-sm">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-semibold text-slate-800 truncate text-xs">{product.name}</p>
                          <p className="text-xs text-teal-300 font-mono font-bold">{product.sellPrice * c.quantity} ج ({product.sellPrice} ج للقطعة)</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => updateCartQty(c.productId, -1)} className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-600">
                            <Minus size={12} />
                          </button>
                          <span className="font-bold text-xs w-5 text-center text-slate-800">{c.quantity}</span>
                          <button onClick={() => updateCartQty(c.productId, 1)} className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-600">
                            <Plus size={12} />
                          </button>
                          <button onClick={() => removeFromCart(c.productId)} className="p-1 text-red-500 hover:text-red-700 mr-1">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Customer Selector */}
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setCustomerType('student')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${customerType === 'student' ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                  >
                    طالب مقيد
                  </button>
                  <button
                    onClick={() => setCustomerType('walkin')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${customerType === 'walkin' ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                  >
                    مشتري خارجي
                  </button>
                </div>

                {customerType === 'student' ? (
                  <div>
                    <label className="block text-xs text-slate-600 font-semibold mb-1">اختر الطالب:</label>
                    <select
                      className="input text-xs"
                      value={selectedStudentId}
                      onChange={e => setSelectedStudentId(e.target.value)}
                    >
                      <option value="">-- اختر من قائمة الطلاب --</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.qrToken})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-slate-600 font-semibold mb-1">اسم المشتري الخارجي:</label>
                    <input
                      className="input text-xs"
                      placeholder="مثال: أحمد مصطفى"
                      value={walkinName}
                      onChange={e => setWalkinName(e.target.value)}
                    />
                  </div>
                )}

                {/* Payment Method */}
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">طريقة الدفع:</label>
                  <select
                    className="input text-xs"
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                  >
                    <option value="cash">نقداً (كاش للخزنة)</option>
                    <option value="instapay">انستاباي (InstaPay)</option>
                    <option value="vodafone">فودافون كاش</option>
                    <option value="card">بطاقة بنكية / فيزا</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Total and Checkout Button */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">إجمالي القطع:</span>
                <span className="font-bold text-slate-800">{cartSummary.totalItems} قطع</span>
              </div>
              <div className="flex items-center justify-between text-lg">
                <span className="font-bold text-slate-800">المبلغ المطلوب:</span>
                <span className="font-black text-2xl text-teal-300 font-mono">{cartSummary.subtotal} ج</span>
              </div>

              <button
                disabled={cart.length === 0 || isCheckingOut}
                onClick={handleCheckout}
                className="w-full btn btn-primary py-3 text-base flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-600/25"
              >
                <Printer size={18} />
                {isCheckingOut ? 'جاري إتمام البيع...' : 'إتمام البيع وطباعة الفاتورة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: INVENTORY ================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="glass p-4 rounded-xl bg-white border border-slate-200">
              <p className="text-xs text-slate-500 font-semibold">إجمالي الأصناف</p>
              <p className="text-2xl font-black text-teal-300 mt-1">{supplyItems.length}</p>
            </div>
            <div className="glass p-4 rounded-xl bg-white border border-slate-200">
              <p className="text-xs text-slate-500 font-semibold">إجمالي قطع المخزن</p>
              <p className="text-2xl font-black text-teal-400 mt-1">
                {supplyItems.reduce((acc, i) => acc + i.stockQty, 0)} قطعة
              </p>
            </div>
            <div className="glass p-4 rounded-xl bg-white border border-slate-200">
              <p className="text-xs text-slate-500 font-semibold">أصناف أوشكت على النفاد</p>
              <p className="text-2xl font-black text-red-500 mt-1">{lowStockCount}</p>
            </div>
            <div className="glass p-4 rounded-xl bg-white border border-slate-200">
              <p className="text-xs text-slate-500 font-semibold">قيمة المخزون (بسعر الشراء)</p>
              <p className="text-2xl font-black text-blue-800 mt-1">{inventoryAssetValue.toLocaleString()} ج</p>
            </div>
          </div>

          {/* Action and Search Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pr-9 text-sm"
                placeholder="بحث في المخزون بالاسم أو الباركود..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setInventoryPage(1);
                }}
              />
            </div>
            <button onClick={() => setShowAddProduct(true)} className="btn btn-primary text-sm flex items-center gap-1.5 shadow-md shadow-blue-600/20">
              <Plus size={16} /> إضافة صنف جديد
            </button>
          </div>

          {/* Table */}
          <div className="glass rounded-2xl overflow-hidden border border-slate-200 bg-white">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
                <tr>
                  <th className="p-3">الباركود</th>
                  <th className="p-3">اسم الأداة</th>
                  <th className="p-3">القسم</th>
                  <th className="p-3">سعر الشراء</th>
                  <th className="p-3">سعر البيع</th>
                  <th className="p-3">الربح المتوقع</th>
                  <th className="p-3">الكمية بالمخزن</th>
                  <th className="p-3 text-center">الرصيد السريع</th>
                  <th className="p-3 text-center">إدارة الصنف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedInventory.map(item => {
                  const isLow = item.stockQty <= item.minStock;
                  return (
                    <tr key={item.id} className="hover:bg-teal-500/10/30 transition-colors">
                      <td className="p-3 font-mono text-xs text-teal-300 font-bold">{item.barcode}</td>
                      <td className="p-3 font-semibold text-slate-800">{item.name}</td>
                      <td className="p-3"><span className="badge badge-teal text-xs">{item.category}</span></td>
                      <td className="p-3 text-slate-500">{item.costPrice} ج</td>
                      <td className="p-3 font-bold text-slate-900">{item.sellPrice} ج</td>
                      <td className="p-3 text-teal-300 font-bold font-mono">+{item.sellPrice - item.costPrice} ج</td>
                      <td className="p-3">
                        <span className={`badge ${item.stockQty === 0 ? 'badge-danger' : isLow ? 'badge-info' : 'badge-teal'}`}>
                          {item.stockQty} {isLow && item.stockQty > 0 && '(أوشك على النفاد)'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                          <button
                            onClick={() => updateSupplyStock(item.id, -1)}
                            className="p-1 rounded hover:bg-slate-200 text-red-500"
                            title="خصم قطعة"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="text-xs px-2 font-mono font-bold text-slate-800">{item.stockQty}</span>
                          <button
                            onClick={() => updateSupplyStock(item.id, 1)}
                            className="p-1 rounded hover:bg-slate-200 text-teal-300"
                            title="إضافة قطعة للمخزن"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setStickerProduct(item)}
                            className="p-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:border-blue-400 transition-all shadow-xs"
                            title="طباعة استيكرات باركود للصقها على كل قطعة"
                          >
                            <Barcode size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingProduct(item);
                              setEditForm({
                                name: item.name,
                                category: item.category,
                                barcode: item.barcode,
                                costPrice: item.costPrice,
                                sellPrice: item.sellPrice,
                                stockQty: item.stockQty,
                                minStock: item.minStock
                              });
                            }}
                            className="p-1.5 rounded-lg border border-teal-500/20 bg-teal-500/10 text-teal-300 hover:bg-teal-500/15 hover:border-teal-500/40 transition-all shadow-xs"
                            title="تعديل بيانات الأداة"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingProduct(item)}
                            className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-400 transition-all shadow-xs"
                            title="حذف الأداة نهائياً من المخزن"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <Pagination
              currentPage={inventoryPage}
              totalItems={filteredItems.length}
              pageSize={ITEMS_PER_PAGE}
              onPageChange={setInventoryPage}
              className="p-3 border-t border-slate-100"
            />
          </div>
        </div>
      )}

      {/* ================= TAB 3: FINANCIALS ================= */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          {/* Financial KPIs (Separated for Supplies only) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass p-5 rounded-2xl border-r-4 border-teal-500/60 bg-white">
              <p className="text-xs text-slate-500 font-semibold">إجمالي مبيعات الأدوات</p>
              <p className="text-2xl font-black text-teal-300 mt-1">{totalSalesRevenue.toLocaleString()} ج</p>
              <p className="text-xs text-slate-400 mt-1">خزينة متجر الأدوات</p>
            </div>
            <div className="glass p-5 rounded-2xl border-r-4 border-teal-500/40 bg-white">
              <p className="text-xs text-slate-500 font-semibold">تكلفة البضاعة المباعة</p>
              <p className="text-2xl font-black text-teal-400 mt-1">{totalSalesCost.toLocaleString()} ج</p>
              <p className="text-xs text-slate-400 mt-1">رأس المال المسترد</p>
            </div>
            <div className="glass p-5 rounded-2xl border-r-4 border-teal-500/60 bg-white">
              <p className="text-xs text-slate-500 font-semibold">صافي أرباح الأدوات فقط</p>
              <p className="text-2xl font-black text-blue-800 mt-1">{totalSalesProfit.toLocaleString()} ج</p>
              <p className="text-xs text-slate-400 mt-1">هامش ربح {profitMargin}%</p>
            </div>
            <div className="glass p-5 rounded-2xl border-r-4 border-slate-300 bg-white">
              <p className="text-xs text-slate-500 font-semibold">عدد فواتير الأدوات</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{supplySales.length}</p>
              <p className="text-xs text-slate-400 mt-1">ترقيم SHP-2026</p>
            </div>
          </div>

          {/* Invoices List */}
          <div className="glass p-5 rounded-2xl bg-white border border-slate-200">
            <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
              <Tag size={18} className="text-teal-400" />
              سجل فواتير بيع الأدوات (خزينة الأدوات المستقلة)
            </h3>

            <div className="divide-y divide-slate-100">
              {paginatedSales.map(sale => (
                <div key={sale.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
                        {sale.invoiceNumber}
                      </span>
                      <span className="font-bold text-sm text-slate-800">{sale.customerName}</span>
                      <span className="badge badge-gray text-xs">
                        {sale.customerType === 'student' ? 'طالب' : 'خارجي'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {sale.date} • {sale.items.map(i => `${i.productName} (${i.quantity})`).join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <p className="font-black text-sm text-teal-300 font-mono">{sale.totalAmount} ج</p>
                      <p className="text-xs text-slate-400">ربح: +{sale.profit} ج</p>
                    </div>
                    <button
                      onClick={() => setCurrentInvoice(sale)}
                      className="btn btn-secondary btn-sm flex items-center gap-1 text-teal-400 hover:text-teal-300 hover:border-teal-500/30"
                    >
                      <Printer size={13} />
                      عرض / طباعة
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              currentPage={salesPage}
              totalItems={supplySales.length}
              pageSize={ITEMS_PER_PAGE}
              onPageChange={setSalesPage}
              className="pt-3 border-t border-slate-100"
            />
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD PRODUCT ================= */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl p-6 rounded-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">إضافة أداة / منتج جديد</h3>
              <button onClick={() => setShowAddProduct(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 font-semibold mb-1">اسم الأداة أو الخامة:</label>
                <input
                  className="input text-sm"
                  placeholder="مثال: ألوان مائية فنانين 24 لون"
                  value={newProduct.name}
                  onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">القسم:</label>
                  <select
                    className="input text-sm"
                    value={newProduct.category}
                    onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                  >
                    <option value="ألوان">ألوان</option>
                    <option value="فرش وأدوات">فرش وأدوات</option>
                    <option value="ورق وسكتشات">ورق وسكتشات</option>
                    <option value="كانفاس ومجسمات">كانفاس ومجسمات</option>
                    <option value="أقلام وفحم">أقلام وفحم</option>
                    <option value="نحت وصلصال">نحت وصلصال</option>
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs text-slate-600 font-semibold">كود الباركود:</label>
                    <button
                      type="button"
                      onClick={() => setNewProduct({ ...newProduct, barcode: `ART-${Math.floor(100000 + Math.random() * 900000)}` })}
                      className="text-[11px] text-teal-600 hover:underline font-bold"
                      title="توليد كود باركود فريد للقطعة"
                    >
                      🎲 كود تلقائي
                    </button>
                  </div>
                  <input
                    className="input text-sm font-mono"
                    placeholder="امسح بالسكانر أو اضغط كود تلقائي"
                    value={newProduct.barcode}
                    onChange={e => setNewProduct({ ...newProduct, barcode: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">سعر الشراء (التكلفة):</label>
                  <input
                    type="number"
                    className="input text-sm"
                    value={newProduct.costPrice || ''}
                    onChange={e => setNewProduct({ ...newProduct, costPrice: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">سعر البيع للطالب:</label>
                  <input
                    type="number"
                    className="input text-sm font-bold text-teal-300"
                    value={newProduct.sellPrice || ''}
                    onChange={e => setNewProduct({ ...newProduct, sellPrice: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">الكمية الأولية بالمخزن:</label>
                  <input
                    type="number"
                    className="input text-sm"
                    value={newProduct.stockQty}
                    onChange={e => setNewProduct({ ...newProduct, stockQty: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">حد التنبيه بنقص المخزون:</label>
                  <input
                    type="number"
                    className="input text-sm"
                    value={newProduct.minStock}
                    onChange={e => setNewProduct({ ...newProduct, minStock: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <button
                disabled={isAddingProduct}
                onClick={() => {
                  if (!newProduct.name || !newProduct.sellPrice) {
                    alert('برجاء كتابة الاسم وسعر البيع');
                    return;
                  }
                  executeAddProduct(() => {
                    addSupplyItem(newProduct);
                    setShowAddProduct(false);
                    setNewProduct({
                      name: '', category: 'ألوان', barcode: '', costPrice: 0,
                      sellPrice: 0, stockQty: 10, minStock: 3
                    });
                  });
                }}
                className="btn btn-primary flex-1 shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isAddingProduct ? 'جاري الحفظ...' : 'حفظ الأداة في المخزون'}
              </button>
              <button onClick={() => setShowAddProduct(false)} className="btn btn-secondary">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT PRODUCT ================= */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl p-6 rounded-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Edit3 size={18} className="text-teal-400" />
                تعديل بيانات الأداة / المنتج
              </h3>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 font-semibold mb-1">اسم الأداة أو الخامة:</label>
                <input
                  className="input text-sm"
                  required
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">القسم / التصنيف:</label>
                  <input
                    className="input text-sm"
                    required
                    value={editForm.category}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">كود الباركود:</label>
                  <input
                    className="input text-sm font-mono font-bold text-teal-300"
                    required
                    value={editForm.barcode}
                    onChange={e => setEditForm({ ...editForm, barcode: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">سعر الشراء (التكلفة):</label>
                  <input
                    type="number"
                    className="input text-sm"
                    value={editForm.costPrice}
                    onChange={e => setEditForm({ ...editForm, costPrice: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">سعر البيع للطالب:</label>
                  <input
                    type="number"
                    className="input text-sm font-bold text-teal-300"
                    required
                    value={editForm.sellPrice}
                    onChange={e => setEditForm({ ...editForm, sellPrice: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">الكمية الحالية بالمخزن:</label>
                  <input
                    type="number"
                    className="input text-sm font-bold"
                    value={editForm.stockQty}
                    onChange={e => setEditForm({ ...editForm, stockQty: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">حد التنبيه بنقص المخزون:</label>
                  <input
                    type="number"
                    className="input text-sm"
                    value={editForm.minStock}
                    onChange={e => setEditForm({ ...editForm, minStock: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="submit"
                  disabled={isUpdatingProduct}
                  className="btn btn-primary flex-1 shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUpdatingProduct ? 'جاري حفظ التعديلات...' : 'حفظ التعديلات'}
                </button>
                <button type="button" onClick={() => setEditingProduct(null)} className="btn btn-secondary">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE CONFIRMATION ================= */}
      {deletingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-red-100 shadow-2xl p-6 rounded-2xl max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3 text-red-600 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0 border border-red-200">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">تأكيد حذف الأداة</h3>
                <p className="text-xs text-slate-500">سيتم إزالة الصنف من قائمة المخزون</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">اسم الأداة:</span>
                <strong className="text-slate-900">{deletingProduct.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">كود الباركود:</span>
                <span className="font-mono text-teal-300 font-bold">{deletingProduct.barcode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الرصيد بالمخزن:</span>
                <span className="font-bold text-slate-800">{deletingProduct.stockQty} قطعة</span>
              </div>
            </div>

            <div className="text-xs text-slate-600">
              هل أنت متأكد من رغبتك في حذف هذا الصنف نهائياً من قاعدة بيانات المخزن؟
            </div>

            <div className="pt-2 border-t border-slate-100 flex gap-2">
              <button
                onClick={handleConfirmDelete}
                disabled={isDeletingProduct}
                className="btn btn-danger bg-red-600 hover:bg-red-700 text-white flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold shadow-sm"
              >
                {isDeletingProduct ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
              <button
                onClick={() => setDeletingProduct(null)}
                className="btn btn-secondary border-slate-200 text-slate-700"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PRINTABLE INVOICE ================= */}
      {currentInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setCurrentInvoice(null)}
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-800"
            >
              <X size={20} />
            </button>

            {/* Receipt Content */}
            <div id="printable-receipt" className="space-y-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-black text-slate-900">{settings.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">قسم متجر ومبيعات الأدوات الفنية</p>
                <p className="text-xs text-slate-400">{settings.address} • {settings.phone}</p>
                <div className="mt-2 inline-block bg-teal-500/10 px-3 py-1 rounded text-xs font-mono font-bold text-teal-300 border border-teal-500/20">
                  فاتورة رقم: {currentInvoice.invoiceNumber}
                </div>
              </div>

              <div className="text-xs space-y-1 text-slate-600 border-b pb-3">
                <div className="flex justify-between">
                  <span>التاريخ:</span>
                  <span className="font-semibold text-slate-800">{currentInvoice.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>اسم المشتري:</span>
                  <span className="font-semibold text-slate-900">{currentInvoice.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>طريقة الدفع:</span>
                  <span className="font-semibold text-slate-800">{currentInvoice.paymentMethod}</span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="py-1">الصنف</th>
                    <th className="py-1 text-center">الكمية</th>
                    <th className="py-1 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentInvoice.items.map((item: any, idx: number) => (
                    <tr key={idx} className="py-1.5">
                      <td className="py-1.5 text-slate-800">{item.productName}</td>
                      <td className="py-1.5 text-center font-bold text-slate-900">{item.quantity}</td>
                      <td className="py-1.5 text-left font-bold text-teal-300 font-mono">{item.total} ج</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total */}
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="font-black text-sm text-slate-900">إجمالي الفاتورة:</span>
                <span className="font-black text-xl text-teal-300 font-mono">{currentInvoice.totalAmount} ج</span>
              </div>

              <p className="text-center text-[10px] text-slate-400 pt-2 border-t">
                شكراً لتعاملكم مع مرسم الإبداع • الفاتورة مسجلة رسمياً بنظام الإدارة
              </p>
            </div>

            {/* Actions */}
            <div className="mt-5 pt-3 border-t flex gap-2">
              <button
                onClick={() => window.print()}
                className="btn btn-primary flex-1 flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <Printer size={16} /> طباعة الفاتورة (طابعة حرارية / A5)
              </button>
              <button onClick={() => setCurrentInvoice(null)} className="btn btn-secondary">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PRINTABLE BARCODE STICKERS ================= */}
      {stickerProduct && (
        <BarcodeStickerModal
          product={stickerProduct}
          studioName={settings.name}
          onClose={() => setStickerProduct(null)}
        />
      )}
    </div>
  );
}
