import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Confeitaria Cinthia Database...');

  // 1. Create Admin User
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cinthia.com' },
    update: {
      password: hashedPassword,
    },
    create: {
      email: 'admin@cinthia.com',
      name: 'Cinthia Rodrigues',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  console.log('Admin user created:', admin.email);

  // 2. Settings
  const settingsData = [
    { key: 'bakery_name', value: 'Cinthia Rodrigues - Confeitaria Artesanal' },
    { key: 'whatsapp_number', value: '5511999999999' },
    { key: 'instagram', value: '@crconfeitaria__' },
    { key: 'address', value: 'São Paulo - SP' },
    { key: 'welcome_message', value: 'Olá! Seja bem-vinda à Confeitaria Cinthia Rodrigues. Monte seu orçamento ou fale conosco!' },
    { key: 'min_lead_days', value: '3' },
  ];

  for (const s of settingsData) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  // 3. Categories
  const catBolos = await prisma.category.upsert({
    where: { slug: 'bolos' },
    update: {},
    create: {
      name: 'Bolos Personalizados',
      slug: 'bolos',
      description: 'Bolos artesanais incríveis feitos com ingredientes selecionados.',
      order: 1,
    },
  });

  const catBiscoitos = await prisma.category.upsert({
    where: { slug: 'biscoitos' },
    update: {},
    create: {
      name: 'Biscoitos Amanteigados',
      slug: 'biscoitos',
      description: 'Biscoitos artesanais personalizados desenhados à mão.',
      order: 2,
    },
  });

  const catKits = await prisma.category.upsert({
    where: { slug: 'kits' },
    update: {},
    create: {
      name: 'Kits & Festas',
      slug: 'kits',
      description: 'Kits especiais combinando bolo e biscoitos para sua festa.',
      order: 3,
    },
  });

  // 4. Products & Variations

  // Product 1: Bentô Cake
  await prisma.product.upsert({
    where: { slug: 'bento-cake' },
    update: {
      mainImage: '/images/bento_cake.jpg',
    },
    create: {
      name: 'Bentô Cake',
      slug: 'bento-cake',
      categoryId: catBolos.id,
      description: 'Bentô Cake é um bolo personalizado na marmita. Ele tem 10 cm de diâmetro, pesa aproximadamente 450g e serve bem 2 pessoas. Possui 2 camadas de massa e 1 camada bem generosa de recheio. Embalado em hambúrgueria biodegradável personalizada, acompanha colher de madeira e velinha.',
      mainImage: '/images/bento_cake.jpg',
      basePrice: 95.0,
      unit: 'unidade',
      yieldInfo: '10cm, ~450g (serve 2 pessoas)',
      active: true,
      featured: true,
      variations: {
        create: [
          { name: 'Bentô Cake Tradicional (10cm)', price: 95.0, weight: '450g', slices: '2 fatias' },
        ]
      }
    },
  });

  // Product 2: Mini Bolo
  await prisma.product.upsert({
    where: { slug: 'mini-bolo' },
    update: {
      mainImage: '/images/mini_bolo.jpg',
    },
    create: {
      name: 'Mini Bolo Artesanal',
      slug: 'mini-bolo',
      categoryId: catBolos.id,
      description: 'Bolo encantador ideal para pequenas celebrações e fotos especiais. Rende aproximadamente 7 fatias com massas de baunilha ou chocolate e recheios generosos.',
      mainImage: '/images/mini_bolo.jpg',
      basePrice: 110.0,
      unit: 'unidade',
      yieldInfo: 'Aproximadamente 7 fatias',
      active: true,
      featured: true,
      variations: {
        create: [
          { name: 'Cobertura em Chantily', price: 110.0, slices: '7 fatias' },
          { name: 'Cobertura em Buttercream', price: 130.0, slices: '7 fatias' },
        ]
      }
    },
  });

  // Product 3: Bolos Redondos
  await prisma.product.upsert({
    where: { slug: 'bolos-redondos' },
    update: {
      mainImage: '/images/bolo_redondo.jpg',
    },
    create: {
      name: 'Bolos Redondos Personalizados',
      slug: 'bolos-redondos',
      categoryId: catBolos.id,
      description: 'Bolos redondos altos, super recheados e decorados com técnica artesanal refinada. Escolha a quantidade de fatias e o seu recheio favorito.',
      mainImage: '/images/bolo_redondo.jpg',
      basePrice: 125.0,
      unit: 'unidade',
      yieldInfo: 'De 9 a 24 fatias',
      active: true,
      featured: true,
      variations: {
        create: [
          { name: '09 a 11 Fatias', price: 125.0, slices: '09-11 fatias' },
          { name: '13 a 15 Fatias', price: 155.0, slices: '13-15 fatias' },
          { name: '17 a 19 Fatias', price: 185.0, slices: '17-19 fatias' },
          { name: '20 a 24 Fatias', price: 235.0, slices: '20-24 fatias' },
        ]
      }
    },
  });

  // Product 4: Bolos Retangulares
  await prisma.product.upsert({
    where: { slug: 'bolos-retangulares' },
    update: {
      mainImage: '/images/bolo_retangular.jpg',
    },
    create: {
      name: 'Bolos Retangulares',
      slug: 'bolos-retangulares',
      categoryId: catBolos.id,
      description: 'Perfeitos para grandes eventos, aniversários e festas de família. Excelente rendimento com o sabor inconfundível da confeitaria artesanal.',
      mainImage: '/images/bolo_retangular.jpg',
      basePrice: 145.0,
      unit: 'unidade',
      yieldInfo: 'De 13 a 60 fatias',
      active: true,
      featured: false,
      variations: {
        create: [
          { name: '13 a 15 Fatias', price: 145.0, slices: '13-15 fatias' },
          { name: '20 a 24 Fatias', price: 235.0, slices: '20-24 fatias' },
          { name: '35 a 40 Fatias', price: 265.0, slices: '35-40 fatias' },
          { name: '55 a 60 Fatias', price: 325.0, slices: '55-60 fatias' },
        ]
      }
    },
  });

  // Product 5: Biscoitos Amanteigados
  await prisma.product.upsert({
    where: { slug: 'biscoitos-amanteigados' },
    update: {
      mainImage: '/images/biscoitos_amanteigados.jpg',
    },
    create: {
      name: 'Biscoitos Amanteigados Personalizados',
      slug: 'biscoitos-amanteigados',
      categoryId: catBiscoitos.id,
      description: 'Biscoitos amanteigados crocantes e delicados, decorados artesanalmente com glacê real no tema da sua festa.',
      mainImage: '/images/biscoitos_amanteigados.jpg',
      basePrice: 5.0,
      unit: 'unidade',
      yieldInfo: 'Tamanhos de 4cm a 9cm',
      active: true,
      featured: true,
      variations: {
        create: [
          { name: 'Biscoitos 4cm (4 desenhos) - Mínimo 20 un.', price: 5.0, slices: '4cm' },
          { name: 'Biscoitos 6cm (5 desenhos) - Mínimo 10 un.', price: 11.90, slices: '6cm' },
          { name: 'Biscoitos 9cm (4 desenhos) - Mínimo 4 un.', price: 21.90, slices: '9cm' },
        ]
      }
    },
  });

  // Product 5: Kit Festa Celebrar
  await prisma.product.upsert({
    where: { slug: 'kit-festa-celebrar' },
    update: {
      mainImage: '/images/bento_cake.jpg',
    },
    create: {
      name: 'Kit Festa Celebrar (Bentô Cake + Biscoitos)',
      slug: 'kit-festa-celebrar',
      categoryId: catKits.id,
      description: 'Combo perfeito para comemorações íntimas! Acompanha 1 Bentô Cake artesanal personalizado + 10 Biscoitos Amanteigados desenhados no tema da festa.',
      mainImage: '/images/bento_cake.jpg',
      basePrice: 160.0,
      unit: 'kit',
      yieldInfo: 'Bentô Cake + 10 Biscoitos Decorados',
      active: true,
      featured: true,
      variations: {
        create: [
          { name: 'Kit Básico (Bentô + 10 Biscoitos 6cm)', price: 160.0, weight: '450g + 10 biscoitos', slices: '2 fatias + biscoitos' },
          { name: 'Kit Premium (Bentô + 20 Biscoitos 6cm)', price: 240.0, weight: '450g + 20 biscoitos', slices: '2 fatias + biscoitos' },
        ]
      }
    },
  });

  // 5. Fillings Options (20 Fillings)
  const fillings = [
    { name: 'Alpino', category: 'Gourmet' },
    { name: 'Beijinho com Abacaxi', category: 'Frutas' },
    { name: 'Beijinho com Morangos', category: 'Frutas' },
    { name: 'Brigadeiro Gourmet com Bombom Sonho de Valsa', category: 'Especial' },
    { name: 'Brigadeiro Gourmet com Bombom Ouro Branco', category: 'Especial' },
    { name: 'Brigadeiro Gourmet com Morangos', category: 'Frutas' },
    { name: 'Brigadeiro Quatro Leites com Frutas Amarelas', category: 'Frutas' },
    { name: 'Brigadeiro Quatro Leites com Frutas Vermelhas', category: 'Frutas' },
    { name: 'Brigadeiro Quatro Leites com Morangos', category: 'Frutas' },
    { name: 'Brigadeiro de Nutella com Nozes', category: 'Especial' },
    { name: 'Doce de Leite com Ameixa', category: 'Tradicional' },
    { name: 'Doce de Leite com Compota de Abacaxi', category: 'Frutas' },
    { name: 'Doce de Leite com Coco', category: 'Tradicional' },
    { name: 'Doce de Leite com Praliné de Nozes', category: 'Especial' },
    { name: 'Ninho', category: 'Tradicional' },
    { name: 'Ninho com Abacaxi', category: 'Frutas' },
    { name: 'Ninho com Morangos', category: 'Frutas' },
    { name: 'Ninho Trufado', category: 'Gourmet' },
    { name: 'Ninho com Nutella', category: 'Gourmet' },
    { name: 'Prestígio', category: 'Tradicional' },
  ];

  for (const f of fillings) {
    const existing = await prisma.fillingOption.findFirst({ where: { name: f.name } });
    if (!existing) {
      await prisma.fillingOption.create({
        data: {
          name: f.name,
          category: f.category,
          extraPrice: 0.0,
          active: true,
        }
      });
    }
  }

  // 6. Initial Ingredients for Dynamic Pricing
  const ingredientsData = [
    { name: 'Leite Condensado (Moça / Itambé)', unit: 'g', packageQuantity: 395, costPrice: 7.50, category: 'Laticínios' },
    { name: 'Creme de Leite 20%', unit: 'g', packageQuantity: 200, costPrice: 4.20, category: 'Laticínios' },
    { name: 'Manteiga Extra Sem Sal', unit: 'g', packageQuantity: 200, costPrice: 14.00, category: 'Laticínios' },
    { name: 'Chocolate Nobre 50% Callebaut', unit: 'g', packageQuantity: 1000, costPrice: 85.00, category: 'Chocolates' },
    { name: 'Farinha de Trigo Premium', unit: 'g', packageQuantity: 1000, costPrice: 6.00, category: 'Secos' },
    { name: 'Açúcar Refinado / Impalpável', unit: 'g', packageQuantity: 1000, costPrice: 4.80, category: 'Secos' },
    { name: 'Ovos Médios', unit: 'un', packageQuantity: 30, costPrice: 18.00, category: 'Frescos' },
    { name: 'Chantilly Amélia / Supreme', unit: 'ml', packageQuantity: 1000, costPrice: 22.00, category: 'Coberturas' },
    { name: 'Caixa & Embalagem Decorativa', unit: 'un', packageQuantity: 1, costPrice: 5.50, category: 'Embalagens' },
  ];

  for (const ing of ingredientsData) {
    const existing = await prisma.ingredient.findFirst({ where: { name: ing.name } });
    if (!existing) {
      await prisma.ingredient.create({ data: ing });
    }
  }

  // 7. Testimonials
  const testimonials = [
    {
      name: 'Mariana Silva',
      eventType: 'Aniversário Infantil',
      comment: 'O bolo de Ninho com Morangos estava divino e super delicado! Todos os convidados elogiaram muito.',
      rating: 5,
    },
    {
      name: 'Camila Rocha',
      eventType: 'Mesversário',
      comment: 'Os biscoitos personalizados do Bentô Cake superaram minhas expectativas. Dá até pena de comer de tão lindo!',
      rating: 5,
    },
    {
      name: 'Fernanda Lima',
      eventType: 'Casamento',
      comment: 'Atendimento impecável via WhatsApp e a entrega foi super pontual. O bolo retangular rendeu maravilhosamente.',
      rating: 5,
    }
  ];

  for (const t of testimonials) {
    const existing = await prisma.testimonial.findFirst({ where: { name: t.name } });
    if (!existing) {
      await prisma.testimonial.create({ data: t });
    }
  }

  // 7. Seed Initial Customer and Sample Order for Dashboard metrics
  const sampleCustomer = await prisma.customer.create({
    data: {
      name: 'Maria Oliveira',
      whatsapp: '5511988887777',
      email: 'maria@gmail.com',
      notes: 'Cliente preferencial, gosta de massa de baunilha.',
      totalSpent: 420.0,
      ordersCount: 2,
    }
  });

  const sampleOrder = await prisma.order.create({
    data: {
      orderNumber: 'PED-2026-0001',
      customerId: sampleCustomer.id,
      customerName: sampleCustomer.name,
      customerWhatsapp: sampleCustomer.whatsapp,
      deliveryDate: new Date(Date.now() + 86400000 * 3), // 3 days from now
      status: 'CONFIRMADO',
      totalAmount: 235.0,
      paidAmount: 120.0,
      paymentStatus: 'PARCIAL',
      notes: 'Entregar às 15h. Tema: Jardim Encantado',
      items: {
        create: [
          {
            productName: 'Bolos Redondos Personalizados',
            variationName: '20 a 24 Fatias',
            cakeBase: 'Baunilha',
            filling1: 'Ninho com Morangos',
            quantity: 1,
            unitPrice: 235.0,
            totalPrice: 235.0,
          }
        ]
      },
      payments: {
        create: [
          {
            amount: 120.0,
            paymentMethod: 'Pix',
            status: 'CONFIRMADO',
            notes: 'Sinal de 50%'
          }
        ]
      }
    }
  });

  // Financial Transaction for the Payment
  await prisma.financialTransaction.create({
    data: {
      type: 'RECEITA',
      amount: 120.0,
      category: 'Venda de Pedido',
      description: 'Sinal Pix Pedido PED-2026-0001',
      orderId: sampleOrder.id,
    }
  });

  // Sample Expense
  const sampleExpense = await prisma.expense.create({
    data: {
      description: 'Compra de Embalagens e caixas para bolos',
      category: 'Embalagens',
      amount: 85.0,
      paymentMethod: 'Pix',
      notes: 'Fornecedor Embalagens SP',
    }
  });

  await prisma.financialTransaction.create({
    data: {
      type: 'DESPESA',
      amount: 85.0,
      category: 'Embalagens',
      description: 'Compra de Embalagens e caixas para bolos',
      expenseId: sampleExpense.id,
    }
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
