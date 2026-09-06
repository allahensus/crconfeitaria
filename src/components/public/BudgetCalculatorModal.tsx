'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { formatCurrency, generateWhatsAppLink } from '@/lib/utils';
import { X, Sparkles, Check, ChevronRight, ChevronLeft, Calendar, MessageCircle, Cake, Info } from 'lucide-react';
import { AvailabilityDatePicker } from './AvailabilityDatePicker';

interface BudgetCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProduct?: any;
  initialVariation?: any;
  products: any[];
  fillings: any[];
  whatsappNumber?: string;
  blockedDates?: string[];
  minLeadDays?: number;
}

export function BudgetCalculatorModal({
  isOpen,
  onClose,
  initialProduct,
  initialVariation,
  products,
  fillings,
  whatsappNumber = '5512997594697',
  blockedDates = [],
  minLeadDays = 3,
}: BudgetCalculatorModalProps) {
  const [step, setStep] = useState(1);

  // Form State
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariation, setSelectedVariation] = useState<any>(null);
  // Tracks whether the variation arrived pre-chosen (customer clicked a specific
  // cobertura pill on the catalog card) vs. defaulted -- lets Mini Bolo skip
  // re-asking in Step 1 only when the choice was truly already made.
  const [variationPreselected, setVariationPreselected] = useState(false);
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
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | 'money' | ''>('');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountType: string; discountValue: number } | null>(null);
  const [depositPercentage, setDepositPercentage] = useState(50);
  const [couponMsg, setCouponMsg] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

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
        setVariationPreselected(true);
      } else if (initialProduct.variations && initialProduct.variations.length > 0) {
        setSelectedVariation(initialProduct.variations[0]);
        setVariationPreselected(false);
      } else {
        setSelectedVariation(null);
        setVariationPreselected(false);
      }
    } else if (products.length > 0) {
      setSelectedProduct(products[0]);
      setVariationPreselected(false);
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

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        const pct = parseFloat(data?.deposit_percentage);
        if (!isNaN(pct) && pct > 0) setDepositPercentage(pct);
      })
      .catch(() => {});
  }, []);

  // Price calculations
  const unitPrice = selectedVariation
    ? selectedVariation.price
    : selectedProduct
    ? selectedProduct.basePrice
    : 0;

  let extraCostPerUnit = 0;
  // Cobertura em Buttercream surcharge (+R$ 20,00 para Bolos Redondos).
  // Mini Bolo's Buttercream/Chantily price difference is already baked into
  // the variation price, so it's not added again here.
  if (frosting === 'Buttercream') {
    if (selectedProduct?.slug === 'bolos-redondos') {
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
  const ribbonTagCost = (isBiscoito && wantsRibbonTag) ? palitoCount * 1.0 : 0;

  useEffect(() => {
    if (palitoCount === 0 && wantsRibbonTag) {
      setWantsRibbonTag(false);
    }
  }, [palitoCount, wantsRibbonTag]);
  const subtotal = isBiscoito
    ? (noPalitoBiscoitoCount * unitPrice) + (palitoCount * (unitPrice + (isPalitoAllowed ? 2.0 : 0))) + ribbonTagCost
    : ((unitPrice + extraCostPerUnit) * quantity);
  const couponDiscount = appliedCoupon
    ? appliedCoupon.discountType === 'PERCENT'
      ? subtotal * (appliedCoupon.discountValue / 100)
      : Math.min(appliedCoupon.discountValue, subtotal)
    : 0;
  const finalTotal = Math.max(0, subtotal - couponDiscount);
  const depositAmount = Math.round(finalTotal * (depositPercentage / 100) * 100) / 100;

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponMsg('');
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput, whatsapp: customerWhatsapp }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedCoupon({ code: data.code, discountType: data.discountType, discountValue: data.discountValue });
        setCouponMsg(`✅ Cupom ${data.code} aplicado!`);
      } else {
        setAppliedCoupon(null);
        setCouponMsg(`⚠️ ${data.error || 'Cupom inválido.'}`);
      }
    } catch (err) {
      setCouponMsg('⚠️ Erro ao validar cupom.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponMsg('');
  };

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

  // Mini Bolo's cobertura is already decided by which variation was picked
  // ("Cobertura em Chantily" vs "Cobertura em Buttercream", priced differently) --
  // derive frosting from it instead of asking again in a separate step.
  useEffect(() => {
    if (selectedProduct?.slug === 'mini-bolo' && selectedVariation?.name) {
      setFrosting(selectedVariation.name.includes('Buttercream') ? 'Buttercream' : 'Chantily');
    }
  }, [selectedProduct, selectedVariation]);

  const handleProductChange = (prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setSelectedProduct(prod);
      setVariationPreselected(false);
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

    if (!eventDate) {
      setErrorMsg('⚠️ Por favor, escolha a data desejada da entrega/festa antes de enviar.');
      setStep(3);
      return;
    }

    if (blockedDates.includes(eventDate)) {
      setErrorMsg('⚠️ Essa data já está com a agenda cheia. Por favor, escolha outra data.');
      setStep(3);
      return;
    }

    if (!paymentMethod) {
      setErrorMsg('⚠️ Por favor, escolha a forma de pagamento preferida antes de enviar.');
      setStep(3);
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
        isBiscoito,
        cakeBase: !isBiscoito ? cakeBase : null,
        filling1: !isBiscoito ? filling1 : null,
        frosting: !isBiscoito ? frosting : null,
        extras: isBiscoito
          ? [
              palitoCount > 0
                ? `${palitoCount} un com palito (+R$ 2,00/un) e ${noPalitoBiscoitoCount} un sem palito`
                : 'Todos sem palito',
              wantsRibbonTag ? `Fita de Cetim + Tag em ${palitoCount} un. com palito (+R$ 1,00/un)` : null,
            ].filter(Boolean).join(' | ')
          : null,
        quantity: effectiveQuantity,
        unitPrice: unitPrice + extraCostPerUnit,
        eventDate,
        preferredPaymentMethod:
          paymentMethod === 'card'
            ? 'Cartão de Crédito'
            : paymentMethod === 'money'
            ? 'Dinheiro'
            : paymentMethod === 'pix'
            ? 'Pix'
            : null,
        themeNotes,
        subtotal,
        extraTotal: extraCostPerUnit * quantity,
        finalTotal,
        discount: couponDiscount,
        couponCode: appliedCoupon?.code || null,
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
          : `Pix Instantâneo (${depositPercentage}% Sinal)`;

      const isButtercream = frosting === 'Buttercream';
      const link = data.whatsappUrl || generateWhatsAppLink(whatsappNumber || '5512997594697', {
        quoteNumber: data.quote.quoteNumber,
        customerName,
        productName: selectedProduct?.name || 'Produto',
        variation: selectedVariation?.name,
        isBiscoito,
        cakeBase: !isBiscoito ? cakeBase : undefined,
        filling1: !isBiscoito ? filling1 : undefined,
        frosting: !isBiscoito ? frosting : undefined,
        extras: isBiscoito
          ? [
              palitoCount > 0
                ? `${palitoCount} un com palito (+R$ 2,00/un) e ${noPalitoBiscoitoCount} un sem palito`
                : 'Todos sem palito',
              wantsRibbonTag ? `Fita de Cetim + Tag em ${palitoCount} un. com palito (+R$ 1,00/un)` : null,
              `Pgto: ${paymentLabel}`,
            ].filter(Boolean).join(' | ')
          : selectedProduct?.slug === 'bolos-redondos' && isButtercream
          ? `Cobertura Buttercream (+R$ 20,00) | Pgto: ${paymentLabel}`
          : `Pgto: ${paymentLabel}`,
        quantity: effectiveQuantity,
        eventDate: eventDate ? new Date(eventDate).toLocaleDateString('pt-BR') : undefined,
        themeNotes: themeNotes || undefined,
        finalTotal,
        depositAmount,
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

    const divider = '━━━━━━━━━━━━━━━━━━━━━';

    let text = `🎂 *SOLICITAÇÃO DE ORÇAMENTO*\n`;
    text += `*Confeitaria Cinthia Rodrigues*\n`;
    text += `${divider}\n\n`;
    text += `Código: *${submittedQuote.quoteNumber}*\n\n`;

    text += `📦 *Pedido*\n`;
    text += `• Produto: ${selectedProduct?.name}\n`;
    text += `• ${isBiscoito ? 'Tamanho' : 'Tamanho/Fatias'}: ${selectedVariation?.name || 'Padrão'}\n`;

    if (!isBiscoito) {
      text += `• Massa: ${cakeBase}\n`;
      text += `• Recheio Principal: ${filling1}\n`;
      if (!(selectedVariation?.name || '').includes(frosting)) {
        text += `• Cobertura: ${frosting}\n`;
      }
    } else {
      text += `• Divisão: ${noPalitoBiscoitoCount} sem palito + ${palitoCount} com palito\n`;
      if (wantsRibbonTag) text += `• Fita de Cetim + Tag: ${palitoCount} un. com palito (+R$ 1,00/un)\n`;
    }
    text += `• Quantidade: ${effectiveQuantity}\n`;
    text += `• Pagamento Preferido: ${paymentLabel}\n`;

    text += `\n👤 *Cliente*\n`;
    text += `• Nome: ${customerName}\n`;
    text += `• Data Desejada: ${formattedDate}\n`;
    if (themeNotes) text += `• Observações: ${themeNotes}\n`;

    text += `\n${divider}\n`;
    text += `💰 *VALOR TOTAL ESTIMADO: ${formatCurrency(finalTotal)}*\n`;
    if (paymentMethod === 'pix') {
      text += `✅ *Sinal para reservar a data: ${formatCurrency(depositAmount)}*\n`;
    }
    text += `${divider}\n\n`;
    text += `_Aguardo sua confirmação para combinarmos os detalhes e a data!_`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const isBiscoitosCategory = selectedProduct?.slug === 'biscoitos-amanteigados';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[var(--color-border)] overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[var(--color-surface-alt)] via-[var(--color-accent-soft)] to-[var(--color-border)] px-6 py-5 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-[var(--color-heading)]">
                Calculadora de Orçamento
              </h2>
              <p className="text-xs text-[var(--color-text-soft)]">
                Passo {step} de 3 — Monte seu pedido sob medida
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-[var(--color-heading)] flex items-center justify-center transition-colors border border-[var(--color-border)]"
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
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-accent-strong)] mb-2">
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
                          ? 'border-[var(--color-accent)] bg-[var(--color-surface-alt)] ring-2 ring-[#C27360]/30 shadow-sm'
                          : 'border-[var(--color-border)] bg-white hover:bg-[var(--color-bg)]'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden relative flex-shrink-0">
                        <img src={p.mainImage} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-[var(--color-heading)] truncate">{p.name}</h4>
                        <p className="text-xs text-[var(--color-text-soft)] line-clamp-1">{p.yieldInfo || p.category?.name}</p>
                        <span className="text-xs font-bold text-[var(--color-accent)] block mt-1">
                          A partir de {formatCurrency(p.basePrice)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Variations (Sizes/Slices) -- for Mini Bolo, skip re-asking when the
                  cobertura was already picked from the catalog card */}
              {selectedProduct?.variations && selectedProduct.variations.length > 0 && (
                selectedProduct.slug === 'mini-bolo' && variationPreselected ? (
                  <div className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-between">
                    <span className="text-xs text-[var(--color-text-soft)]">Cobertura escolhida</span>
                    <span className="text-xs font-bold text-[var(--color-heading)]">
                      {selectedVariation?.name} ({formatCurrency(selectedVariation?.price)})
                    </span>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-accent-strong)] mb-2">
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
                              ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white font-medium shadow-sm'
                              : 'border-[var(--color-border)] bg-white text-[#4A3531] hover:bg-[var(--color-surface-alt)]'
                          }`}
                        >
                          <span className="text-xs font-semibold">{v.name}</span>
                          <span className="text-xs font-bold">{formatCurrency(v.price)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-accent-strong)] mb-2">
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
                              ? 'border-[var(--color-accent)] bg-[var(--color-surface-alt)] text-[var(--color-heading)] ring-2 ring-[#C27360]/30 font-bold'
                              : 'border-[var(--color-border)] bg-white text-[#4A3531] hover:bg-[var(--color-bg)]'
                          }`}
                        >
                          Massa de {massa}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Primary Filling */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-accent-strong)] mb-2">
                      {selectedProduct?.slug === 'bento-cake' || selectedProduct?.slug === 'kit-festa-celebrar'
                        ? 'Recheio Exclusivo (1 Camada Generosa)'
                        : selectedProduct?.slug === 'mini-bolo'
                        ? 'Recheio Exclusivo (Mini Bolo)'
                        : 'Recheio Principal (Cardápio com 20 Sabores)'}
                    </label>
                    <select
                      value={filling1}
                      onChange={(e) => setFilling1(e.target.value)}
                      className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-white text-sm text-[var(--color-heading)] font-medium focus:ring-2 focus:ring-[var(--color-accent)] outline-none"
                    >
                      {availableFillingsForProduct.map((f) => (
                        <option key={f.id} value={f.name}>
                          {f.name} ({f.category})
                        </option>
                      ))}
                    </select>
                    
                    {/* Warm & Professional Transparency Note */}
                    <div className="mt-2.5 p-3 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] space-y-1">
                      <div className="font-bold text-[var(--color-accent-strong)] flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                        <span>✨ Transparência & Qualidade Artesanal</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-[var(--color-text-soft)]">
                        Os valores apresentados são uma estimativa com nossa base clássica. Recheios especiais com <strong>frutas frescas, nozes praliné ou chocolates nobres</strong> passam por uma rápida confirmação no WhatsApp para garantirmos a máxima qualidade da sua comemoração! 💕
                      </p>
                    </div>
                  </div>

                </>
              ) : (
                /* Biscoitos Extras & Multi-Type Selection */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] space-y-4">
                    <div>
                      <h4 className="font-bold text-sm text-[var(--color-heading)] mb-1">
                        🍪 Escolha a Quantidade de Biscoitos ({selectedVariation?.name || 'Personalizados'})
                      </h4>
                      <p className="text-xs text-[var(--color-text-soft)]">
                        Escolha uma das faixas abaixo{isPalitoAllowed ? ' — depois, se quiser, escolha quantos desses vêm no palito' : ''}:
                      </p>
                    </div>

                    {/* Faixas Prontas (Grupos) */}
                    {biscoitoTiers.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-accent-strong)] block mb-2">
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
                                    ? 'border-[var(--color-accent)] bg-[var(--color-surface-alt)] ring-2 ring-[#C27360]/30 shadow-sm'
                                    : 'border-[var(--color-border)] bg-white hover:bg-[var(--color-bg)]'
                                }`}
                              >
                                <span className="block text-xs font-extrabold text-[var(--color-heading)]">{tier.qty} un.</span>
                                <span className="block text-[10px] text-[var(--color-text-soft)]">({tier.desenhos} desenhos)</span>
                                <span className="block text-[11px] font-bold text-[var(--color-accent)] mt-0.5">{formatCurrency(tier.price)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {/* Divisão Com Palito (dentro do total escolhido) */}
                      {isPalitoAllowed ? (
                        <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-[var(--color-border)] shadow-sm">
                          <div>
                            <span className="text-xs font-bold text-[var(--color-heading)] block">
                              🍭 Quantos Com Palito? (+ R$ 2,00/un)
                            </span>
                            <span className="text-[11px] text-[var(--color-text-soft)]">
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
                                  : 'bg-[var(--color-bg)] text-[var(--color-heading)] hover:bg-[var(--color-border)]'
                              }`}
                            >
                              -
                            </button>
                            <span className="text-base font-extrabold text-[var(--color-heading)] w-7 text-center">
                              {palitoCount}
                            </span>
                            <button
                              type="button"
                              onClick={() => setPalitoCount(Math.min(biscoitoTotal, palitoCount + 1))}
                              disabled={palitoCount >= biscoitoTotal}
                              className={`w-9 h-9 rounded-xl font-bold transition-colors ${
                                palitoCount >= biscoitoTotal
                                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-200'
                                  : 'bg-[var(--color-bg)] text-[var(--color-heading)] hover:bg-[var(--color-border)]'
                              }`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] text-xs text-[var(--color-accent-strong)] font-medium">
                          ℹ️ Opção no palito disponível apenas para os tamanhos de 6cm e 9cm.
                        </div>
                      )}

                      {/* Fita de Cetim + Tag — só disponível nos biscoitos Com Palito */}
                      {isPalitoAllowed && (
                        <button
                          type="button"
                          onClick={() => palitoCount > 0 && setWantsRibbonTag(!wantsRibbonTag)}
                          disabled={palitoCount === 0}
                          className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                            palitoCount === 0
                              ? 'border-[var(--color-border)] bg-gray-50 opacity-60 cursor-not-allowed'
                              : wantsRibbonTag
                              ? 'border-[var(--color-accent)] bg-[var(--color-surface-alt)] ring-2 ring-[#C27360]/30 shadow-sm'
                              : 'border-[var(--color-border)] bg-white hover:bg-[var(--color-bg)]'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-bold text-[var(--color-heading)] block">
                              🎀 Fita de Cetim + Tag nos Biscoitos Com Palito
                            </span>
                            <span className="text-[11px] text-[var(--color-accent)] font-semibold">
                              {palitoCount === 0
                                ? 'Escolha ao menos 1 unidade Com Palito acima para habilitar'
                                : `+ R$ 1,00 por unidade com palito (${palitoCount} un.)`}
                            </span>
                          </div>
                          <span
                            className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              wantsRibbonTag && palitoCount > 0
                                ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
                                : 'border-[var(--color-border)] text-transparent'
                            }`}
                          >
                            ✓
                          </span>
                        </button>
                      )}

                      {/* Sobre os Biscoitos — Informações Importantes */}
                      <div className="p-3.5 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] space-y-2">
                        <div className="font-bold text-[var(--color-accent-strong)] flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                          <span>🍪 Sobre os Nossos Biscoitos</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-[var(--color-text-soft)]">
                          Amanteigados, sabor baunilha, decorados à mão com glacê real — <strong>100% artesanais</strong>, feitos um a um com muito amor e dedicação.
                        </p>
                        <p className="text-[11px] leading-relaxed text-[var(--color-text-soft)]">
                          📅 <strong>Validade:</strong> 30 dias.
                        </p>
                        <p className="text-[11px] leading-relaxed text-[var(--color-text-soft)]">
                          🌡️ <strong>Como armazenar:</strong> não podem ir à geladeira nem entrar em contato com umidade ou água. Mantenha sempre em temperatura ambiente.
                        </p>
                        <p className="text-[11px] leading-relaxed text-[var(--color-text-soft)]">
                          🌾 <strong>Ingredientes:</strong> ovo, manteiga, derivados de leite, farinha de trigo, açúcar, corante e essência de baunilha. Contém glúten e não é indicado para quem tem alergia ou intolerância a algum desses ingredientes.
                        </p>
                      </div>

                      {/* Live Summary Box */}
                      <div className="p-3 bg-gradient-to-r from-[var(--color-surface-alt)] to-[var(--color-accent-soft)] rounded-xl border border-[var(--color-border)] text-xs font-bold text-[var(--color-heading)] flex items-center justify-between">
                        <span>Total de Biscoitos no Pedido:</span>
                        <span className="text-[var(--color-accent)] font-extrabold text-sm">
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-accent-strong)] mb-2">
                    Quantidade
                  </label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 rounded-xl bg-[var(--color-bg)] text-[var(--color-heading)] font-bold hover:bg-[var(--color-border)]"
                    >
                      -
                    </button>
                    <span className="text-lg font-bold text-[var(--color-heading)] w-8 text-center">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 rounded-xl bg-[var(--color-bg)] text-[var(--color-heading)] font-bold hover:bg-[var(--color-border)]"
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
                <h3 className="font-serif text-2xl font-bold text-[var(--color-heading)] mt-2">
                  Solicitação #{submittedQuote?.quoteNumber}
                </h3>
                <p className="text-xs text-[var(--color-text-soft)] max-w-md mx-auto mt-1">
                  Seu pedido no valor de <strong className="text-[var(--color-heading)]">{formatCurrency(finalTotal)}</strong> foi registrado! Clique abaixo para enviar no WhatsApp e encerrar.
                </p>
                {paymentMethod === 'pix' && (
                  <p className="text-xs text-emerald-700 max-w-md mx-auto mt-1.5 font-semibold">
                    Sinal sugerido para reservar a data: {formatCurrency(depositAmount)} ({depositPercentage}%)
                  </p>
                )}
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
                  className="w-full py-3 px-6 rounded-2xl bg-[var(--color-bg)] hover:bg-[var(--color-border)] text-[var(--color-heading)] font-bold text-xs border border-[var(--color-border)] transition-colors flex items-center justify-center gap-2"
                >
                  {copied ? '✅ Texto Copiado com Sucesso!' : '📋 Copiar Resumo do Orçamento'}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-strong)] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Encerrar Venda e Fechar
                </button>
              </div>

              {/* Helpful Tip */}
              <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-left text-xs text-[var(--color-text-soft)] space-y-1">
                <p className="font-bold text-[var(--color-heading)]">💡 Importante para a Validação:</p>
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-accent-strong)] mb-1">
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
                    className={`w-full p-2.5 rounded-xl border text-sm text-[var(--color-heading)] focus:ring-2 focus:ring-[var(--color-accent)] outline-none ${
                      errorMsg && !customerName.trim() ? 'border-red-500 bg-red-50/50' : 'border-[var(--color-border)]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-accent-strong)] mb-1">
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
                    className={`w-full p-2.5 rounded-xl border text-sm text-[var(--color-heading)] focus:ring-2 focus:ring-[var(--color-accent)] outline-none ${
                      errorMsg && customerWhatsapp.replace(/\D/g, '').length < 10 ? 'border-red-500 bg-red-50/50' : 'border-[var(--color-border)]'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-accent-strong)] mb-1">
                    Seu E-mail (Opcional)
                  </label>
                  <input
                    type="email"
                    placeholder="Ex: maria@gmail.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-heading)] focus:ring-2 focus:ring-[var(--color-accent)] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-accent-strong)] mb-1 flex items-center justify-between">
                    <span>Data de Nascimento</span>
                    <span className="text-[10px] text-[var(--color-accent)] font-normal">🎂 P/ Presentes</span>
                  </label>
                  <input
                    type="date"
                    value={customerBirthDate}
                    onChange={(e) => setCustomerBirthDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-heading)] focus:ring-2 focus:ring-[var(--color-accent)] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-accent-strong)] mb-1">
                  Data Desejada da Entrega / Festa *
                </label>
                <AvailabilityDatePicker
                  value={eventDate}
                  onChange={setEventDate}
                  blockedDates={blockedDates}
                  minDaysFromNow={minLeadDays}
                />
                <p className="text-[10px] text-[var(--color-text-soft)] mt-1.5">
                  Dias em cinza já estão com a agenda cheia. Pedimos no mínimo {minLeadDays} dia{minLeadDays !== 1 ? 's' : ''} de antecedência.
                </p>
              </div>

              {/* Coupon Code */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-accent-strong)] mb-1">
                  Cupom de Desconto (opcional)
                </label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-300 bg-emerald-50">
                    <span className="text-sm font-bold text-emerald-800">
                      🎉 {appliedCoupon.code} aplicado
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Ex: NIVER10"
                      className="flex-1 p-2.5 rounded-xl border border-[var(--color-border)] text-sm font-mono uppercase text-[var(--color-heading)] focus:ring-2 focus:ring-[var(--color-accent)] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="px-4 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-strong)] text-white text-xs font-bold disabled:opacity-50"
                    >
                      {couponLoading ? '...' : 'Aplicar'}
                    </button>
                  </div>
                )}
                {couponMsg && !appliedCoupon && <p className="text-[11px] font-semibold text-red-600 mt-1">{couponMsg}</p>}
              </div>

              {/* Payment Method Choice */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-accent-strong)] mb-2 flex items-center justify-between">
                  <span>Forma de Pagamento Preferida</span>
                  <span className="text-[11px] font-semibold text-[var(--color-accent)]">Escolha uma opção</span>
                </label>
                <p className="text-[11px] text-[var(--color-text-soft)] mb-2 -mt-1">
                  💌 É só uma preferência por agora! Depois que a Cinthia aprovar seu orçamento, ela mesma vai te chamar no WhatsApp para combinar o sinal.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Pix Button */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      paymentMethod === 'pix'
                        ? 'border-[#32BCAD] bg-emerald-50/60 ring-2 ring-[#32BCAD]/30 shadow-sm'
                        : 'border-[var(--color-border)] bg-white hover:bg-[var(--color-bg)]'
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
                    <span className="text-xs font-bold text-[var(--color-heading)]">Pix (Sinal {depositPercentage}%)</span>
                    <span className="text-[10px] text-gray-500">Sinal combinado depois, no WhatsApp</span>
                  </button>

                  {/* Credit Card Button */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      paymentMethod === 'card'
                        ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/30 shadow-sm'
                        : 'border-[var(--color-border)] bg-white hover:bg-[var(--color-bg)]'
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
                    <span className="text-xs font-bold text-[var(--color-heading)]">Cartão de Crédito</span>
                    <span className="text-[10px] text-gray-500">Visa, Master, Elo em até 12x</span>
                  </button>

                  {/* Money Button */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('money')}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      paymentMethod === 'money'
                        ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/30 shadow-sm'
                        : 'border-[var(--color-border)] bg-white hover:bg-[var(--color-bg)]'
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
                    <span className="text-xs font-bold text-[var(--color-heading)]">Dinheiro em Espécie</span>
                    <span className="text-[10px] text-gray-500">Pagamento na entrega/retirada</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-accent-strong)] mb-1">
                  Tema da Festa / Observações Especiais
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Tema Princesa, frase no bentô cake: 'Parabéns Maria 30 anos', etc."
                  value={themeNotes}
                  onChange={(e) => setThemeNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-heading)] focus:ring-2 focus:ring-[var(--color-accent)] outline-none resize-none"
                />
              </div>

              {/* LGPD Consent Checkbox */}
              <div className="p-3.5 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lgpdConsent}
                    onChange={(e) => setLgpdConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-[var(--color-accent)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                  />
                  <span className="text-[11px] text-[var(--color-text-soft)] leading-tight">
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

          {/* Live Summary Calculation Card — estilo "recibo" */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-strong)] px-4 py-2.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-white text-xs font-bold uppercase tracking-wider">Resumo do Pedido</span>
            </div>

            <div className="px-4 pt-3.5 pb-1">
              <p className="font-serif font-bold text-base text-[var(--color-heading)] leading-snug">
                {selectedProduct?.name}
              </p>
              <p className="text-xs text-[var(--color-accent-strong)] font-semibold">
                {selectedVariation?.name || 'Padrão'}
              </p>
            </div>

            <div className="px-4 py-2 space-y-2">
              {frosting && selectedProduct?.slug !== 'biscoitos-amanteigados' && selectedProduct?.slug !== 'mini-bolo' && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--color-text-soft)]">Cobertura</span>
                  <span className="font-semibold text-[var(--color-heading)]">
                    {frosting}{' '}
                    {frosting === 'Buttercream'
                      ? selectedProduct?.slug === 'kit-festa-celebrar'
                        ? '(Incluso no Kit)'
                        : '(+R$ 20,00)'
                      : '(Incluso)'}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--color-text-soft)]">Quantidade</span>
                <span className="font-semibold text-[var(--color-heading)]">
                  {isBiscoito
                    ? `${noPalitoBiscoitoCount} sem palito + ${palitoCount} com palito (${effectiveQuantity}x)`
                    : `${quantity}x`}
                </span>
              </div>
              {isBiscoito && palitoCount > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--color-text-soft)]">Adicional Suporte no Palito</span>
                  <span className="font-semibold text-[var(--color-accent)]">+{formatCurrency(palitoTotalCost)}</span>
                </div>
              )}
              {isBiscoito && wantsRibbonTag && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--color-text-soft)]">Fita de Cetim + Tag</span>
                  <span className="font-semibold text-[var(--color-accent)]">+{formatCurrency(ribbonTagCost)}</span>
                </div>
              )}
              {!isBiscoito && extraCostPerUnit > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--color-text-soft)]">Adicionais / Cobertura</span>
                  <span className="font-semibold text-[var(--color-accent)]">+{formatCurrency(extraCostPerUnit * quantity)}</span>
                </div>
              )}
              {appliedCoupon && couponDiscount > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-emerald-700 font-semibold">Cupom {appliedCoupon.code}</span>
                  <span className="font-semibold text-emerald-700">-{formatCurrency(couponDiscount)}</span>
                </div>
              )}
            </div>

            <div className="mx-4 border-t border-dashed border-[#E5B9AC]" />

            <div className="px-4 py-3 flex items-center justify-between bg-[var(--color-surface-alt)]">
              <span className="font-bold text-xs uppercase tracking-wider text-[var(--color-heading)]">Total Estimado</span>
              <span className="font-serif font-extrabold text-2xl text-[var(--color-accent)]">
                {formatCurrency(finalTotal)}
              </span>
            </div>
            {paymentMethod === 'pix' && (
              <div className="px-4 py-2 flex items-center justify-between bg-emerald-50 border-t border-emerald-100">
                <span className="text-[11px] font-bold text-emerald-800">
                  Sinal p/ reservar ({depositPercentage}%)
                </span>
                <span className="font-bold text-sm text-emerald-800">
                  {formatCurrency(depositAmount)}
                </span>
              </div>
            )}
          </div>

        </div>

        {/* Footer Navigation Controls */}
        {step < 4 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2.5 rounded-full border border-[var(--color-border)] bg-white text-[var(--color-heading)] text-xs font-semibold hover:bg-gray-100 flex items-center gap-1"
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
                className="px-6 py-2.5 rounded-full bg-[var(--color-accent)] text-white text-xs font-bold hover:bg-[var(--color-accent-strong)] transition-colors flex items-center gap-1 shadow-sm"
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
