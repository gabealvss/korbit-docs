/**
 * Enriquecimento pt-BR da spec pública.
 *
 * Chave = operationId do OpenAPI de origem. Para cada operação:
 *   - summary:     título da página (pt-BR, imperativo)
 *   - description: contexto, comportamento e notas (markdown)
 *   - params:      descrições de path/query/header parameters (por nome)
 *   - body:        descrições das propriedades do corpo da requisição
 *   - content:     bloco MDX (x-mint.content) injetado acima do endpoint —
 *                  use apenas componentes Mintlify suportados (<Note>, <Tip>, <Warning>)
 *
 * NUNCA mencione provedores de pagamento, URLs de staging ou detalhes internos.
 */

export const operations = {
  // ───────────────────────────── Pagamentos ─────────────────────────────
  createPaymentIntent: {
    summary: 'Criar payment intent',
    description:
      'Cria uma cobrança por **PIX** ou **cartão**. A resposta vem em `REQUIRES_ACTION` com os dados para o comprador pagar (código PIX copia-e-cola) ou com o desafio de autenticação pendente. O estado final da cobrança chega pelos eventos de webhook — consulte `GET /v1/payment-intents/{id}` sempre que precisar do estado autoritativo. Requer `Idempotency-Key`.',
    body: {
      amount: 'Valor total em centavos (BRL). Ex.: `14990` = R$ 149,90. Não há campo de desconto nem taxa — o valor cobrado é exatamente este.',
      currency: 'Moeda da cobrança. Atualmente apenas `BRL`.',
      paymentMethod: 'Método de pagamento: `PIX` para cobrança instantânea por QR/copia-e-cola ou `CARD` para cartão de crédito.',
      description: 'Descrição visível nos relatórios e na conciliação (ex.: "Pedido #1042"). Não é exibida ao comprador no checkout hospedado.',
      externalReference: 'Seu identificador interno do pedido (ex.: id no seu banco). Útil para conciliar depois — pode ser consultado e filtrado.',
      expiresInSeconds: 'TTL da cobrança em segundos. Após expirar, a cobrança não pode mais ser paga (PIX padrão: 900 s).',
      metadata: 'Objeto livre para seus dados (máx. de chaves limitado pelo schema). Nunca inclua dados pessoais sensíveis.',
    },
    content: '<Note>\nO valor é sempre em **centavos** e é fixado server-side a partir deste corpo — o comprador não altera valores. Veja [Moeda e valores](/guias/moeda-e-valores).\n</Note>\n\n<Tip>\nGere um `Idempotency-Key` novo por intenção de cobrança e reutilize-o nos retries do mesmo request. Veja [Idempotência](/guias/idempotencia).\n</Tip>',
  },
  getPaymentIntent: {
    summary: 'Obter payment intent',
    description:
      'Retorna o estado atual e todos os dados de uma cobrança da sua conta. Use para conciliação, retomada de compra (status `REQUIRES_ACTION` com dados do PIX) e verificação pós-webhook.',
    params: {
      id: 'Identificador do payment intent (UUID).',
    },
  },

  // ───────────────────────────── Checkout ─────────────────────────────
  createCommerceCheckoutSession: {
    summary: 'Criar sessão de checkout',
    description:
      'Cria uma sessão de checkout de vida curta (30 min) para uma oferta publicada, com os dados do comprador já preenchidos — o comprador vai direto ao pagamento. A sessão resultante é a mesma usada pelo [link de pagamento](/pagamentos/checkout-links); o valor é fixado server-side a partir do snapshot da oferta.',
    content: '<Note>\nO token da sessão é entregue uma única vez na resposta e expira em 30 minutos. A página de checkout hospedada consome esse token — sua aplicação normalmente só precisa redirecionar o comprador.\n</Note>',
  },
  resolveCommerceCheckoutLink: {
    summary: 'Obter link de pagamento',
    description:
      'Retorna os dados públicos de um [link de pagamento](/pagamentos/checkout-links) (oferta, estado de publicação e destino). Use para validar catálogo e sincronizar links com sua base.',
    params: {
      publicCode: 'Código público da oferta (a parte final do link: `korbit.com.br/o/{publicCode}`).',
    },
  },

  // ───────────────────────────── Assinaturas ─────────────────────────────
  listCommerceSubscriptions: {
    summary: 'Listar assinaturas',
    description:
      'Lista paginada das assinaturas da sua conta, com filtros por estado e cliente. Use os contadores de [pedidos](/api-reference/clientes-e-pedidos/list-order-views) para dashboards e esta listagem para recorrência detalhada.',
  },
  getCommerceSubscription: {
    summary: 'Obter assinatura',
    description:
      'Retorna uma assinatura com estado atual, oferta vigente e próximas cobranças agendadas.',
  },
  listCommerceSubscriptionInvoices: {
    summary: 'Listar faturas da assinatura',
    description:
      'Faturas geradas por ciclo da assinatura, com valor, data e resultado da cobrança — a base da sua conciliação de recorrência.',
  },
  requestCommerceSubscriptionCancellation: {
    summary: 'Cancelar assinatura',
    description:
      'Cancela imediatamente: nenhuma nova fatura é gerada. As faturas já pagas não são afetadas. O comprador também pode cancelar sozinho no [portal do cliente](/pagamentos/assinaturas#portal-do-cliente).',
    content: '<Warning>\nO cancelamento é definitivo para o ciclo atual. Se o objetivo é pausar cobranças, avalie trocar a oferta por uma versão de valor menor via [revisão de oferta](/catalogo-crm/produtos-e-ofertas) em vez de cancelar.\n</Warning>',
  },
  exportCommerceSubscriptionsCsv: {
    summary: 'Exportar assinaturas (CSV)',
    description:
      'Exporta a lista filtrada de assinaturas em CSV (streaming). Células com começo de fórmula são neutralizadas para abrir com segurança em planilhas. Veja [Exportações](/guias/exportacoes).',
  },

  // ───────────────────────────── Clientes e Pedidos ─────────────────────────────
  createCommerceCustomer: {
    summary: 'Criar cliente',
    description:
      'Cadastra um cliente na sua base Korbit. O e-mail é o identificador natural: duplicado retorna `409 CUSTOMER_EMAIL_TAKEN`. Compradores que já pagaram por link também aparecem aqui automaticamente.',
    body: {
      name: 'Nome completo do cliente.',
      email: 'E-mail único na sua base — usado no portal do cliente e nas cobranças recorrentes.',
      phone: 'Telefone do cliente (formato E.164 recomendado).',
      externalId: 'Seu identificador interno do cliente para sincronização com sua base.',
    },
  },
  listCommerceCustomers: {
    summary: 'Listar clientes',
    description: 'Lista paginada com busca por nome/e-mail. Paginação por cursor (`cursor` + `limit`).',
  },
  getCommerceCustomer: {
    summary: 'Obter cliente',
    description: 'Retorna o cliente com histórico resumido de compras na sua conta.',
  },
  updateCommerceCustomer: {
    summary: 'Atualizar cliente',
    description: 'Atualiza nome, e-mail e dados de contato. Enviar somente os campos que mudam (patch parcial).',
  },
  archiveCommerceCustomer: {
    summary: 'Arquivar cliente',
    description:
      'Remove o cliente das listagens sem apagar o histórico de pedidos. Operação reversível via suporte.',
  },
  createCommercePortalSession: {
    summary: 'Criar sessão do portal do cliente',
    description:
      'Gera um link único e de curta duração para o cliente gerenciar as próprias assinaturas (cancelar, trocar de plano, pedir refund) no portal hospedado da Korbit.',
    content: '<Note>\nO link é de uso único e expira rápido. Envie ao cliente por seu canal de e-mail/chat e nunca armazene o token no seu backend como credencial.\n</Note>',
  },
  revokeCommercePortalSessions: {
    summary: 'Revogar sessões do portal',
    description:
      'Revoga todas as sessões de portal ativas (e links não utilizados) do cliente. Use em suspeita de acesso indevido ou troca de e-mail.',
  },
  listCommerceOrders: {
    summary: 'Listar pedidos',
    description:
      'Lista paginada de pedidos com filtros por estado, método de pagamento e período. Cada pedido carrega o pagamento associado e o comprador.',
  },
  getCommerceOrder: {
    summary: 'Obter pedido',
    description: 'Detalhe completo do pedido: valores, método de pagamento, comprador e estado atual.',
  },
  countCommerceOrderViews: {
    summary: 'Contadores de pedidos',
    description:
      'Contadores agregados (por estado, método, período) para dashboards — mais barato que contar na listagem.',
  },
  exportCommerceOrdersCsv: {
    summary: 'Exportar pedidos (CSV)',
    description:
      'Exporta a lista filtrada de pedidos em CSV (streaming). Mesmos filtros da listagem; leia a resposta como stream. Veja [Exportações](/guias/exportacoes).',
  },
  exportCommerceCustomersCsv: {
    summary: 'Exportar clientes (CSV)',
    description: 'Exporta a base de clientes filtrada em CSV (streaming), com proteção contra injeção de fórmula.',
  },

  // ───────────────────────────── Catálogo ─────────────────────────────
  createCommerceProduct: {
    summary: 'Criar produto',
    description:
      'O produto é a "ficha" do que você vende. Preço e oferta são entidades separadas e versionadas — crie o produto primeiro, depois [preço](#) e [oferta](#).',
    body: {
      name: 'Nome do produto exibido na página de checkout.',
      description: 'Descrição livre exibida ao comprador.',
      externalReference: 'Seu identificador interno para sincronização de catálogo.',
    },
  },
  listCommerceProducts: {
    summary: 'Listar produtos',
    description: 'Lista paginada do catálogo com estado de cada produto (ativo, arquivado).',
  },
  getCommerceProduct: {
    summary: 'Obter produto',
    description: 'Detalhe do produto, incluindo preços e ofertas vigentes.',
  },
  updateCommerceProduct: {
    summary: 'Atualizar produto',
    description: 'Atualiza nome, descrição e referência externa (patch parcial).',
  },
  archiveCommerceProduct: {
    summary: 'Arquivar produto',
    description: 'Arquiva o produto: nenhuma nova oferta pode ser criada e o produto sai das listagens. Links de ofertas já publicadas deixam de vender.',
  },
  createCommercePriceVersion: {
    summary: 'Criar versão de preço',
    description:
      'Cria uma **nova versão** de preço para o produto — o histórico de preços anteriores é preservado. Valores sempre em centavos (BRL).',
    content: '<Tip>\nNunca edite um preço no lugar: crie uma versão nova. Assim, pedidos antigos continuam explicáveis e o audit trail fica íntegro.\n</Tip>',
  },
  listCommercePriceVersions: {
    summary: 'Listar versões de preço',
    description: 'Histórico completo de preços do produto, mais recente primeiro.',
  },
  createCommerceOffer: {
    summary: 'Criar oferta',
    description:
      'Une produto + preço e define como o comprador pode pagar: métodos aceitos, parcelamento máximo e cadência (avulsa ou recorrente). Só ofertas **publicadas** vendem.',
    body: {
      priceId: 'Versão de preço vigente da oferta.',
      paymentMethods: 'Métodos aceitos no checkout: `PIX` e/ou `CARD`.',
      maxInstallments: 'Parcelamento máximo para cartão (1 a 12). Não altera o valor total.',
    },
  },
  listCommerceOffers: {
    summary: 'Listar ofertas do produto',
    description: 'Todas as ofertas do produto, com estado (rascunho, publicada, arquivada).',
  },
  getCommerceOffer: {
    summary: 'Obter oferta',
    description: 'Detalhe da oferta: preço vigente, métodos de pagamento e estado de publicação.',
  },
  updateCommerceOffer: {
    summary: 'Atualizar oferta',
    description: 'Ajusta configurações da oferta (métodos, parcelamento). Mudanças de preço vão por [nova versão de preço](#).',
  },
  reviseCommerceOffer: {
    summary: 'Criar revisão da oferta',
    description:
      'Cria uma revisão da oferta para alterar condições com histórico preservado. A revisão só passa a valer quando [publicada](#).',
  },
  publishCommerceOffer: {
    summary: 'Publicar oferta',
    description:
      'Publica a oferta (ou revisão) e gera o `publicCode` do link de pagamento. Só ofertas publicadas aceitam checkout.',
  },
  archiveCommerceOffer: {
    summary: 'Arquivar oferta',
    description:
      'Tira a oferta do ar. Sessões de checkout abertas antes do arquivamento ainda completam dentro do TTL (30 min).',
  },
  createCommerceProductImageUpload: {
    summary: 'Iniciar upload de imagem',
    description:
      'Solicita um upload pré-assinado para a imagem do produto. Envie o arquivo direto ao storage com o body **exato** declarado (tipo, tamanho e checksum são verificados). Formatos: JPEG, PNG, WebP — até 2 MiB.',
  },
  getCommerceProductImageUpload: {
    summary: 'Consultar upload de imagem',
    description: 'Estado do upload (pendente, validado, rejeitado) e URL pública quando concluído.',
  },
  completeCommerceProductImageUpload: {
    summary: 'Concluir upload de imagem',
    description:
      'Confirma o upload: a Korbit valida o objeto **armazenado** (tipo, tamanho, checksum). Divergência entre o declarado e o enviado rejeita o upload.',
  },
  replaceCommerceProductTracking: {
    summary: 'Configurar pixels de conversão',
    description:
      'Define os pixels de anúncio do produto (Meta, TikTok, Google). Credenciais (access tokens) são armazenadas criptografadas e nunca retornadas — a resposta só expõe booleanos. Veja [Tracking e pixels](/catalogo-crm/tracking).',
    content: '<Warning>\nEnvie o access token apenas na criação/troca de credencial. Um PUT sem token mantém o token existente; para revogar, use o campo dedicado.\n</Warning>',
  },
  getCommerceProductTracking: {
    summary: 'Obter configuração de tracking',
    description: 'Pixels configurados no produto, sem nunca expor credenciais (apenas `hasAccessToken`).',
  },
  listCommerceProductTrackingEvents: {
    summary: 'Listar eventos de tracking',
    description:
      'Eventos de conversão reportados pelo servidor para o produto, com parâmetros de atribuição — base para conferir a atribuição das suas campanhas.',
  },

  // ───────────────────────────── Saldo e Saques ─────────────────────────────
  getMerchantBalance: {
    summary: 'Consultar saldo',
    description:
      'Saldo atual da conta: disponível para saque e valores a liberar. O disponível é a fonte de verdade para [payouts](/saldo-saques/payout-requests).',
  },
  getMerchantBalanceBreakdown: {
    summary: 'Consultar breakdown do saldo',
    description:
      'Composição detalhada do saldo: disponível, pendente de liberação e reservas (refunds/disputas em andamento).',
  },
  listFundsReleases: {
    summary: 'Listar liberações de recursos',
    description:
      'Liberações passadas e futuras com valor e data. Uma liberação pode estar bloqueada por eventos abertos (refunds, disputas) — os motivos aparecem no item.',
  },
  getFundsReleaseCalendar: {
    summary: 'Calendário de liberações',
    description: 'Datas futuras de liberação e valores previstos por data — projeção de caixa.',
  },
  getFundsReleaseSummary: {
    summary: 'Resumo de liberações',
    description: 'Totais de liberações por período (dia, semana, mês) para relatórios e previsibilidade.',
  },
  createPayoutBeneficiary: {
    summary: 'Cadastrar beneficiário PIX',
    description:
      'Cadastra a chave PIX de destino dos saques. Tipos aceitos: CPF, CNPJ, e-mail, telefone e chave aleatória (EVP). A chave é armazenada **criptografada** e sempre retornada mascarada.',
    body: {
      pixKey: 'A chave PIX em si — validada no cadastro (`403`/`422 INVALID_PIX_KEY` quando inválida).',
      pixKeyType: 'Tipo da chave informada: CPF, CNPJ, EMAIL, PHONE ou EVP (chave aleatória).',
    },
    content: '<Warning>\nBeneficiário é destino de dinheiro: confirme o titular antes de cadastrar. Mudanças de beneficiário passam pelo fluxo de verificação da Korbit.\n</Warning>',
  },
  listPayoutBeneficiaries: {
    summary: 'Listar beneficiários',
    description: 'Beneficiários cadastrados com chaves mascaradas, estado e qual é a chave principal.',
  },
  setPrimaryPayoutBeneficiary: {
    summary: 'Definir beneficiário principal',
    description: 'Marca o beneficiário como destino padrão de novos saques.',
  },
  disablePayoutBeneficiary: {
    summary: 'Desabilitar beneficiário',
    description:
      'Desabilita a chave para novos saques. Saques já aprovados seguem as regras de revalidação na execução.',
  },
  createPayoutRequest: {
    summary: 'Solicitar payout',
    description:
      'Solicita a transferência do saldo disponível para o beneficiário. O valor é **reservado** transacionalmente no momento da solicitação — duas solicitações concorrentes nunca excedem o disponível. A tarifa é calculada e devolvida no breakdown da resposta.',
    body: {
      amountMinor: 'Valor a sacar em centavos (mínimo e saldo disponível são validados).',
      currency: 'Moeda — atualmente `BRL`.',
      beneficiaryId: 'Id do beneficiário (chave PIX de destino).',
    },
    content: '<Note>\nSaques passam por aprovação com verificação humana na Korbit antes da execução PIX — não são instantâneos. Acompanhe por `payout.updated.v1` e `GET /v1/payout-requests/{id}`.\n</Note>',
  },
  listPayoutRequests: {
    summary: 'Listar payouts',
    description: 'Saques da conta com estados e tarifas. Paginação por cursor.',
  },
  getPayoutRequest: {
    summary: 'Obter payout',
    description:
      'Estado atual do saque: reserva, aprovação, execução PIX (com comprovante quando executado) e conciliação.',
  },

  // ───────────────────────────── Antecipações ─────────────────────────────
  listAdvanceReceivables: {
    summary: 'Listar recebíveis',
    description:
      'Recebíveis futuros da sua conta com valores e datas de liberação previstas — o universo elegível para antecipação.',
  },
  getAdvanceEligibility: {
    summary: 'Verificar elegibilidade',
    description:
      'Informa se sua conta e os recebíveis atendem aos critérios de risco para antecipar (recebíveis já usados como garantia, disputas abertas e histórico afetam a análise).',
  },
  createAdvanceQuote: {
    summary: 'Cotar antecipação',
    description:
      'Gera a cotação: valor bruto, taxa de desconto e valor líquido a receber. A cotação tem validade própria — usar depois de expirar retorna `409 ADVANCE_QUOTE_EXPIRED`.',
    content: '<Tip>\nA taxa depende do tempo restante até a liberação: antecipar mais perto da data custa menos. Compare cotações em datas diferentes antes de decidir.\n</Tip>',
  },
  createAdvanceRequest: {
    summary: 'Solicitar antecipação',
    description:
      'Vincula a cotação e cria a solicitação, que passa por revisão da Korbit antes da liberação do líquido ao saldo. O recebível fica reservado como garantia — não pode sustentar outra antecipação.',
  },
  listAdvanceRequests: {
    summary: 'Listar antecipações',
    description: 'Solicitações da conta com estado (em análise, aprovada, liberada, recusada, quitada).',
  },
  getAdvanceRequest: {
    summary: 'Obter antecipação',
    description: 'Detalhe da solicitação: recebíveis vinculados, cotação aplicada e estado atual.',
  },

  // ───────────────────────────── Refunds e Disputas ─────────────────────────────
  createMerchantRefund: {
    summary: 'Criar refund',
    description:
      'Solicita a devolução de parte ou do total de um pagamento. O valor é validado contra o saldo restante (refunds acumulados nunca excedem o total pago) e **reservado** antes da execução — se a execução falhar, a reserva é revertida integralmente.',
    body: {
      paymentIntentId: 'Payment intent de origem do refund.',
      amountMinor: 'Valor a devolver em centavos. Parcial cria refund parcial; o restante segue refundável.',
      reason: 'Motivo operacional do refund (ex.: `produto_nao_entregue`).',
    },
    content: '<Note>\nO caminho de aprovação (imediato, revisão ou política de risco) depende do pagamento, do valor e do histórico — a resposta indica o que aconteceu. Casos com prazo de resposta chegam como `refund.requested.v1`.\n</Note>',
  },
  listMerchantRefundCases: {
    summary: 'Listar casos de refund',
    description:
      'Casos de revisão abertos e encerrados, com prazo de resposta do merchant quando aplicável.',
  },
  getMerchantRefundCase: {
    summary: 'Obter caso de refund',
    description: 'Detalhe do caso: pagamento, valores, prazo de resposta e histórico de interações.',
  },
  approveCustomerRefundAsMerchant: {
    summary: 'Aprovar refund',
    description:
      'Concorda com o devolução solicitada pelo comprador. Respeite o prazo (`review_deadline_at`) — sem resposta, aplica-se a política padrão da Korbit.',
  },
  contestCustomerRefundAsMerchant: {
    summary: 'Contestar refund',
    description:
      'Contesta a devolução com sua argumentação e evidências. A contestação segue para revisão da Korbit com o comprador.',
  },
  addMerchantRefundResponse: {
    summary: 'Responder ao caso',
    description:
      'Envia informações/evidências adicionais solicitadas durante a análise do caso de refund.',
  },

  // ───────────────────────────── Chaves de API ─────────────────────────────
  createApiKey: {
    summary: 'Criar chave de API',
    description:
      'Cria uma chave com os escopos informados. O token completo (`kbt_…`) é retornado **uma única vez** — guarde-o em gerenciador de segredos. Aplique o menor privilégio: crie chaves por integração com escopos mínimos.',
    body: {
      name: 'Nome descritivo da chave (ex.: `erp-producao`, `conciliacao-job`).',
      scopes: 'Escopos concedidos — a chave nunca pode fazer mais que o declarado aqui.',
      expiresAt: 'Expiração opcional (ISO 8601). Recomendado para chaves de uso temporário.',
    },
  },
  listApiKeys: {
    summary: 'Listar chaves de API',
    description: 'Chaves da conta com escopos, estado e último uso. O segredo nunca é retornado.',
  },
  rotateApiKey: {
    summary: 'Rotacionar chave de API',
    description:
      'Cria o token substituto e revoga o anterior após a carência configurada (`gracePeriodSeconds`) — rotação sem downtime. O novo token é exibido uma única vez.',
    content: '<Warning>\nRotação substitui o token: atualize seus serviços dentro da janela de carência, senão as chamadas começam a receber `401`.\n</Warning>',
  },
  revokeApiKey: {
    summary: 'Revogar chave de API',
    description: 'Revoga imediatamente — toda chamada seguinte retorna `401`. Use em suspeita de vazamento.',
  },

  // ───────────────────────────── Webhook Subscriptions ─────────────────────────────
  createMerchantWebhookSubscription: {
    summary: 'Criar assinatura de webhook',
    description:
      'Registra seu endpoint HTTPS para receber os [tipos de evento](/webhooks/catalogo-de-eventos) escolhidos. O segredo de assinatura (`whsec_…`) é exibido uma única vez no painel — é com ele que você verifica cada entrega.',
    body: {
      url: 'Endpoint HTTPS público (endereços privados são recusados).',
      eventTypes: 'Tipos de evento que serão entregues — assine só o que sua integração consome.',
    },
    content: '<Note>\nUma assinatura por URL. Depois de criar, valide a [verificação de assinatura](/webhooks/assinatura) no sandbox antes de operar em produção.\n</Note>',
  },
  listMerchantWebhookSubscriptions: {
    summary: 'Listar assinaturas de webhook',
    description:
      'Assinaturas da conta com URL, tipos de evento e estado. Alerta recomendado para estado `ERROR` (entregas esgotadas).',
  },
  disableMerchantWebhookSubscription: {
    summary: 'Desabilitar assinatura de webhook',
    description: 'Interrompe a entrega imediatamente e preserva a assinatura para reativação no painel.',
  },

  // ───────────────────────────── Atividade ─────────────────────────────
  listActivity: {
    summary: 'Listar atividade da conta',
    description:
      'Feed unificado e cronológico (vendas, payouts, assinaturas, refunds, antecipações, disputas) — base leve para notificações internas e auditoria de integração.',
  },

  // ───────────────────────────── Sandbox ─────────────────────────────
  simulateSandboxPaymentIntent: {
    summary: 'Simular resultado de pagamento',
    description:
      'Força o desfecho de um payment intent de teste: aprovar, recusar ou expirar. Disponível apenas com chaves `kbt_test_` — no sandbox não existe "pagar de verdade".',
    body: {
      outcome: 'Desfecho desejado: `SUCCEEDED`, `FAILED` ou `EXPIRED`. Estados inválidos retornam o mesmo erro da produção.',
    },
  },
  simulateSandboxCase: {
    summary: 'Simular caso de refund',
    description:
      'Cria um caso de refund/disputa sobre um payment intent de teste para exercitar [aprovação, contestação e prazos](/refunds-disputas/refunds).',
  },
  simulateSandboxWebhookTransport: {
    summary: 'Simular entrega de webhook',
    description:
      'Envia ao seu endpoint a mesma mensagem **assinada** que a produção enviaria — perfeito para validar a [verificação de assinatura](/webhooks/assinatura) com dados reais de entrega.',
  },
  simulateTestCommerceSubscription: {
    summary: 'Simular ciclo de assinatura',
    description:
      'Avança o ciclo de uma assinatura de teste (gera fatura e cobrança simulada) para testar recorrência sem esperar o calendário.',
  },
};
