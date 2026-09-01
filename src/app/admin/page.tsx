'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Clock,
  CheckCircle2,
  FileText,
  CreditCard,
  PieChart as PieChartIcon,
  TrendingDown,
  Award,
  Users,
  PlusCircle,
  Percent,
  Trophy,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function buildMonthlyRevenueExpense(transactions: any[]) {
  const now = new Date();
  const months: { key: string; name: string; receita: number; despesa: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, name: MONTH_LABELS[d.getMonth()], receita: 0, despesa: 0 });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const t of transactions) {
    const d = new Date(t.date);
    const bucket = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (!bucket) continue;
    if (t.type === 'RECEITA') bucket.receita += t.amount;
    else if (t.type === 'DESPESA') bucket.despesa += t.amount;
  }
  return months;
}

function buildTopProducts(orders: any[]) {
  const totals = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const o of orders) {
    for (const item of o.items || []) {
      const existing = totals.get(item.productName) || { name: item.productName, quantity: 0, revenue: 0 };
      existing.quantity += item.quantity;
      existing.revenue += item.totalPrice;
      totals.set(item.productName, existing);
    }
  }
  return Array.from(totals.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}

function buildPaymentMethodsBreakdown(orders: any[]) {
  const totals: Record<string, number> = {};
  for (const o of orders) {
    for (const p of o.payments || []) {
      totals[p.paymentMethod] = (totals[p.paymentMethod] || 0) + p.amount;
    }
  }
  const totalPaid = Object.values(totals).reduce((a, b) => a + b, 0);
  if (totalPaid === 0) return [];
  return Object.entries(totals)
    .map(([name, amount]) => ({ name, amount, value: Math.round((amount / totalPaid) * 100) }))
    .sort((a, b) => b.amount - a.amount);
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [finRes, finAllRes, ordRes, qutoRes, custRes] = await Promise.all([
          fetch('/api/finance?range=month'),
          fetch('/api/finance?range=all'),
          fetch('/api/orders'),
          fetch('/api/quotes'),
          fetch('/api/customers'),
        ]);

        const [finData, finAllData, ordData, qutoData, custData] = await Promise.all([
          finRes.json(),
          finAllRes.json(),
          ordRes.json(),
          qutoRes.json(),
          custRes.json(),
        ]);

        if (finData && finData.metrics) setMetrics(finData.metrics);
        if (finAllData && Array.isArray(finAllData.transactions)) setAllTransactions(finAllData.transactions);
        if (Array.isArray(ordData)) setOrders(ordData);
        if (Array.isArray(qutoData)) setQuotes(qutoData);
        if (Array.isArray(custData)) setCustomers(custData);
      } catch (err) {
        console.error('Error loading dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const currentMonth = new Date().getMonth();
  const birthdayCustomers = customers.filter((c) => {
    if (!c.birthDate) return false;
    const d = new Date(c.birthDate);
    return !isNaN(d.getTime()) && d.getMonth() === currentMonth;
  });

  // Compute calculated metrics
  const pendingOrdersCount = orders.filter((o) => ['NOVO', 'AGUARDANDO_CONFIRMACAO', 'PAGAMENTO_PENDENTE'].includes(o.status)).length;
  const confirmedOrdersCount = orders.filter((o) => ['CONFIRMADO', 'EM_PRODUCAO', 'PRONTO'].includes(o.status)).length;
  const pendingQuotesCount = quotes.filter((q) => q.status === 'PENDING').length;
  const approvedQuotesCount = quotes.filter((q) => q.status === 'APPROVED' || q.status === 'CONVERTED').length;

  // Dados reais: últimos 6 meses de receita/despesa e distribuição real de formas de pagamento
  const revenueVsExpenseData = buildMonthlyRevenueExpense(allTransactions);
  const paymentMethodsData = buildPaymentMethodsBreakdown(orders);
  const topProducts = buildTopProducts(orders);

  // Taxa de conversão: de todos os orçamentos recebidos, quantos viraram pedido
  const convertedQuotesCount = quotes.filter((q) => q.status === 'CONVERTED').length;
  const conversionRate = quotes.length > 0 ? (convertedQuotesCount / quotes.length) * 100 : 0;

  // Taxa de clientes recorrentes: de quem já comprou ao menos 1x, quantos voltaram
  const customersWithOrders = customers.filter((c) => (c._count?.orders || 0) >= 1);
  const recurringCustomersCount = customersWithOrders.filter((c) => (c._count?.orders || 0) >= 2).length;
  const recurringRate = customersWithOrders.length > 0
    ? (recurringCustomersCount / customersWithOrders.length) * 100
    : 0;

  const COLORS = ['#C27360', '#D59483', '#E6B9AE', '#A75644', '#4A231A'];

  return (
    <div className="flex min-h-screen bg-[#FAF6F4]">
      <AdminSidebar />

      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#4A231A]">
              Painel Geral de Vendas
            </h1>
            <p className="text-xs md:text-sm text-[#645451]">
              Acompanhe o faturamento, pedidos pendentes e lucro da Confeitaria Cinthia Rodrigues
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/admin/pedidos"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C27360] to-[#A75644] text-white font-semibold text-xs shadow-blush hover:shadow-lg transition-all flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Novo Pedido
            </a>
          </div>
        </div>

        {/* 10 Key Indicator Metric Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-gray-200" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Faturamento do Mês */}
            <div className="bg-white p-5 rounded-2xl border border-[#F2D7D0] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#645451]">
                  Faturamento Mês
                </span>
                <h3 className="text-xl font-bold text-[#4A231A] font-serif mt-1">
                  {formatCurrency(metrics?.totalRevenue || 0)}
                </h3>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-1">
                  <TrendingUp className="w-3 h-3" /> Receitas consolidadas
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#F9ECE9] text-[#C27360] flex items-center justify-center font-bold">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            {/* Card 2: Lucro Estimado */}
            <div className="bg-white p-5 rounded-2xl border border-[#F2D7D0] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#645451]">
                  Lucro Estimado Mês
                </span>
                <h3 className="text-xl font-bold text-emerald-700 font-serif mt-1">
                  {formatCurrency(metrics?.netProfit || 0)}
                </h3>
                <span className="text-[10px] text-[#645451] font-semibold mt-1 block">
                  Receita despesada
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            {/* Card 3: Pedidos Confirmados */}
            <div className="bg-white p-5 rounded-2xl border border-[#F2D7D0] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#645451]">
                  Pedidos Confirmados
                </span>
                <h3 className="text-xl font-bold text-[#4A231A] font-serif mt-1">
                  {confirmedOrdersCount}
                </h3>
                <span className="text-[10px] text-[#C27360] font-semibold mt-1 block">
                  Em produção / prontos
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#FDF7F6] text-[#C27360] flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            {/* Card 4: Pedidos Pendentes */}
            <div className="bg-white p-5 rounded-2xl border border-[#F2D7D0] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#645451]">
                  Pedidos Pendentes
                </span>
                <h3 className="text-xl font-bold text-amber-700 font-serif mt-1">
                  {pendingOrdersCount}
                </h3>
                <span className="text-[10px] text-amber-600 font-semibold mt-1 block">
                  Aguardando confirmação
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            {/* Card 5: Orçamentos Pendentes */}
            <div className="bg-white p-5 rounded-2xl border border-[#F2D7D0] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#645451]">
                  Orçamentos p/ Responder
                </span>
                <h3 className="text-xl font-bold text-[#4A231A] font-serif mt-1">
                  {pendingQuotesCount}
                </h3>
                <span className="text-[10px] text-[#645451] font-semibold mt-1 block">
                  Solicitações recebidas
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#F9ECE9] text-[#A75644] flex items-center justify-center font-bold">
                <FileText className="w-6 h-6" />
              </div>
            </div>

            {/* Card 6: Contas a Receber */}
            <div className="bg-white p-5 rounded-2xl border border-[#F2D7D0] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#645451]">
                  Contas a Receber
                </span>
                <h3 className="text-xl font-bold text-[#4A231A] font-serif mt-1">
                  {formatCurrency(metrics?.accountsReceivable || 0)}
                </h3>
                <span className="text-[10px] text-rose-600 font-semibold mt-1 block">
                  Sinais a quitar na entrega
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>

            {/* Card 7: Despesas do Mês */}
            <div className="bg-white p-5 rounded-2xl border border-[#F2D7D0] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#645451]">
                  Despesas Mês
                </span>
                <h3 className="text-xl font-bold text-red-600 font-serif mt-1">
                  {formatCurrency(metrics?.totalExpenses || 0)}
                </h3>
                <span className="text-[10px] text-[#645451] font-semibold mt-1 block">
                  Ingredientes & Embalagens
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center font-bold">
                <TrendingDown className="w-6 h-6" />
              </div>
            </div>

            {/* Card 8: Ticket Médio */}
            <div className="bg-white p-5 rounded-2xl border border-[#F2D7D0] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#645451]">
                  Ticket Médio Pedido
                </span>
                <h3 className="text-xl font-bold text-[#4A231A] font-serif mt-1">
                  {formatCurrency(metrics?.averageTicket || 0)}
                </h3>
                <span className="text-[10px] text-[#645451] font-semibold mt-1 block">
                  Média por venda
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#FAF6F4] text-[#C27360] flex items-center justify-center font-bold">
                <Award className="w-6 h-6" />
              </div>
            </div>

            {/* Card 9: Taxa de Conversão (Orçamento -> Pedido) */}
            <div className="bg-white p-5 rounded-2xl border border-[#F2D7D0] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#645451]">
                  Conversão Orçamento → Pedido
                </span>
                <h3 className="text-xl font-bold text-[#4A231A] font-serif mt-1">
                  {quotes.length > 0 ? `${conversionRate.toFixed(0)}%` : '—'}
                </h3>
                <span className="text-[10px] text-[#645451] font-semibold mt-1 block">
                  {convertedQuotesCount} de {quotes.length} orçamento(s)
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#F9ECE9] text-[#A75644] flex items-center justify-center font-bold">
                <Percent className="w-6 h-6" />
              </div>
            </div>

            {/* Card 10: Clientes Recorrentes */}
            <div className="bg-white p-5 rounded-2xl border border-[#F2D7D0] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#645451]">
                  Clientes Recorrentes
                </span>
                <h3 className="text-xl font-bold text-[#4A231A] font-serif mt-1">
                  {customersWithOrders.length > 0 ? `${recurringRate.toFixed(0)}%` : '—'}
                </h3>
                <span className="text-[10px] text-[#645451] font-semibold mt-1 block">
                  {recurringCustomersCount} de {customersWithOrders.length} cliente(s) voltaram
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#FDF7F6] text-[#C27360] flex items-center justify-center font-bold">
                <Users className="w-6 h-6" />
              </div>
            </div>

          </div>
        )}

        {/* Birthday Reminders Banner Widget */}
        {birthdayCustomers.length > 0 && (
          <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 text-white p-6 rounded-3xl shadow-lg border border-rose-300 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-bold">
                  🎂
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-white">
                    Aniversariantes do Mês ({birthdayCustomers.length} Clientes Especialmente Queridas)
                  </h3>
                  <p className="text-xs text-rose-100">
                    Envie um abraço carinhoso e um cupom de 10% de desconto pelo WhatsApp com 1 clique!
                  </p>
                </div>
              </div>
              <a
                href="/admin/clientes"
                className="px-4 py-2 rounded-xl bg-white text-rose-700 font-bold text-xs hover:bg-rose-50 shadow-sm transition-colors hidden sm:block"
              >
                Ver CRM Completo
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {birthdayCustomers.slice(0, 3).map((c) => (
                <div key={c.id} className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-white block truncate">{c.name}</span>
                    <span className="text-xs text-rose-100">
                      Aniversário: {new Date(c.birthDate).toLocaleDateString('pt-BR').slice(0, 5)}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const text = `🎉 *FELIZ ANIVERSÁRIO, ${c.name.split(' ')[0].toUpperCase()}!* 🎂🎈\n\nA Confeitaria Cinthia Rodrigues deseja a você um dia muito doce e especial! 💕\n\nGanhe *10% DE DESCONTO* na sua encomenda com o cupom: *NIVER10*! ✨`;
                      window.open(`https://wa.me/${c.whatsapp}?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white text-rose-700 font-bold text-xs hover:bg-rose-50 shadow-sm transition-all"
                  >
                    Parabéns 🎁
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Bar Chart: Receitas x Despesas */}
          <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-[#F2D7D0] shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#4A231A]">
                  Evolução do Faturamento Mensal
                </h3>
                <p className="text-xs text-[#645451]">Comparativo de Receitas vs Despesas Operacionais</p>
              </div>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueVsExpenseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2D7D0" />
                  <XAxis dataKey="name" stroke="#645451" fontSize={12} />
                  <YAxis stroke="#645451" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FAF6F4', borderRadius: '12px', border: '1px solid #F2D7D0' }}
                  />
                  <Bar dataKey="receita" fill="#C27360" name="Receita (R$)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="despesa" fill="#D59483" name="Despesa (R$)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side Pie Chart: Formas de Pagamento */}
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-[#F2D7D0] shadow-card space-y-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#4A231A]">
                Formas de Pagamento
              </h3>
              <p className="text-xs text-[#645451]">Distribuição das vendas por método</p>
            </div>

            {paymentMethodsData.length === 0 ? (
              <div className="h-60 w-full flex flex-col items-center justify-center text-center gap-2 text-[#645451]">
                <PieChartIcon className="w-8 h-8 text-[#F2D7D0]" />
                <p className="text-xs">
                  Nenhum pagamento registrado ainda.<br />Assim que houver pagamentos em Pedidos, a distribuição aparece aqui.
                </p>
              </div>
            ) : (
              <>
                <div className="h-60 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethodsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {paymentMethodsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#F2D7D0]">
                  {paymentMethodsData.map((p, i) => (
                    <div key={p.name} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-[#4A231A] font-medium">{p.name}</span>
                      </div>
                      <span className="font-bold text-[#C27360]">{p.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>

        {/* Top Products Panel */}
        <div className="bg-white p-6 rounded-3xl border border-[#F2D7D0] shadow-card space-y-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#4A231A] flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#C27360]" /> Produtos Mais Vendidos
            </h3>
            <p className="text-xs text-[#645451]">Ranking por faturamento, com base nos pedidos já feitos</p>
          </div>

          {topProducts.length === 0 ? (
            <p className="text-xs text-[#645451] py-4">
              Nenhum item vendido ainda. Assim que os pedidos tiverem produtos, o ranking aparece aqui.
            </p>
          ) : (
            <div className="space-y-3 pt-2">
              {topProducts.map((p, i) => {
                const maxRevenue = topProducts[0].revenue || 1;
                return (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#F9ECE9] text-[#A75644] text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-[#4A231A] truncate">{p.name}</span>
                        <span className="text-xs font-bold text-[#C27360] font-serif shrink-0">
                          {formatCurrency(p.revenue)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#FAF6F4] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#C27360] to-[#A75644]"
                          style={{ width: `${Math.max(4, (p.revenue / maxRevenue) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-[#645451] font-semibold shrink-0 w-16 text-right">
                      {p.quantity} un.
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
