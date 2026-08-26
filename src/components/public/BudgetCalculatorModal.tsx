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
  const [frosting, setFrosting] = useState('Chantily');
  const [biscoitoTotal, setBiscoitoTotal] = useState(4); // Total de biscoitos (escolhido pela faixa)
  const [palitoCount, setPalitoCount] = useState(0); // Quantos, dentro do total, são Com Palito
  const [wantsRibbonTag, setWantsRibbonTag] = useState(false); // Fita de cetim + tag (+R$1,00/un)
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

  function getBiscoitoStepConfig(variationName?: string): { min: number } {
    if (variationName?.includes('4cm')) return { min: 20 };
    if (variationName?.includes('6cm')) return { min: 10 };
    if (variationName?.includes('9cm')) return { min: 4 };
    return { min: 1 };
  }

  const BISCOITO_TIERS: Record<string, { qty: number; desenhos: number; price: number }[]> = {
    '4cm': [
      { qty: 20, desenhos: 4, price: 140.0 },
      { qty: 25, desenhos: 5, price: 175.0 },
      { qty: 30, desenhos: 6, price: 210.0 },
      { qty: 35, desenhos: 7, price: 245.0 },
      { qty: 40, desenhos: 8, price: 280.0 },
      { qty: 45, desenhos: 9, price: 315.0 },
      { qty: 50, desenhos: 10, price: 350.0 },
    ],
    '6cm': [
      { qty: 10, desenhos: 5, price: 130.0 },
      { qty: 12, desenhos: 6, price: 156.0 },
      { qty: 14, desenhos: 7, price: 182.0 },
      { qty: 16, desenhos: 8, price: 208.0 },
      { qty: 18, desenhos: 9, price: 234.0 },
      { qty: 20, desenhos: 10, price: 260.0 },
    ],
    '9cm': [
      { qty: 4, desenhos: 4, price: 87.6 },
      { qty: 10, desenhos: 5, price: 219.0 },
      { qty: 12, desenhos: 6, price: 262.8 },
      { qty: 14, desenhos: 7, price: 306.6 },
      { qty: 16, desenhos: 8, price: 350.4 },
      { qty: 18, desenhos: 9, price: 394.2 },
      { qty: 20, desenhos: 10, price: 438.0 },
    ],
  };

  function getBiscoitoTiers(variationName?: string) {
    if (variationName?.includes('4cm')) return BISCOITO_TIERS['4cm'];
    if (variationName?.includes('6cm')) return BISCOITO_TIERS['6cm'];
    if (variationName?.includes('9cm')) return BISCOITO_TIERS['9cm'];
    return [];
  }

  const biscoitoStepConfig = getBiscoitoStepConfig(selectedVariation?.name);
  const biscoitoTiers = getBiscoitoTiers(selectedVariation?.name);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSubmittedQuote(null);
      setErrorMsg('');
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
      const minSemPalito = getBiscoitoStepConfig(selectedVariation.name).min;
      setBiscoitoTotal(minSemPalito);
      setPalitoCount(0);
      setWantsRibbonTag(false);
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

  const minRequiredBiscoitos = biscoitoStepConfig.min;

  const handleNextStep = () => {
    if (step === 2 && isBiscoito) {
      if (biscoitoTotal < minRequiredBiscoitos) {
        setErrorMsg(`⚠️ O pedido mínimo para biscoitos de ${selectedVariation?.name || 'este tamanho'} é de ${minRequiredBiscoitos} unidades.`);
        return;
      }
    }
    setErrorMsg('');
    setStep(step + 1);
  };

  const noPalitoBiscoitoCount = biscoitoTotal - palitoCount;
  const effectiveQuantity = isBiscoito ? biscoitoTotal : quantity;
  const palitoTotalCost = (isBiscoito && isPalitoAllowed) ? (palitoCount * 2.0) : 0;
  const ribbonTagCost = (isBiscoito && wantsRibbonTag) ? biscoitoTotal * 1.0 : 0;
  const subtotal = isBiscoito
    ? (noPalitoBiscoitoCount * unitPrice) + (palitoCount * (unitPrice + (isPalitoAllowed ? 2.0 : 0))) + ribbonTagCost
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
    } else if (selectedProduct?.slug === 'bolos-redondos') {
      setFrosting('Chantily');
    }
    if (selectedProduct?.slug !== 'biscoitos-amanteigados') {
      setQuantity(1);
    }
  }, [selectedProduct]);

  const handleProductChange = (prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setSelectedProduct(prod);
      if (prod.slug !== 'biscoitos-amanteigados') {
        setQuantity(1);
      }
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

    if (isBiscoito) {
      if (biscoitoTotal < minRequiredBiscoitos) {
        setErrorMsg(`⚠️ O pedido mínimo para biscoitos de ${selectedVariation?.name || 'este tamanho'} é de ${minRequiredBiscoitos} unidades.`);
        setStep(2);
        return;
      }
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
        frosting: !isBiscoito ? frosting : null,
        extras: isBiscoito
          ? [
              palitoCount > 0
                ? `${palitoCount} un com palito (+R$ 2,00/un) e ${noPalitoBiscoitoCount} un sem palito`
                : 'Todos sem palito',
              wantsRibbonTag ? 'Fita de Cetim + Tag (+R$ 1,00/un)' : null,
            ].filter(Boolean).join(' | ')
          : null,
        quantity: effectiveQuantity,
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
        frosting: !isBiscoito ? frosting : undefined,
        extras: isBiscoito
          ? [
              palitoCount > 0
                ? `${palitoCount} un com palito (+R$ 2,00/un) e ${noPalitoBiscoitoCount} un sem palito`
                : 'Todos sem palito',
              wantsRibbonTag ? 'Fita de Cetim + Tag (+R$ 1,00/un)' : null,
              `Pgto: ${paymentLabel}`,
            ].filter(Boolean).join(' | ')
          : selectedProduct?.slug === 'kit-festa-celebrar'
          ? `Cobertura ${frosting} (${frosting === 'Buttercream' ? 'Incluso no Kit' : 'Sem Buttercream'}) | Pgto: ${paymentLabel}`
          : (isButtercream ? `Cobertura Buttercream (+R$ 20,00) | Pgto: ${paymentLabel}` : `Pgto: ${paymentLabel}`),
        quantity: effectiveQuantity,
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
      text += `• *Cobertura:* ${frosting}\n`;
    } else {
      text += `• *Divisão:* ${noPalitoBiscoitoCount} sem palito + ${palitoCount} com palito\n`;
      if (wantsRibbonTag) text += `• *Fita de Cetim + Tag:* Sim (+R$ 1,00/un)\n`;
    }

    text += `• *Pagamento Preferido:* ${paymentLabel}\n`;
    text += `• *Quantidade:* ${effectiveQuantity}\n`;
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
                    
                    {/* Warm & Professional Transparency Note */}
                    <div className="mt-2.5 p-3 bg-[#FDF7F6] rounded-xl border border-[#F2D7D0] space-y-1">
                      <div className="font-bold text-[#A75644] flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                        <span>✨ Transparência & Qualidade Artesanal</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-[#645451]">
                        Os valores apresentados são uma estimativa com nossa base clássica. Recheios especiais com <strong>frutas frescas, nozes praliné ou chocolates nobres</strong> passam por uma rápida confirmação no WhatsApp para garantirmos a máxima qualidade da sua comemoração! 💕
                      </p>
                    </div>
                  </div>

                  {/* Frosting Selection for Kit Festa */}
                  {selectedProduct?.slug === 'kit-festa-celebrar' && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-2 flex items-center justify-between">
                        <span>Tipo de Cobertura do Kit</span>
                        <span className="text-[11px] font-semibold text-[#C27360]">
                          {frosting === 'Buttercream' ? '✨ Buttercream (Incluso no Kit)' : 'Chantily (Sem Buttercream)'}
                        </span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Buttercream', sub: '✨ Incluso no Kit (Padrão)' },
                          { label: 'Chantily', sub: 'Sem Buttercream (Incluso)' },
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
                            <span className="text-xs font-bold">{cob.label}</span>
                            <span className="text-[10px] opacity-80 mt-0.5">{cob.sub}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Frosting Selection for Mini Bolo only */}
                  {selectedProduct?.slug === 'mini-bolo' && (
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
                        Escolha uma das faixas abaixo{isPalitoAllowed ? ' — depois, se quiser, escolha quantos desses vêm no palito' : ''}:
                      </p>
                    </div>

                    {/* Faixas Prontas (Grupos) */}
                    {biscoitoTiers.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#A75644] block mb-2">
                          Faixas Disponíveis ({selectedVariation?.name?.match(/\d+cm/)?.[0] || ''})
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {biscoitoTiers.map((tier) => {
                            const isSelected = biscoitoTotal === tier.qty;
                            return (
                              <button
                                key={tier.qty}
                                type="button"
                                onClick={() => {
                                  setBiscoitoTotal(tier.qty);
                                  setPalitoCount(0);
                                }}
                                className={`p-2.5 rounded-xl border text-center transition-all ${
                                  isSelected
                                    ? 'border-[#C27360] bg-[#FDF7F6] ring-2 ring-[#C27360]/30 shadow-sm'
                                    : 'border-[#F2D7D0] bg-white hover:bg-[#FAF6F4]'
                                }`}
                              >
                                <span className="block text-xs font-extrabold text-[#4A231A]">{tier.qty} un.</span>
                                <span className="block text-[10px] text-[#645451]">({tier.desenhos} desenhos)</span>
                                <span className="block text-[11px] font-bold text-[#C27360] mt-0.5">{formatCurrency(tier.price)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {/* Divisão Com Palito (dentro do total escolhido) */}
                      {isPalitoAllowed ? (
                        <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-[#F2D7D0] shadow-sm">
                          <div>
                            <span className="text-xs font-bold text-[#4A231A] block">
                              🍭 Quantos Com Palito? (+ R$ 2,00/un)
                            </span>
                            <span className="text-[11px] text-[#645451]">
                              Dos {biscoitoTotal} escolhidos, quantos vêm no palito
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setPalitoCount(Math.max(0, palitoCount - 1))}
                              disabled={palitoCount <= 0}
                              className={`w-9 h-9 rounded-xl font-bold transition-colors ${
                                palitoCount <= 0
                                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-200'
                                  : 'bg-[#FAF6F4] text-[#4A231A] hover:bg-[#F2D7D0]'
                              }`}
                            >
                              -
                            </button>
                            <span className="text-base font-extrabold text-[#4A231A] w-7 text-center">
                              {palitoCount}
                            </span>
                            <button
                              type="button"
                              onClick={() => setPalitoCount(Math.min(biscoitoTotal, palitoCount + 1))}
                              disabled={palitoCount >= biscoitoTotal}
                              className={`w-9 h-9 rounded-xl font-bold transition-colors ${
                                palitoCount >= biscoitoTotal
                                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-200'
                                  : 'bg-[#FAF6F4] text-[#4A231A] hover:bg-[#F2D7D0]'
                              }`}
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

                      {/* Fita de Cetim + Tag */}
                      <button
                        type="button"
                        onClick={() => setWantsRibbonTag(!wantsRibbonTag)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                          wantsRibbonTag
                            ? 'border-[#C27360] bg-[#FDF7F6] ring-2 ring-[#C27360]/30 shadow-sm'
                            : 'border-[#F2D7D0] bg-white hover:bg-[#FAF6F4]'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold text-[#4A231A] block">
                            🎀 Adicionar Fita de Cetim + Tag Personalizada
                          </span>
                          <span className="text-[11px] text-[#C27360] font-semibold">
                            + R$ 1,00 por unidade
                          </span>
                        </div>
                        <span
                          className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            wantsRibbonTag
                              ? 'bg-[#C27360] border-[#C27360] text-white'
                              : 'border-[#F2D7D0] text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                      </button>

                      {/* Sobre os Biscoitos — Informações Importantes */}
                      <div className="p-3.5 bg-[#FDF7F6] rounded-xl border border-[#F2D7D0] space-y-2">
                        <div className="font-bold text-[#A75644] flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                          <span>🍪 Sobre os Nossos Biscoitos</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-[#645451]">
                          Amanteigados, sabor baunilha, decorados à mão com glacê real — <strong>100% artesanais</strong>, feitos um a um com muito amor e dedicação.
                        </p>
                        <p className="text-[11px] leading-relaxed text-[#645451]">
                          📅 <strong>Validade:</strong> 30 dias.
                        </p>
                        <p className="text-[11px] leading-relaxed text-[#645451]">
                          🌡️ <strong>Como armazenar:</strong> não podem ir à geladeira nem entrar em contato com umidade ou água. Mantenha sempre em temperatura ambiente.
                        </p>
                        <p className="text-[11px] leading-relaxed text-[#645451]">
                          🌾 <strong>Ingredientes:</strong> ovo, manteiga, derivados de leite, farinha de trigo, açúcar, corante e essência de baunilha. Contém glúten e não é indicado para quem tem alergia ou intolerância a algum desses ingredientes.
                        </p>
                      </div>

                      {/* Live Summary Box */}
                      <div className="p-3 bg-gradient-to-r from-[#FDF7F6] to-[#F9ECE9] rounded-xl border border-[#F2D7D0] text-xs font-bold text-[#4A231A] flex items-center justify-between">
                        <span>Total de Biscoitos no Pedido:</span>
                        <span className="text-[#C27360] font-extrabold text-sm">
                          {biscoitoTotal} unidades ({noPalitoBiscoitoCount} sem palito e {palitoCount} com palito)
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
                  {frosting}{' '}
                  {frosting === 'Buttercream'
                    ? selectedProduct?.slug === 'kit-festa-celebrar'
                      ? '(Incluso no Kit)'
                      : '(+R$ 20,00)'
                    : '(Incluso)'}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs text-[#645451]">
              <span>Quantidade:</span>
              <span className="font-semibold text-[#4A231A]">
                {isBiscoito
                  ? `${noPalitoBiscoitoCount} sem palito + ${palitoCount} com palito (${effectiveQuantity}x)`
                  : `${quantity}x`}
              </span>
            </div>
            {isBiscoito && palitoCount > 0 && (
              <div className="flex justify-between items-center text-xs text-[#645451]">
                <span>Adicional Suporte no Palito:</span>
                <span className="font-semibold text-[#C27360]">+{formatCurrency(palitoTotalCost)}</span>
              </div>
            )}
            {isBiscoito && wantsRibbonTag && (
              <div className="flex justify-between items-center text-xs text-[#645451]">
                <span>Fita de Cetim + Tag:</span>
                <span className="font-semibold text-[#C27360]">+{formatCurrency(ribbonTagCost)}</span>
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
                onClick={handleNextStep}
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
