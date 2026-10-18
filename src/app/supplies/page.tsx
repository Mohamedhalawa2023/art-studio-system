'use client';
import { useState, useMemo } from 'react';
import { useMarsam } from '@/lib/store';
import {
  ShoppingBag, Search, Plus, Minus, Trash2, Printer, CheckCircle,
  AlertTriangle, DollarSign, Package, TrendingUp, Barcode, ArrowUpRight,
  Filter, Tag, User as UserIcon, X
} from 'lucide-react';

export default function SuppliesPage() {
  const {
    supplyItems, supplySales, students,
    addSupplyItem, updateSupplyStock, createSupplySale, settings
  } = useMarsam();

  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'financials'>('pos');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
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

  const categories = useMemo(() => {
    const set = new Set(supplyItems.map(i => i.category));
    return ['all', ...Array.from(set)];
  }, [supplyItems]);

  const filteredItems = supplyItems.filter(item => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.includes(search) || item.barcode.includes(search);
    return matchesCat && matchesSearch;
  });

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
    const found = supplyItems.find(p => p.barcode === barcodeInput.trim());
    if (found) {
      addToCart(found.id);
      setBarcodeInput('');
    } else {
      alert('لم يتم العثور على أداة بهذا الباركود');
    }
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
            <ShoppingBag className="text-amber-400" size={26} />
            متجر ومخزن الأدوات الفنية
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            بيع الأدوات ومتابعة المخزون مع فصل مالي كامل عن حسابات الكورسات
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1.5 p-1 glass rounded-xl">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'pos' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            نقطة البيع (POS)
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'inventory' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
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
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'financials' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
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
            {/* Search & Barcode Bar */}
            <div className="grid sm:grid-cols-2 gap-3">
              <form onSubmit={handleBarcodeSubmit} className="relative">
                <Barcode size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400" />
                <input
                  className="input pr-10 text-sm font-mono"
                  placeholder="امسح الباركود بالسكانر واضغط Enter..."
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  autoFocus
                />
              </form>
              <div className="relative">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pr-10 text-sm"
                  placeholder="بحث باسم الأداة..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Categories Chips */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'glass text-slate-400 hover:text-white'}`}
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
                    className={`glass p-4 rounded-xl flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${isOutOfStock ? 'opacity-40 cursor-not-allowed' : 'hover:border-violet-500 hover:bg-white/5'}`}
                  >
                    {inCart && (
                      <span className="absolute top-2 left-2 bg-violet-600 text-white font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center">
                        {inCart.quantity}
                      </span>
                    )}

                    <div>
                      <span className="text-xs text-amber-400 font-semibold">{item.category}</span>
                      <h4 className="font-bold text-sm text-slate-100 mt-1 line-clamp-2">{item.name}</h4>
                      <p className="text-xs text-slate-500 font-mono mt-1">كود: {item.barcode}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                      <div>
                        <span className="text-lg font-black text-violet-400">{item.sellPrice} ج</span>
                      </div>
                      <span className={`badge text-xs ${isOutOfStock ? 'badge-danger' : isLowStock ? 'badge-warning' : 'badge-gray'}`}>
                        {isOutOfStock ? 'نفد المخزون' : `متبقي ${item.stockQty}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cart & Checkout Sidebar (1 Col) */}
          <div className="glass p-5 rounded-2xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                  <ShoppingBag size={20} className="text-violet-400" />
                  فاتورة البيع الحالية
                </h3>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="text-xs text-red-400 hover:underline">
                    مسح السلة
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              <div className="space-y-2 mt-4 max-h-60 overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 text-sm">
                    السلة فارغة. اضغط على أداة أو امسح الباركود لإضافتها.
                  </div>
                ) : (
                  cart.map(c => {
                    const product = supplyItems.find(p => p.id === c.productId);
                    if (!product) return null;
                    return (
                      <div key={c.productId} className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-sm">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-semibold text-slate-200 truncate text-xs">{product.name}</p>
                          <p className="text-xs text-violet-400">{product.sellPrice * c.quantity} ج ({product.sellPrice} ج للقطعة)</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => updateCartQty(c.productId, -1)} className="p-1 rounded bg-white/10 hover:bg-white/20">
                            <Minus size={12} />
                          </button>
                          <span className="font-bold text-xs w-5 text-center">{c.quantity}</span>
                          <button onClick={() => updateCartQty(c.productId, 1)} className="p-1 rounded bg-white/10 hover:bg-white/20">
                            <Plus size={12} />
                          </button>
                          <button onClick={() => removeFromCart(c.productId)} className="p-1 text-red-400 hover:text-red-300 mr-1">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Customer Selector */}
              <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setCustomerType('student')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${customerType === 'student' ? 'bg-violet-600 text-white' : 'glass text-slate-400'}`}
                  >
                    طالب مقيد
                  </button>
                  <button
                    onClick={() => setCustomerType('walkin')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${customerType === 'walkin' ? 'bg-violet-600 text-white' : 'glass text-slate-400'}`}
                  >
                    مشتري خارجي
                  </button>
                </div>

                {customerType === 'student' ? (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">اختر الطالب:</label>
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
                    <label className="block text-xs text-slate-400 mb-1">اسم المشتري الخارجي:</label>
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
                  <label className="block text-xs text-slate-400 mb-1">طريقة الدفع:</label>
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
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">إجمالي القطع:</span>
                <span className="font-bold">{cartSummary.totalItems} قطع</span>
              </div>
              <div className="flex items-center justify-between text-lg">
                <span className="font-bold text-slate-200">المبلغ المطلوب:</span>
                <span className="font-black text-2xl text-emerald-400">{cartSummary.subtotal} ج</span>
              </div>

              <button
                disabled={cart.length === 0}
                onClick={handleCheckout}
                className="w-full btn btn-primary py-3 text-base flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-600/30"
              >
                <Printer size={18} />
                إتمام البيع وطباعة الفاتورة
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
            <div className="glass p-4 rounded-xl">
              <p className="text-xs text-slate-400">إجمالي الأصناف</p>
              <p className="text-2xl font-black text-violet-400 mt-1">{supplyItems.length}</p>
            </div>
            <div className="glass p-4 rounded-xl">
              <p className="text-xs text-slate-400">إجمالي قطع المخزن</p>
              <p className="text-2xl font-black text-amber-400 mt-1">
                {supplyItems.reduce((acc, i) => acc + i.stockQty, 0)} قطعة
              </p>
            </div>
            <div className="glass p-4 rounded-xl">
              <p className="text-xs text-slate-400">أصناف أوشكت على النفاد</p>
              <p className="text-2xl font-black text-red-400 mt-1">{lowStockCount}</p>
            </div>
            <div className="glass p-4 rounded-xl">
              <p className="text-xs text-slate-400">قيمة المخزون (بسعر الشراء)</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">{inventoryAssetValue.toLocaleString()} ج</p>
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
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button onClick={() => setShowAddProduct(true)} className="btn btn-primary text-sm flex items-center gap-1.5">
              <Plus size={16} /> إضافة صنف جديد
            </button>
          </div>

          {/* Table */}
          <div className="glass rounded-2xl overflow-hidden border border-white/10">
            <table className="w-full text-right text-sm">
              <thead className="bg-white/5 text-slate-400 text-xs border-b border-white/10">
                <tr>
                  <th className="p-3">الباركود</th>
                  <th className="p-3">اسم الأداة</th>
                  <th className="p-3">القسم</th>
                  <th className="p-3">سعر الشراء</th>
                  <th className="p-3">سعر البيع</th>
                  <th className="p-3">الربح المتوقع</th>
                  <th className="p-3">الكمية بالمخزن</th>
                  <th className="p-3 text-center">إجراءات المخزون</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredItems.map(item => {
                  const isLow = item.stockQty <= item.minStock;
                  return (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono text-xs text-amber-400">{item.barcode}</td>
                      <td className="p-3 font-semibold text-slate-200">{item.name}</td>
                      <td className="p-3"><span className="badge badge-purple text-xs">{item.category}</span></td>
                      <td className="p-3 text-slate-400">{item.costPrice} ج</td>
                      <td className="p-3 font-bold text-slate-200">{item.sellPrice} ج</td>
                      <td className="p-3 text-emerald-400 font-bold">+{item.sellPrice - item.costPrice} ج</td>
                      <td className="p-3">
                        <span className={`badge ${item.stockQty === 0 ? 'badge-danger' : isLow ? 'badge-warning' : 'badge-success'}`}>
                          {item.stockQty} {isLow && item.stockQty > 0 && '(أوشك على النفاد)'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1 bg-white/5 p-1 rounded-lg">
                          <button
                            onClick={() => updateSupplyStock(item.id, -1)}
                            className="p-1 rounded hover:bg-white/10 text-red-400"
                            title="خصم قطعة"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="text-xs px-2 font-mono">{item.stockQty}</span>
                          <button
                            onClick={() => updateSupplyStock(item.id, 1)}
                            className="p-1 rounded hover:bg-white/10 text-emerald-400"
                            title="إضافة قطعة للمخزن"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: FINANCIALS ================= */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          {/* Financial KPIs (Separated for Supplies only) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass p-5 rounded-2xl border-r-4 border-violet-500">
              <p className="text-xs text-slate-400">إجمالي مبيعات الأدوات</p>
              <p className="text-2xl font-black text-slate-100 mt-1">{totalSalesRevenue.toLocaleString()} ج</p>
              <p className="text-xs text-slate-500 mt-1">خزينة متجر الأدوات</p>
            </div>
            <div className="glass p-5 rounded-2xl border-r-4 border-amber-500">
              <p className="text-xs text-slate-400">تكلفة البضاعة المباعة</p>
              <p className="text-2xl font-black text-amber-400 mt-1">{totalSalesCost.toLocaleString()} ج</p>
              <p className="text-xs text-slate-500 mt-1">رأس المال المسترد</p>
            </div>
            <div className="glass p-5 rounded-2xl border-r-4 border-emerald-500">
              <p className="text-xs text-slate-400">صافي أرباح الأدوات فقط</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">{totalSalesProfit.toLocaleString()} ج</p>
              <p className="text-xs text-emerald-500/80 mt-1">هامش ربح {profitMargin}%</p>
            </div>
            <div className="glass p-5 rounded-2xl border-r-4 border-blue-500">
              <p className="text-xs text-slate-400">عدد فواتير الأدوات</p>
              <p className="text-2xl font-black text-blue-400 mt-1">{supplySales.length}</p>
              <p className="text-xs text-slate-500 mt-1">ترقيم SHP-2026</p>
            </div>
          </div>

          {/* Invoices List */}
          <div className="glass p-5 rounded-2xl">
            <h3 className="font-bold text-lg text-slate-100 mb-4 flex items-center gap-2">
              <Tag size={18} className="text-violet-400" />
              سجل فواتير بيع الأدوات (خزينة الأدوات المستقلة)
            </h3>

            <div className="divide-y divide-white/5">
              {supplySales.map(sale => (
                <div key={sale.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                        {sale.invoiceNumber}
                      </span>
                      <span className="font-bold text-sm text-slate-200">{sale.customerName}</span>
                      <span className="badge badge-gray text-xs">
                        {sale.customerType === 'student' ? 'طالب' : 'خارجي'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {sale.date} • {sale.items.map(i => `${i.productName} (${i.quantity})`).join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <p className="font-black text-sm text-emerald-400">{sale.totalAmount} ج</p>
                      <p className="text-xs text-slate-500">ربح: +{sale.profit} ج</p>
                    </div>
                    <button
                      onClick={() => setCurrentInvoice(sale)}
                      className="btn btn-secondary btn-sm flex items-center gap-1"
                    >
                      <Printer size={13} />
                      عرض / طباعة
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD PRODUCT ================= */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass p-6 rounded-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-lg text-slate-100">إضافة أداة / منتج جديد</h3>
              <button onClick={() => setShowAddProduct(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">اسم الأداة أو الخامة:</label>
                <input
                  className="input text-sm"
                  placeholder="مثال: ألوان مائية فنانين 24 لون"
                  value={newProduct.name}
                  onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">القسم:</label>
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
                  <label className="block text-xs text-slate-400 mb-1">الباركود (اختياري):</label>
                  <input
                    className="input text-sm font-mono"
                    placeholder="امسح بالسكانر أو اتركه تلقائي"
                    value={newProduct.barcode}
                    onChange={e => setNewProduct({ ...newProduct, barcode: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">سعر الشراء (التكلفة):</label>
                  <input
                    type="number"
                    className="input text-sm"
                    value={newProduct.costPrice || ''}
                    onChange={e => setNewProduct({ ...newProduct, costPrice: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">سعر البيع للطالب:</label>
                  <input
                    type="number"
                    className="input text-sm"
                    value={newProduct.sellPrice || ''}
                    onChange={e => setNewProduct({ ...newProduct, sellPrice: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">الكمية الأولية بالمخزن:</label>
                  <input
                    type="number"
                    className="input text-sm"
                    value={newProduct.stockQty}
                    onChange={e => setNewProduct({ ...newProduct, stockQty: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">حد التنبيه بنقص المخزون:</label>
                  <input
                    type="number"
                    className="input text-sm"
                    value={newProduct.minStock}
                    onChange={e => setNewProduct({ ...newProduct, minStock: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex gap-2">
              <button
                onClick={() => {
                  if (!newProduct.name || !newProduct.sellPrice) {
                    alert('برجاء كتابة الاسم وسعر البيع');
                    return;
                  }
                  addSupplyItem(newProduct);
                  setShowAddProduct(false);
                  setNewProduct({
                    name: '', category: 'ألوان', barcode: '', costPrice: 0,
                    sellPrice: 0, stockQty: 10, minStock: 3
                  });
                }}
                className="btn btn-primary flex-1"
              >
                حفظ الأداة في المخزون
              </button>
              <button onClick={() => setShowAddProduct(false)} className="btn btn-secondary">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PRINTABLE INVOICE ================= */}
      {currentInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
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
                <div className="mt-2 inline-block bg-slate-100 px-3 py-1 rounded text-xs font-mono font-bold text-slate-800">
                  فاتورة رقم: {currentInvoice.invoiceNumber}
                </div>
              </div>

              <div className="text-xs space-y-1 text-slate-600 border-b pb-3">
                <div className="flex justify-between">
                  <span>التاريخ:</span>
                  <span className="font-semibold">{currentInvoice.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>اسم المشتري:</span>
                  <span className="font-semibold text-slate-900">{currentInvoice.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>طريقة الدفع:</span>
                  <span className="font-semibold">{currentInvoice.paymentMethod}</span>
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
                <tbody className="divide-y">
                  {currentInvoice.items.map((item: any, idx: number) => (
                    <tr key={idx} className="py-1.5">
                      <td className="py-1.5 text-slate-800">{item.productName}</td>
                      <td className="py-1.5 text-center font-bold">{item.quantity}</td>
                      <td className="py-1.5 text-left font-bold">{item.total} ج</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total */}
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="font-black text-sm text-slate-900">إجمالي الفاتورة:</span>
                <span className="font-black text-xl text-emerald-600">{currentInvoice.totalAmount} ج</span>
              </div>

              <p className="text-center text-[10px] text-slate-400 pt-2 border-t">
                شكراً لتعاملكم مع مرسم الإبداع • الفاتورة مسجلة رسمياً بنظام الإدارة
              </p>
            </div>

            {/* Actions */}
            <div className="mt-5 pt-3 border-t flex gap-2">
              <button
                onClick={() => window.print()}
                className="btn btn-primary flex-1 flex items-center justify-center gap-1.5"
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
    </div>
  );
}
