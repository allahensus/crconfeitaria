'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { formatCurrency, generateWhatsAppLink } from '@/lib/utils';
import { X, Sparkles, Check, ChevronRight, ChevronLeft, Calendar, MessageCircle, Cake, Info } from 'lucide-react';

interface BudgetCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProduct?: any;
  initialVariation?: any;
  products: any[];
  fillings: any[];
  whatsappNumber?: string;
}

export function BudgetCalculatorModal({
  isOpen,
  onClose,
  initialProduct,
  initialVariation,
  products,
  fillings,
  whatsappNumber = '5512997594697',
}: BudgetCalculatorModalProps) {
  const [step, setStep] = useState(1);

  // Form State
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariation, setSelectedVariation] = useState<any>(null);
  const [cakeBase, setCakeBase] = useState('Baunilha');
  const [filling1, setFilling1] = useState('');
  const [filling2, setFilling2] = useState(''); // Default empty = 1 recheio único
  const [frosting, setFrosting] = useState('Chantily');
  const [noPalitoCount, setNoPalitoCount] = useState(4); // Biscoitos Sem Palito
  const [palitoCount, setPalitoCount] = useState(0); // Biscoitos Com Palito
  const [quantity, setQuantity] = useState(1);
  const [eventDate, setEventDate] = useState('');
  const [themeNotes, setThemeNotes] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerBirthDate, setCustomerBirthDate] = useState('');
  const [lgpdConsent, setLgpdConsent] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | 'money'>('pix');

  const [submittedQuote, setSubmittedQuote] = useState<any>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isBiscoito = selectedProduct?.slug === 'biscoitos-amanteigados';
  const isPalitoAllowed = isBiscoito && (selectedVariation?.name?.includes('6cm') || selectedVariation?.name?.includes('9cm'));

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSubmittedQuote(null);
      setErrorMsg('');
      setFilling2(''); // 1 recheio único por padrão
    }
    if (initialProduct) {
      setSelectedProduct(initialProduct);
      if (initialVariation) {
        setSelectedVariation(initialVariation);
      } else if (initialProduct.variations && initialProduct.variations.length > 0) {
        setSelectedVariation(initialProduct.variations[0]);
      } else {
        setSelectedVariation(null);
      }
    } else if (products.length > 0) {
      setSelectedProduct(products[0]);
      if (products[0].variations && products[0].variations.length > 0) {
        setSelectedVariation(products[0].variations[0]);
      }
    }
  }, [isOpen, initialProduct, initialVariation, products]);

  useEffect(() => {
    if (selectedVariation && isBiscoito) {
      let minSemPalito = 1;
      if (selectedVariation.name?.includes('4cm')) minSemPalito = 20;
      else if (selectedVariation.name?.includes('6cm')) minSemPalito = 10;
      else if (selectedVariation.name?.includes('9cm')) minSemPalito = 4;
      setNoPalitoCount(minSemPalito);
      setPalitoCount(0);
      setQuantity(minSemPalito);
    }
  }, [selectedVariation, isBiscoito]);

  useEffect(() => {
    if (fillings.length > 0 && !filling1) {
      setFilling1(fillings[0].name);
    }
  }, [fillings]);

  // Price calculations
  const unitPrice = selectedVariation
    ? selectedVariation.price
    : selectedProduct
    ? selectedProduct.basePrice
    : 0;

  let extraCostPerUnit = 0;
  // Cobertura em Buttercream surcharge (+R$ 20,00 para Mini Bolo / Bolos Redondos)
  if (frosting === 'Buttercream') {
    if (selectedProduct?.slug === 'mini-bolo' || selectedProduct?.slug === 'bolos-redondos') {
      extraCostPerUnit += 20.0;
    }
  }

  const effectiveQuantity = isBiscoito ? (noPalitoCount + palitoCount) : quantity;
  const palitoTotalCost = (isBiscoito && isPalitoAllowed) ? (palitoCount * 2.0) : 0;
  const subtotal = isBiscoito
    ? (noPalitoCount * unitPrice) + (palitoCount * (unitPrice + (isPalitoAllowed ? 2.0 : 0)))
    : ((unitPrice + extraCostPerUnit) * quantity);
  const finalTotal = subtotal;

  const availableFillingsForProduct = React.useMemo(() => {
    if (selectedProduct?.slug === 'bento-cake' || selectedProduct?.slug === 'kit-festa-celebrar') {
      return [
        { id: 'ninho', name: 'Ninho', category: 'Cardápio Especial' },
        { id: 'cocada', name: 'Cocada', category: 'Cardápio Especial' },
        { id: 'brigadeiro-gourmet', name: 'Brigadeiro gourmet', category: 'Cardápio Especial' },
      ];
    }
    if (selectedProduct?.slug === 'mini-bolo') {
      return [
        { id: 'mini-brigadeiro', name: 'Brigadeiro gourmet', category: 'Cardápio Mini Bolo' },
        { id: 'mini-ninho', name: 'Ninho', category: 'Cardápio Mini Bolo' },
        { id: 'mini-prestigio', name: 'Prestígio', category: 'Cardápio Mini Bolo' },
      ];
    }
    return fillings;
  }, [selectedProduct, fillings]);

  useEffect(() => {
    if (availableFillingsForProduct.length > 0) {
      setFilling1(availableFillingsForProduct[0].name);
    }
  }, [selectedProduct, availableFillingsForProduct]);

  useEffect(() => {
    if (selectedProduct?.slug === 'kit-festa-celebrar') {
      setFrosting('Buttercream');
      setFilling2('');
    }
  }, [selectedProduct]);

  const handleProductChange = (prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setSelectedProduct(prod);
      if (prod.variations && prod.variations.length > 0) {
        setSelectedVariation(prod.variations[0]);
      } else {
        setSelectedVariation(null);
      }
    }
  };

  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [step]);

  const handleSubmitQuote = async () => {
    if (!customerName.trim()) {
      setErrorMsg('Por favor, informe seu Nome Completo para continuar.');
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      return;
    }

    const cleanWa = customerWhatsapp.replace(/\D/g, '');
    if (!cleanWa || cleanWa.length < 10) {
      setErrorMsg('Por favor, informe um número de WhatsApp válido com DDD (ex: 11999998888).');
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      return;
    }

    if (!lgpdConsent) {
      setErrorMsg('Por favor, aceite os termos de proteção de dados (LGPD) para prosseguir.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const isBiscoito = selectedProduct?.slug === 'biscoitos-amanteigados';
      const payload = {
        productId: selectedProduct?.id,
        productName: selectedProduct?.name || 'Bolo Personalizado',
        variation: selectedVariation ? selectedVariation.name : null,
        cakeBase: !isBiscoito ? cakeBase : null,
        filling1: !isBiscoito ? filling1 : null,
        filling2: !isBiscoito && filling2 ? filling2 : null,
        frosting: !isBiscoito ? frosting : null,
        extras: isBiscoito
          ? (palitoCount > 0 ? `${palitoCount} un com palito (+R$ 2,00/un) e ${noPalitoCount} un sem palito` : 'Todos sem palito')
          : null,
        quantity,
        unitPrice: unitPrice + extraCostPerUnit,
        eventDate,
        themeNotes,
        subtotal,
        extraTotal: extraCostPerUnit * quantity,
        finalTotal,
        customerName,
        customerWhatsapp,
        customerEmail,
        customerBirthDate,
        lgpdAccepted: lgpdConsent,
      };

      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar orçamento');
      }

      setSubmittedQuote(data.quote);

      const paymentLabel =
        paymentMethod === 'card'
          ? 'Cartão de Crédito / Débito'
          : paymentMethod === 'money'
          ? 'Dinheiro em Espécie'
          : 'Pix Instantâneo (50% Sinal)';

      const isButtercream = frosting === 'Buttercream';
      const link = data.whatsappUrl || generateWhatsAppLink(whatsappNumber || '5512997594697', {
        quoteNumber: data.quote.quoteNumber,
        customerName,
        productName: selectedProduct?.name || 'Produto',
        variation: selectedVariation?.name,
        cakeBase: !isBiscoito ? cakeBase : undefined,
        filling1: !isBiscoito ? filling1 : undefined,
        filling2: !isBiscoito && filling2 ? filling2 : undefined,
        frosting: !isBiscoito ? frosting : undefined,
        extras: isBiscoito
          ? (palitoCount > 0 ? `${palitoCount} un com palito (+R$ 2,00/un) e ${noPalitoCount} un sem palito | Pgto: ${paymentLabel}` : `Todos sem palito | Pgto: ${paymentLabel}`)
          : selectedProduct?.slug === 'kit-festa-celebrar'
          ? `Cobertura Buttercream (Incluso no Kit) | Pgto: ${paymentLabel}`
          : (isButtercream ? `Cobertura Buttercream (+R$ 20,00) | Pgto: ${paymentLabel}` : `Pgto: ${paymentLabel}`),
        quantity,
        eventDate: eventDate ? new Date(eventDate).toLocaleDateString('pt-BR') : undefined,
        themeNotes: themeNotes || undefined,
        finalTotal,
      });

      setWhatsappUrl(link);

      // Celebrate with confetti!
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#C27360', '#F2D7D0', '#D49B8B', '#A75644', '#10B981'],
      });

      // Move to Step 4 (Success Summary Screen)
      setStep(4);

      // Also try opening WhatsApp in new tab
      if (link) {
        window.open(link, '_blank');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = () => {
    if (!submittedQuote) return;
    const isBiscoito = selectedProduct?.slug === 'biscoitos-amanteigados';
    const formattedDate = eventDate ? new Date(eventDate).toLocaleDateString('pt-BR') : 'A combinar';

    const paymentLabel =
      paymentMethod === 'card'
        ? 'Cartão de Crédito / Débito'
        : paymentMethod === 'money'
        ? 'Dinheiro em Espécie'
        : 'Pix Instantâneo (50% Sinal)';

    let text = `*SOLICITAÇÃO DE ORÇAMENTO*\n`;
    text += `*Confeitaria Cinthia Rodrigues*\n`;
    text += `---------------------------------------\n\n`;
    text += `• *Código:* ${submittedQuote.quoteNumber}\n`;
    text += `• *Cliente:* ${customerName}\n`;
    text += `• *Produto:* ${selectedProduct?.name}\n`;
    text += `• *Tamanho/Fatias:* ${selectedVariation?.name || 'Padrão'}\n`;

    if (!isBiscoito) {
      text += `• *Massa:* ${cakeBase}\n`;
      text += `• *Recheio Principal:* ${filling1}\n`;
      if (filling2) text += `• *Segundo Recheio:* ${filling2}\n`;
      text += `• *Cobertura:* ${frosting}\n`;
    }

    text += `• *Pagamento Preferido:* ${paymentLabel}\n`;
    text += `• *Quantidade:* ${quantity}\n`;
    text += `• *Data Desejada:* ${formattedDate}\n`;
    if (themeNotes) text += `• *Tema / Observações:* ${themeNotes}\n`;

    text += `\n*VALOR TOTAL ESTIMADO: ${formatCurrency(finalTotal)}*\n`;
    text += `---------------------------------------\n\n`;
    text += `_Aguardo sua confirmação para combinarmos os detalhes e a data!_`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const isBiscoitosCategory = selectedProduct?.slug === 'biscoitos-amanteigados';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#F2D7D0] overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#FDF7F6] via-[#F9ECE9] to-[#F2D7D0] px-6 py-5 border-b border-[#F2D7D0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C27360] text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-[#4A231A]">
                Calculadora de Orçamento
              </h2>
              <p className="text-xs text-[#645451]">
                Passo {step} de 3 — Monte seu pedido sob medida
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-[#4A231A] flex items-center justify-center transition-colors border border-[#F2D7D0]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div ref={containerRef} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {/* STEP 1: Product & Variation Selection */}
          {step === 1 && (
            <div className="space-y-5 animate-in slide-in-from-right duration-200">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-2">
                  1. Escolha o Produto Desejado
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleProductChange(p.id)}
                      className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                        selectedProduct?.id === p.id
                          ? 'border-[#C27360] bg-[#FDF7F6] ring-2 ring-[#C27360]/30 shadow-sm'
                          : 'border-[#F2D7D0] bg-white hover:bg-[#FAF6F4]'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden relative flex-shrink-0">
                        <img src={p.mainImage} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-[#4A231A] truncate">{p.name}</h4>
                        <p className="text-xs text-[#645451] line-clamp-1">{p.yieldInfo || p.category?.name}</p>
                        <span className="text-xs font-bold text-[#C27360] block mt-1">
                          A partir de {formatCurrency(p.basePrice)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Variations (Sizes/Slices) */}
              {selectedProduct?.variations && selectedProduct.variations.length > 0 && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-2">
                    2. Escolha o Tamanho / Rendimento
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedProduct.variations.map((v: any) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariation(v)}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                          selectedVariation?.id === v.id
                            ? 'border-[#C27360] bg-[#C27360] text-white font-medium shadow-sm'
                            : 'border-[#F2D7D0] bg-white text-[#4A3531] hover:bg-[#FDF7F6]'
                        }`}
                      >
                        <span className="text-xs font-semibold">{v.name}</span>
                        <span className="text-xs font-bold">{formatCurrency(v.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Flavors, Fillings & Extras */}
          {step === 2 && (
            <div className="space-y-5 animate-in slide-in-from-right duration-200">
              
              {!isBiscoito ? (
                <>
                  {/* Cake Base */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-2">
                      Sabor da Massa
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {['Baunilha', 'Chocolate'].map((massa) => (
                        <button
                          key={massa}
                          type="button"
                          onClick={() => setCakeBase(massa)}
                          className={`p-3 rounded-xl border text-center font-medium text-sm transition-all ${
                            cakeBase === massa
                              ? 'border-[#C27360] bg-[#FDF7F6] text-[#4A231A] ring-2 ring-[#C27360]/30 font-bold'
                              : 'border-[#F2D7D0] bg-white text-[#4A3531] hover:bg-[#FAF6F4]'
                          }`}
                        >
                          Massa de {massa}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Primary Filling */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-2">
                      {selectedProduct?.slug === 'bento-cake' || selectedProduct?.slug === 'kit-festa-celebrar'
                        ? 'Recheio Exclusivo (1 Camada Generosa)'
                        : selectedProduct?.slug === 'mini-bolo'
                        ? 'Recheio Exclusivo (Mini Bolo)'
                        : 'Recheio Principal (Cardápio com 20 Sabores)'}
                    </label>
                    <select
                      value={filling1}
                      onChange={(e) => setFilling1(e.target.value)}
                      className="w-full p-3 rounded-xl border border-[#F2D7D0] bg-white text-sm text-[#4A231A] font-medium focus:ring-2 focus:ring-[#C27360] outline-none"
                    >
                      {availableFillingsForProduct.map((f) => (
                        <option key={f.id} value={f.name}>
                          {f.name} ({f.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Kit Festa Buttercream Frosting Info */}
                  {selectedProduct?.slug === 'kit-festa-celebrar' && (
                    <div className="p-3 bg-[#FDF7F6] rounded-xl border border-[#F2D7D0] text-xs text-[#4A231A] font-semibold flex items-center justify-between">
                      <span>Tipo de Cobertura:</span>
                      <span className="text-[#C27360] font-bold">✨ Cobertura em Buttercream (Inclusa no Kit)</span>
                    </div>
                  )}

                  {/* Frosting Selection for Mini Bolo and Bolos Redondos */}
                  {(selectedProduct?.slug === 'mini-bolo' || selectedProduct?.slug === 'bolos-redondos') && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-2 flex items-center justify-between">
                        <span>Tipo de Cobertura</span>
                        <span className="text-[11px] font-semibold text-[#C27360]">
                          {frosting === 'Buttercream' ? '✨ Buttercream (+ R$ 20,00)' : 'Chantily (Incluso)'}
                        </span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Chantily', sub: 'Massa & Cobertura Leve' },
                          { label: 'Buttercream', sub: '+ R$ 20,00 (Creme de Manteiga)' },
                        ].map((cob) => (
                          <button
                            key={cob.label}
                            type="button"
                            onClick={() => setFrosting(cob.label)}
                            className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                              frosting === cob.label
                                ? 'border-[#C27360] bg-[#FDF7F6] text-[#4A231A] ring-2 ring-[#C27360]/30 font-bold shadow-sm'
                                : 'border-[#F2D7D0] bg-white text-[#4A3531] hover:bg-[#FAF6F4]'
                            }`}
                          >
                            <span className="text-sm">{cob.label}</span>
                            <span className="text-[10px] text-[#A75644] font-medium mt-0.5">{cob.sub}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Biscoitos Extras & Multi-Type Selection */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#FDF7F6] border border-[#F2D7D0] space-y-4">
                    <div>
                      <h4 className="font-bold text-sm text-[#4A231A] mb-1">
                        🍪 Escolha a Quantidade de Biscoitos ({selectedVariation?.name || 'Personalizados'})
                      </h4>
                      <p className="text-xs text-[#645451]">
                        Escolha livremente a quantidade de biscoitos **Sem Palito** e **Com Palito** no mesmo orçamento:
                      </p>
                    </div>

                    <div className="space-y-3">
                      {/* Counter 1: Biscoitos Sem Palito */}
                      <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-[#F2D7D0] shadow-sm">
                        <div>
                          <span className="text-xs font-bold text-[#4A231A] block">
                            🍪 Biscoitos SEM Palito (Tradicionais)
                          </span>
                          <span className="text-[11px] text-[#C27360] font-semibold">
                            {formatCurrency(unitPrice)} por unidade
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setNoPalitoCount(Math.max(0, noPalitoCount - 1))}
                            className="w-9 h-9 rounded-xl bg-[#FAF6F4] text-[#4A231A] font-bold hover:bg-[#F2D7D0] transition-colors"
                          >
                            -
                          </button>
                          <span className="text-base font-extrabold text-[#4A231A] w-7 text-center">
                            {noPalitoCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => setNoPalitoCount(noPalitoCount + 1)}
                            className="w-9 h-9 rounded-xl bg-[#FAF6F4] text-[#4A231A] font-bold hover:bg-[#F2D7D0] transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Counter 2: Biscoitos Com Palito */}
                      {isPalitoAllowed ? (
                        <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-[#F2D7D0] shadow-sm">
                          <div>
                            <span className="text-xs font-bold text-[#4A231A] block">
                              🍭 Biscoitos COM Palito (+ R$ 2,00/un)
                            </span>
                            <span className="text-[11px] text-emerald-700 font-semibold">
                              {formatCurrency(unitPrice + 2.0)} por unidade
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setPalitoCount(Math.max(0, palitoCount - 1))}
                              className="w-9 h-9 rounded-xl bg-[#FAF6F4] text-[#4A231A] font-bold hover:bg-[#F2D7D0] transition-colors"
                            >
                              -
                            </button>
                            <span className="text-base font-extrabold text-[#4A231A] w-7 text-center">
                              {palitoCount}
                            </span>
                            <button
                              type="button"
                              onClick={() => setPalitoCount(palitoCount + 1)}
                              className="w-9 h-9 rounded-xl bg-[#FAF6F4] text-[#4A231A] font-bold hover:bg-[#F2D7D0] transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-[#FAF6F4] rounded-xl border border-[#F2D7D0] text-xs text-[#A75644] font-medium">
                          ℹ️ Opção no palito disponível apenas para os tamanhos de 6cm e 9cm.
                        </div>
                      )}

                      {/* Live Summary Box */}
                      <div className="p-3 bg-gradient-to-r from-[#FDF7F6] to-[#F9ECE9] rounded-xl border border-[#F2D7D0] text-xs font-bold text-[#4A231A] flex items-center justify-between">
                        <span>Total de Biscoitos no Pedido:</span>
                        <span className="text-[#C27360] font-extrabold text-sm">
                          {noPalitoCount + palitoCount} unidades ({noPalitoCount} sem palito e {palitoCount} com palito)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quantity selector for Cakes */}
              {!isBiscoito && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-2">
                    Quantidade
                  </label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 rounded-xl bg-[#FAF6F4] text-[#4A231A] font-bold hover:bg-[#F2D7D0]"
                    >
                      -
                    </button>
                    <span className="text-lg font-bold text-[#4A231A] w-8 text-center">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 rounded-xl bg-[#FAF6F4] text-[#4A231A] font-bold hover:bg-[#F2D7D0]"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Success & Confirmation View */}
          {step === 4 && (
            <div className="space-y-6 text-center py-4 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Orçamento Registrado com Sucesso
                </span>
                <h3 className="font-serif text-2xl font-bold text-[#4A231A] mt-2">
                  Solicitação #{submittedQuote?.quoteNumber}
                </h3>
                <p className="text-xs text-[#645451] max-w-md mx-auto mt-1">
                  Seu pedido no valor de <strong className="text-[#4A231A]">{formatCurrency(finalTotal)}</strong> foi registrado! Clique abaixo para enviar no WhatsApp e encerrar.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2 max-w-md mx-auto">
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md hover:scale-105 transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Enviar Pedido no WhatsApp da Confeitaria
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleCopyText}
                  className="w-full py-3 px-6 rounded-2xl bg-[#FAF6F4] hover:bg-[#F2D7D0] text-[#4A231A] font-bold text-xs border border-[#F2D7D0] transition-colors flex items-center justify-center gap-2"
                >
                  {copied ? '✅ Texto Copiado com Sucesso!' : '📋 Copiar Resumo do Orçamento'}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#C27360] hover:bg-[#A75644] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Encerrar Venda e Fechar
                </button>
              </div>

              {/* Helpful Tip */}
              <div className="p-4 rounded-2xl bg-[#FDF7F6] border border-[#F2D7D0] text-left text-xs text-[#645451] space-y-1">
                <p className="font-bold text-[#4A231A]">💡 Importante para a Validação:</p>
                <p>
                  Caso a aba do WhatsApp não tenha aberto ou o número da confeitaria esteja em atualização, clique em <strong>"Copiar Resumo do Orçamento"</strong> acima e cole diretamente na conversa do WhatsApp com a confeiteira!
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-gray-500 hover:underline font-semibold"
                >
                  Fechar janela
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Customer Details & Event Date */}
          {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                    Seu Nome Completo *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Maria Silva"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    className={`w-full p-2.5 rounded-xl border text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none ${
                      errorMsg && !customerName.trim() ? 'border-red-500 bg-red-50/50' : 'border-[#F2D7D0]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                    Seu WhatsApp (com DDD) *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 11999998888"
                    value={customerWhatsapp}
                    onChange={(e) => {
                      setCustomerWhatsapp(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    className={`w-full p-2.5 rounded-xl border text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none ${
                      errorMsg && customerWhatsapp.replace(/\D/g, '').length < 10 ? 'border-red-500 bg-red-50/50' : 'border-[#F2D7D0]'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                    Seu E-mail (Opcional)
                  </label>
                  <input
                    type="email"
                    placeholder="Ex: maria@gmail.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1 flex items-center justify-between">
                    <span>Data de Nascimento</span>
                    <span className="text-[10px] text-[#C27360] font-normal">🎂 P/ Presentes</span>
                  </label>
                  <input
                    type="date"
                    value={customerBirthDate}
                    onChange={(e) => setCustomerBirthDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                  Data Desejada da Entrega / Festa
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                />
              </div>

              {/* Payment Method Choice */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-2 flex items-center justify-between">
                  <span>Forma de Pagamento Preferida</span>
                  <span className="text-[11px] font-semibold text-[#C27360]">Escolha uma opção</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Pix Button */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      paymentMethod === 'pix'
                        ? 'border-[#32BCAD] bg-emerald-50/60 ring-2 ring-[#32BCAD]/30 shadow-sm'
                        : 'border-[#F2D7D0] bg-white hover:bg-[#FAF6F4]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-lg bg-[#32BCAD] flex items-center justify-center text-white shrink-0">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M12 4.4L17.6 10L12 15.6L6.4 10L12 4.4ZM12 2L4 10L12 18L20 10L12 2Z" />
                        </svg>
                      </div>
                      {paymentMethod === 'pix' && (
                        <span className="text-[10px] bg-[#32BCAD] text-white font-bold px-2 py-0.5 rounded-full">✓ Selecionado</span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-[#4A231A]">Pix (Sinal 50%)</span>
                    <span className="text-[10px] text-gray-500">Reserva imediata da data</span>
                  </button>

                  {/* Credit Card Button */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      paymentMethod === 'card'
                        ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/30 shadow-sm'
                        : 'border-[#F2D7D0] bg-white hover:bg-[#FAF6F4]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <rect x="2" y="5" width="20" height="14" rx="3" strokeWidth="2"/>
                          <line x1="2" y1="10" x2="22" y2="10" strokeWidth="2"/>
                          <rect x="6" y="14" width="4" height="2" rx="0.5" fill="currentColor"/>
                        </svg>
                      </div>
                      {paymentMethod === 'card' && (
                        <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full">✓ Selecionado</span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-[#4A231A]">Cartão de Crédito</span>
                    <span className="text-[10px] text-gray-500">Visa, Master, Elo em até 12x</span>
                  </button>

                  {/* Money Button */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('money')}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      paymentMethod === 'money'
                        ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/30 shadow-sm'
                        : 'border-[#F2D7D0] bg-white hover:bg-[#FAF6F4]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <rect x="2" y="6" width="20" height="12" rx="2" strokeWidth="2"/>
                          <circle cx="12" cy="12" r="3" strokeWidth="2"/>
                          <path d="M6 12h.01M18 12h.01" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                      </div>
                      {paymentMethod === 'money' && (
                        <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">✓ Selecionado</span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-[#4A231A]">Dinheiro em Espécie</span>
                    <span className="text-[10px] text-gray-500">Pagamento na entrega/retirada</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                  Tema da Festa / Observações Especiais
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Tema Princesa, frase no bentô cake: 'Parabéns Maria 30 anos', etc."
                  value={themeNotes}
                  onChange={(e) => setThemeNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none resize-none"
                />
              </div>

              {/* LGPD Consent Checkbox */}
              <div className="p-3.5 rounded-2xl bg-[#FDF7F6] border border-[#F2D7D0]">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lgpdConsent}
                    onChange={(e) => setLgpdConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-[#C27360] text-[#C27360] focus:ring-[#C27360]"
                  />
                  <span className="text-[11px] text-[#645451] leading-tight">
                    🔒 <strong>Proteção de Dados (LGPD):</strong> Concordo com o uso dos meus dados cadastrais exclusivamente pela <strong>Confeitaria Cinthia Rodrigues</strong> para elaboração do orçamento, confirmação de pedido e envio de mimos de aniversário. Garantimos sigilo absoluto.
                  </span>
                </label>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-600 font-semibold bg-red-50 p-3 rounded-xl border border-red-200">
                  ⚠️ {errorMsg}
                </p>
              )}
            </div>
          )}

          {/* Live Summary Calculation Card */}
          <div className="bg-[#FAF6F4] p-4 rounded-2xl border border-[#F2D7D0] space-y-2">
            <div className="flex justify-between items-center text-xs text-[#645451]">
              <span>Item selecionado:</span>
              <span className="font-semibold text-[#4A231A]">
                {selectedProduct?.name} ({selectedVariation?.name || 'Padrão'})
              </span>
            </div>
            {frosting && selectedProduct?.slug !== 'biscoitos-amanteigados' && (
              <div className="flex justify-between items-center text-xs text-[#645451]">
                <span>Cobertura:</span>
                <span className="font-semibold text-[#4A231A]">
                  {frosting} {frosting === 'Buttercream' ? '(+R$ 20,00)' : '(Incluso)'}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs text-[#645451]">
              <span>Quantidade:</span>
              <span className="font-semibold text-[#4A231A]">
                {isBiscoito
                  ? `${noPalitoCount} sem palito + ${palitoCount} com palito (${effectiveQuantity}x)`
                  : `${quantity}x`}
              </span>
            </div>
            {isBiscoito && palitoCount > 0 && (
              <div className="flex justify-between items-center text-xs text-[#645451]">
                <span>Adicional Suporte no Palito:</span>
                <span className="font-semibold text-[#C27360]">+{formatCurrency(palitoTotalCost)}</span>
              </div>
            )}
            {!isBiscoito && extraCostPerUnit > 0 && (
              <div className="flex justify-between items-center text-xs text-[#645451]">
                <span>Adicionais / Cobertura:</span>
                <span className="font-semibold text-[#C27360]">+{formatCurrency(extraCostPerUnit * quantity)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-[#F2D7D0] flex justify-between items-center">
              <span className="font-bold text-sm text-[#4A231A]">Total Estimado:</span>
              <span className="font-serif font-extrabold text-xl text-[#C27360]">
                {formatCurrency(finalTotal)}
              </span>
            </div>
          </div>

        </div>

        {/* Footer Navigation Controls */}
        {step < 4 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-[#F2D7D0] flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2.5 rounded-full border border-[#F2D7D0] bg-white text-[#4A231A] text-xs font-semibold hover:bg-gray-100 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="px-6 py-2.5 rounded-full bg-[#C27360] text-white text-xs font-bold hover:bg-[#A75644] transition-colors flex items-center gap-1 shadow-sm"
              >
                Próximo Passo <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleSubmitQuote}
                className="px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-md flex items-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                {loading ? 'Encerrando Venda...' : '✅ Encerrar Venda & Enviar no WhatsApp'}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
