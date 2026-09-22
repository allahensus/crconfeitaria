# A História do CR Confeitaria

## O ponto de partida

A Confeitaria Cinthia Rodrigues é um negócio real de bolos e doces artesanais sob encomenda — bentô cakes, bolos personalizados, biscoitos amanteigados. Como praticamente toda confeitaria autônoma no Brasil, o atendimento inteiro acontecia pelo WhatsApp: a cliente mandava mensagem descrevendo o que queria, a confeiteira calculava o orçamento na mão (ou de cabeça), anotava o pedido numa agenda ou planilha, cobrava o sinal por Pix e controlava o financeiro à parte, muitas vezes só na memória.

Esse modelo funciona até certo ponto, mas tem um teto. Cada orçamento consome tempo de resposta manual. Não existe visão consolidada de quantos pedidos estão em aberto, quanto falta receber, ou quanto de insumo (farinha, chocolate, embalagem) já foi gasto contra o que ainda tem em estoque. E cada erro de anotação — uma data de entrega esquecida, um pagamento não registrado — vira prejuízo ou constrangimento com a cliente.

A decisão foi construir uma plataforma própria: um site onde a cliente monta o próprio orçamento sozinha, 24 horas por dia, e um painel administrativo onde a confeiteira enxerga e controla tudo — pedidos, financeiro, estoque, equipe — num lugar só.

## Uma decisão de arquitetura logo no início: pensar além de uma confeitaria só

Desde a concepção, o projeto não foi desenhado como "o site da Cinthia", mas como uma plataforma que poderia, no futuro, hospedar várias confeitarias diferentes rodando sobre a mesma base de código — cada uma com seu próprio subdomínio, seus próprios produtos, clientes e financeiro, sem que os dados de uma nunca se misturem com os de outra. Essa escolha (multi-tenant desde o primeiro dia) foi também o maior desafio técnico do projeto: qualquer consulta ao banco de dados que esquecesse de filtrar por "de qual confeitaria é esse dado" seria uma falha grave — não um erro visível na tela, mas um vazamento silencioso de informação de um negócio para outro. A solução foi centralizar o acesso ao banco numa camada única que aplica esse filtro automaticamente em toda consulta, tornando esse tipo de erro estruturalmente quase impossível de acontecer por descuido.

## Como funciona — a jornada da cliente

1. A cliente entra no site e navega pelo catálogo, organizado por categoria (bolos, biscoitos, etc.), com fotos reais de trabalhos já entregues numa galeria.
2. Ela escolhe um produto, a variação (tamanho, número de fatias), o recheio e a cobertura, e monta o orçamento numa calculadora interativa — que já calcula o valor final, aplica cupom de desconto se ela tiver um, e sugere o valor do sinal.
3. O calendário mostra, de forma transparente, quais datas já estão indisponíveis (a confeiteira bloqueia manualmente quando a agenda está cheia), evitando pedir uma data que não vai poder ser atendida.
4. O orçamento é enviado. A partir daí, a comunicação segue pelo WhatsApp (o botão flutuante do site já leva direto pra lá), mas agora com todo o cálculo e o histórico já registrados no sistema — não depende mais da memória de ninguém.
5. Depois da entrega, a cliente recebe um link de avaliação, onde deixa um depoimento — que pode aparecer na vitrine pública, funcionando como prova social pra próximas clientes.

## Como funciona — a jornada da confeiteira (o painel administrativo)

- **Orçamentos e pedidos**: cada orçamento recebido vira um pedido rastreável, com um pipeline de status claro — novo, aguardando confirmação, confirmado, em produção, pronto, entregue. Nunca mais um pedido "se perde" no meio do caminho.
- **Financeiro**: toda receita e despesa é registrada e categorizada, incluindo pagamentos parciais (sinal + restante), com cobrança de Pix gerada direto pelo sistema.
- **Estoque de insumos**: cada produto tem uma "receita" — quanto de cada ingrediente ele consome. Quando um pedido é confirmado, o estoque é baixado automaticamente com base nessa receita, então a confeiteira sabe, em tempo real, quanto de farinha, chocolate ou embalagem ainda tem disponível, sem precisar contar manualmente depois de cada produção.
- **Equipe**: o sistema tem dois papéis — dona da loja (acesso total, incluindo financeiro e equipe) e equipe de produção/atendimento (acesso operacional, sem ver o financeiro). E há um cuidado extra de segurança aqui: se alguém perde o cargo de dona (é rebaixado), o sistema revalida essa permissão direto no banco a cada ação sensível, em vez de confiar cegamente numa sessão de login antiga — então um acesso indevido não fica "esquecido" ativo.
- **Clientes**: um cadastro simples de CRM, com WhatsApp, histórico de pedidos, total já gasto, aniversário (pra ações de relacionamento) e consentimento de uso de dados (LGPD).
- **Galeria**: fotos de trabalhos entregues, organizadas por categoria, com upload em lote (várias fotos de uma vez, já classificadas), ajuste de enquadramento (zoom e posição) direto na interface, reordenação por arrastar (no computador) ou por setas (no celular), e exclusão em massa.

## Desafios reais enfrentados no caminho

- **Arquitetural**: garantir isolamento de dados entre confeitarias diferentes (multi-tenant) sem abrir brechas de segurança.
- **Segurança de credenciais**: numa revisão de segurança, foi identificado que a tela de login vinha com o e-mail e a senha reais já preenchidos no formulário — qualquer pessoa com o link conseguia entrar sem saber a senha. Também foi encontrado que a senha real do painel estava escrita em texto puro dentro do código-fonte (no script de configuração inicial do banco). Ambos os problemas foram corrigidos: a senha passou a ser gerada e trocada fora do código, nunca commitada.
- **Usabilidade real, não só "funcionar no computador"**: a confeiteira usa o painel principalmente pelo celular. Duas vezes, uma funcionalidade nova (upload de fotos, reordenação por arrastar) funcionou perfeitamente no navegador de computador mas não funcionava no toque do celular — exigindo um segundo ajuste feito só depois de testar de verdade no dispositivo real que ela usa no dia a dia.

## Onde o projeto está hoje e pra onde pode ir

Hoje a plataforma atende a Confeitaria Cinthia Rodrigues em produção, com pedidos, financeiro e estoque reais. A arquitetura multi-tenant, porém, já está pronta pra um passo seguinte: oferecer essa mesma plataforma como produto pra outras confeiteiras autônomas que vivem exatamente o mesmo problema — atendimento manual via WhatsApp, sem controle de pedido, financeiro ou estoque. O que falta pra isso é o que normalmente falta em todo produto nessa fase: um fluxo de cadastro self-service pra novas lojas entrarem sozinhas (hoje é feito manualmente), e validar a proposta de valor com um segundo cliente pagante real, fora do primeiro.
