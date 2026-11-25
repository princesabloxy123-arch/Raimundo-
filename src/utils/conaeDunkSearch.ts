import { EXECUTIVES_TEAM, RADIO_SCHEDULE } from '../data/conaeSeed';
import { GOL_PROMO_FLIGHTS } from '../data/golFlightsData';
import { LATAM_PROMO_FLIGHTS } from '../data/latamFlightsData';
import type {
  BenefitPartner,
  BusinessPortalRecord,
  CourseItem,
  EcclesiasticalPortalRecord,
  PartnerHotel,
  PublicAffiliate,
  ShareholderTreeNode,
  SponsorItem,
  TabId,
} from '../types';
import type { StateTreasuryStat, TreasuryBuyerHighlight } from './treasuryStateStats';

export interface ConaeDunkAnswer {
  title: string;
  answerText: string;
  highlights: string[];
  targetTab: TabId;
  ctaLabel: string;
}

export interface ConaeDunkKnowledgeContext {
  shareholderTree: ShareholderTreeNode[];
  buyerHighlights: TreasuryBuyerHighlight[];
  publicAffiliates: PublicAffiliate[];
  hotels: PartnerHotel[];
  courses: CourseItem[];
  benefitPartners: BenefitPartner[];
  sponsors: SponsorItem[];
  businessRecords: BusinessPortalRecord[];
  ecclesiasticalRecords: EcclesiasticalPortalRecord[];
  stateStats: StateTreasuryStat[];
  shareUnitPriceBRL: number;
  latestDailyQuotePercent: number;
  valuationBoostPercent: number;
  totalEquityBRL: number;
  totalSharesForSale: number;
  isEn: boolean;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function searchConaeDunkAppKnowledge(
  rawQuery: string,
  ctx: ConaeDunkKnowledgeContext
): ConaeDunkAnswer {
  const q = normalizeText(rawQuery);
  const locale = ctx.isEn ? 'en-US' : 'pt-BR';
  const fmtMoney = (n: number) =>
    `R$ ${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (!q) {
    return {
      title: 'CONAE DUNK',
      answerText: ctx.isEn
        ? 'Ask me anything about SNEC quotes, shareholders, partner hotels, courses, GOL/TAM flights, the 10% Plan, or Business & Ministerial management.'
        : 'Pode perguntar qualquer coisa sobre a cotação SNEC/CNEC, acionistas, hotéis conveniados, cursos, voos GOL/TAM, Plano 10%, Gestão Empresarial ou Gestão Eclesiástica.',
      highlights: [
        `Cotação SNEC: ${fmtMoney(ctx.shareUnitPriceBRL)}`,
        `${ctx.hotels.length} Hotéis Conveniados`,
        `${ctx.courses.length} Cursos CONAE`,
      ],
      targetTab: 'inicio',
      ctaLabel: ctx.isEn ? 'Go to Home' : 'Ver Início',
    };
  }

  // 1. Direct match on a specific Brazilian state (e.g. "estado go", "sao paulo", "sp", "goias", "amapa")
  const matchedState = ctx.stateStats.find((st) => {
    const stName = normalizeText(st.name);
    const stUf = st.uf.toLowerCase();
    return (
      q.includes(stName) ||
      new RegExp(`\\b${stUf}\\b`).test(q)
    );
  });
  if (
    matchedState &&
    (q.includes('estado') || q.includes('uf') || q.includes('acao') || q.includes('acoes') || q.includes('porcent') || q.includes('cota') || q.length <= 16)
  ) {
    const stateHotels = ctx.hotels.filter((h) => h.state.toUpperCase() === matchedState.uf);
    return {
      title: `${matchedState.name} (${matchedState.uf})`,
      answerText: `No estado ${matchedState.name} (${matchedState.uf}), as ações SNEC/CNEC operam com ${matchedState.percent.toFixed(2).replace('.', ',')}% de participação estadual, ${matchedState.salesCount} movimentação(ões) e volume de ${fmtMoney(matchedState.volumeBRL)}. ${
        stateHotels.length > 0
          ? `Temos ${stateHotels.length} hotel(is) conveniado(s) neste estado, como ${stateHotels[0].name} (${stateHotels[0].discountPercent}% OFF).`
          : 'Você pode consultar o painel completo no Banco de Ações.'
      }`,
      highlights: [
        `${matchedState.uf}: ${matchedState.percent.toFixed(2).replace('.', ',')}%`,
        `Volume: ${fmtMoney(matchedState.volumeBRL)}`,
        stateHotels[0] ? `${stateHotels[0].name} (-${stateHotels[0].discountPercent}%)` : 'Operação em tempo real',
      ],
      targetTab: 'banco',
      ctaLabel: 'Abrir Banco de Ações',
    };
  }

  // 2. Direct match on a specific Executive, Shareholder, Buyer, or Affiliate by name
  const matchedExec = EXECUTIVES_TEAM.find((e) => {
    const tokens = normalizeText(e.name).split(' ').filter((t) => t.length > 3);
    return tokens.some((tok) => q.includes(tok));
  });
  if (matchedExec) {
    const isPres = matchedExec.id === 'exec_helio';
    return {
      title: matchedExec.name,
      answerText: `${matchedExec.name} atua como ${matchedExec.role} (${matchedExec.highlight}), com autoridade de ${
        isPres ? 'Presidente Mundial (35% SNEC)' : 'Exclusivo Diretor'
      } na Convenção CONAE.${
        matchedExec.id === 'exec_samuel'
          ? ' Chave PIX oficial de aportes: CPF 330.048.558-44.'
          : ''
      }`,
      highlights: [
        matchedExec.role,
        isPres ? 'Autoridade: Presidente' : 'Autoridade: Exclusivo Diretor',
        matchedExec.highlight,
      ],
      targetTab: 'acionistas',
      ctaLabel: 'Ver Árvore Presidencial',
    };
  }

  const matchedTreeNode = ctx.shareholderTree.find((n) => {
    const tokens = normalizeText(n.fullName).split(' ').filter((t) => t.length > 3);
    return tokens.some((tok) => q.includes(tok));
  });
  if (matchedTreeNode) {
    return {
      title: matchedTreeNode.fullName,
      answerText: `${matchedTreeNode.fullName} (${matchedTreeNode.state}) é ${matchedTreeNode.branchTitle}, detendo ${matchedTreeNode.sharePercent}% (${matchedTreeNode.sharesCount.toLocaleString(locale)} ações SNEC/CNEC). Poderes: ${matchedTreeNode.executionPowers}`,
      highlights: [
        `${matchedTreeNode.sharePercent}% · ${matchedTreeNode.sharesCount.toLocaleString(locale)} SNEC`,
        `Estado: ${matchedTreeNode.state}`,
        matchedTreeNode.notaryCode || 'Árvore de Acionistas CONAE',
      ],
      targetTab: 'acionistas',
      ctaLabel: 'Abrir Acionistas 100k',
    };
  }

  // 3. Direct match on a specific Partner Hotel by name or city
  const matchedHotel = ctx.hotels.find(
    (h) =>
      q.includes(normalizeText(h.name)) ||
      (h.city.length > 3 && q.includes(normalizeText(h.city)) && (q.includes('hotel') || q.includes('resort') || q.includes('hosped') || q.includes('evento')))
  );
  if (matchedHotel) {
    return {
      title: `${matchedHotel.name} (${matchedHotel.discountPercent}% OFF)`,
      answerText: `O ${matchedHotel.name}, em ${matchedHotel.city}-${matchedHotel.state}, é parceiro conveniado CONAE (${matchedHotel.stars} estrelas) com ${matchedHotel.discountPercent}% de desconto. ${matchedHotel.description}`,
      highlights: [
        `${matchedHotel.city}-${matchedHotel.state}`,
        `${matchedHotel.discountPercent}% OFF Conveniado`,
        matchedHotel.category,
      ],
      targetTab: 'hoteis',
      ctaLabel: 'Reservar Hotel',
    };
  }

  // 4. PIX / Payment / Administrator / Password / Contact
  if (q.includes('pix') || q.includes('pagamento') || q.includes('pagar') || q.includes('deposito')) {
    return {
      title: 'PIX Oficial CONAE · Executivo Samuel',
      answerText:
        'Os pagamentos e aportes oficiais da Convenção CONAE são realizados exclusivamente via PIX para o Executivo Samuel (CPF: 330.048.558-44). Após informar seu e-mail para envio do Cartão de Hotelaria, seu pedido entra para confirmação executiva.',
      highlights: ['Chave PIX CPF: 330.048.558-44', 'Titular: Executivo Samuel', 'Confirmação no Banco de Ações'],
      targetTab: 'banco',
      ctaLabel: 'Abrir Banco & PIX',
    };
  }

  if (q.includes('raimundo') || q.includes('senha') || q.includes('bloqueio') || q.includes('zap') || q.includes('whatsapp') || q.includes('administrador') || q.includes('degustacao')) {
    return {
      title: 'Suporte & Liberação · Raimundo Netto',
      answerText:
        'O aplicativo oferece 40 minutos de degustação gratuita. Para liberar o acesso definitivo com senha ou tirar dúvidas administrativas, fale com o administrador Raimundo Netto pelo WhatsApp (96) 98115-3517.',
      highlights: ['Administrador: Raimundo Netto', 'WhatsApp: (96) 98115-3517', 'Degustação: 40 minutos'],
      targetTab: 'inicio',
      ctaLabel: 'Ir ao Início',
    };
  }

  // 5. Plano 10% / Gestão Empresarial / Árvore de Vendas / Cartão 3 meses
  if (
    q.includes('empresar') ||
    q.includes('plano 10') ||
    q.includes('10%') ||
    q.includes('10 porcento') ||
    q.includes('arvore de venda') ||
    q.includes('3 meses') ||
    q.includes('mensalidade')
  ) {
    return {
      title: 'Gestão Empresarial & Plano 10% CONAE',
      answerText: `Na Gestão Empresarial, o empresário investe no Plano 10% CONAE e garante 3 meses de mensalidade do Cartão de Desconto na rede de Farmácias e Hotelaria, mais 50% de acesso nos Cursos CONAE. Também permite cadastrar clientes, marcar eventos com desconto nos hotéis conveniados e montar a Árvore de Cadastro de Vendas (${ctx.businessRecords.length} registros salvos).`,
      highlights: [
        'Plano 10% CONAE · 3 meses Cartão Desconto',
        '50% de acesso nos Cursos CONAE',
        'Eventos em Hotéis + Árvore de Vendas',
      ],
      targetTab: 'gestao_empresarial',
      ctaLabel: 'Abrir Gestão Empresarial',
    };
  }

  // 6. Gestão Eclesiástica / Ministerial / Obreiros / Pastores / Igreja
  if (
    q.includes('eclesiastic') ||
    q.includes('ministeri') ||
    q.includes('obreiro') ||
    q.includes('pastor') ||
    q.includes('bispo') ||
    q.includes('igreja') ||
    q.includes('credenci')
  ) {
    return {
      title: 'Gestão Eclesiástica & Ministerial CONAE',
      answerText: `Na Gestão Eclesiástica você credencia obreiros, pastores e ministros para se aliarem à Convenção CONAE com emissão de código de credencial, promove eventos de ministério e libera acesso direto aos cursos CONAE, pacotes aéreos GOL/TAM com desconto e rede de hotelaria conveniada (${ctx.ecclesiasticalRecords.length} registros ministeriais ativos).`,
      highlights: [
        'Credenciamento de Obreiros & Afiliados',
        'Promoção de Eventos de Ministério',
        'Cursos + Voos GOL/TAM + Hotelaria',
      ],
      targetTab: 'gestao_eclesiastica',
      ctaLabel: 'Abrir Gestão Eclesiástica',
    };
  }

  // 7. Flights GOL & TAM/LATAM
  if (q.includes('voo') || q.includes('passag') || q.includes('aereo') || q.includes('aerea') || q.includes('aviao') || q.includes('gol') || q.includes('tam') || q.includes('latam')) {
    const isTam = q.includes('tam') || q.includes('latam');
    const bestGol = GOL_PROMO_FLIGHTS[0];
    const bestTam = LATAM_PROMO_FLIGHTS[0];
    return {
      title: isTam ? 'Pacotes Aéreos TAM / LATAM' : 'Pacotes Aéreos GOL & TAM com Desconto',
      answerText: `Temos ${GOL_PROMO_FLIGHTS.length} trechos promocionais GOL (a partir de ${fmtMoney(bestGol.promoPriceBRL)}, ${bestGol.originCity} → ${bestGol.destCity} com -${bestGol.discountPercent}%) e ${LATAM_PROMO_FLIGHTS.length} ofertas TAM/LATAM (a partir de ${fmtMoney(bestTam.promoPriceBRL)}, ${bestTam.originCity} → ${bestTam.destCity} com -${bestTam.discountPercent}%), já preenchidos para compra direta.`,
      highlights: [
        `GOL: ${bestGol.originCode}→${bestGol.destCode} ${fmtMoney(bestGol.promoPriceBRL)}`,
        `TAM: ${bestTam.originCode}→${bestTam.destCode} ${fmtMoney(bestTam.promoPriceBRL)}`,
        'Pacotes promocionais para conveniados',
      ],
      targetTab: isTam ? 'voos_tam' : 'voos_gol',
      ctaLabel: isTam ? 'Abrir Aba TAM' : 'Abrir Aba GOL',
    };
  }

  // 8. Hotels & Hospitality Partnerships
  if (q.includes('hotel') || q.includes('hosped') || q.includes('resort') || q.includes('clube') || q.includes('booking') || q.includes('evento')) {
    const topHotels = ctx.hotels.filter((h) => h.active !== false).slice(0, 3);
    const names = topHotels.map((h) => `${h.name} (${h.city}-${h.state}, ${h.discountPercent}% OFF)`).join('; ');
    return {
      title: `Parceria de Hotelaria CONAE (${ctx.hotels.length} Unidades)`,
      answerText: `Nossa rede de hotelaria conveniada possui ${ctx.hotels.length} hotéis e clubes com descontos de até 65% OFF e token Booking.com integrado. Destaques: ${names}.`,
      highlights: topHotels.map((h) => `${h.name} · -${h.discountPercent}%`),
      targetTab: 'hoteis',
      ctaLabel: 'Abrir Hotéis VIP',
    };
  }

  // 9. Courses (Capelania, Juiz de Paz, Teologia)
  if (q.includes('curso') || q.includes('capelania') || q.includes('teologia') || q.includes('juiz') || q.includes('ead') || q.includes('certificado') || q.includes('matricula')) {
    const activeCourses = ctx.courses.filter((c) => c.active !== false);
    const listText = activeCourses.slice(0, 3).map((c) => `${c.title} (${c.modality})`).join(', ');
    return {
      title: `CONAE Cursos (${activeCourses.length} Formações)`,
      answerText: `Oferecemos ${activeCourses.length} cursos oficiais no portal conaecursos.com.br, incluindo ${listText}. Empresários do Plano 10% têm 50% de acesso e obreiros credenciados contam com condições especiais.`,
      highlights: activeCourses.slice(0, 3).map((c) => `${c.title} · ${c.duration}`),
      targetTab: 'cursos',
      ctaLabel: 'Abrir CONAE Cursos',
    };
  }

  // 10. Pharmacies / Benefits / Discount Card
  if (q.includes('farmacia') || q.includes('beneficio') || q.includes('cartao') || q.includes('desconto') || q.includes('clinica') || q.includes('supermercado')) {
    const pharmacies = ctx.benefitPartners.filter((p) => p.category === 'Farmácia');
    return {
      title: `Cartão de Desconto & Rede de Benefícios (${ctx.benefitPartners.length} Parceiros)`,
      answerText: `A Rede de Benefícios CONAE reúne ${ctx.benefitPartners.length} parceiros ativos entre Farmácias (${pharmacies.length}), Supermercados, Clínicas/Laboratórios e Clubes. No Plano 10% Empresarial você garante 3 meses de mensalidade do Cartão de Desconto.`,
      highlights: ctx.benefitPartners.slice(0, 3).map((p) => `${p.name} (-${p.discountPercent}%)`),
      targetTab: 'beneficios',
      ctaLabel: 'Abrir Rede & Benefícios',
    };
  }

  // 11. SNEC / CNEC Quotes, Shares, Market, Equity, Shareholders, Presidential Tree
  if (
    q.includes('snec') ||
    q.includes('cnec') ||
    q.includes('acao') ||
    q.includes('acoes') ||
    q.includes('acionista') ||
    q.includes('cotacao') ||
    q.includes('mercado') ||
    q.includes('patrimonio') ||
    q.includes('moeda') ||
    q.includes('cripto') ||
    q.includes('banco') ||
    q.includes('presidente') ||
    q.includes('diretor') ||
    q.includes('arvore') ||
    q.includes('lote') ||
    q.includes('cartorio')
  ) {
    const quotePct = Math.max(0.45, ctx.latestDailyQuotePercent || ctx.valuationBoostPercent || 1.85);
    const activeStates = ctx.stateStats.filter((s) => s.percent > 0).length;
    return {
      title: `Cotação SNEC / CNEC · ${fmtMoney(ctx.shareUnitPriceBRL)}`,
      answerText: `A criptomoeda de ações SNEC/CNEC está cotada em ${fmtMoney(ctx.shareUnitPriceBRL)} (+${quotePct.toFixed(2).replace('.', ',')}%), com patrimônio total de ${fmtMoney(ctx.totalEquityBRL)}, ${ctx.totalSharesForSale.toLocaleString(locale)} ações em oferta e ${activeStates} estado(s) operando ativamente. A Árvore Presidencial é liderada pelo Presidente Mundial Apóstolo Hélio César e Diretores Exclusivos, com capital total de 100.000 ações registradas em cartório.`,
      highlights: [
        `SNEC: ${fmtMoney(ctx.shareUnitPriceBRL)} (+${quotePct.toFixed(2).replace('.', ',')}%)`,
        `Patrimônio: ${fmtMoney(ctx.totalEquityBRL)}`,
        `Árvore: ${ctx.shareholderTree.length + EXECUTIVES_TEAM.length} líderes/acionistas`,
      ],
      targetTab: q.includes('acionista') || q.includes('arvore') || q.includes('cartorio') ? 'acionistas' : 'banco',
      ctaLabel: q.includes('acionista') || q.includes('arvore') ? 'Ver Acionistas 100k' : 'Abrir Banco de Ações',
    };
  }

  // 12. Web Radio, Media, Videos, Sponsors, VIP Room
  if (q.includes('radio') || q.includes('video') || q.includes('midia') || q.includes('patrocinador')) {
    return {
      title: 'Web Rádio 24h, Vídeos & Patrocinadores',
      answerText: `Na aba Mídia & Web Rádio você acompanha programação 24h (${RADIO_SCHEDULE[0].program}, ${RADIO_SCHEDULE[1].program}), mensagens oficiais do Apóstolo Hélio César e ${ctx.sponsors.length} patrocinadores CONAE.`,
      highlights: [`${RADIO_SCHEDULE.length} programas diários`, `${ctx.sponsors.length} patrocinadores ativos`],
      targetTab: 'midia',
      ctaLabel: 'Abrir Mídia & Rádio',
    };
  }

  if (q.includes('vip') || q.includes('sala')) {
    return {
      title: 'Sala VIP & Indicativo dos Acionistas',
      answerText:
        'A Sala VIP oferece sinais estratégicos de ativos, indicativos exclusivos dos acionistas e acesso ao Cartão Dourado CONAE mediante senha mensal ou passe executivo.',
      highlights: ['Acesso com senha mensal ou executiva', 'Sinais estratégicos CNEC & Tesouro'],
      targetTab: 'vip',
      ctaLabel: 'Abrir Sala VIP',
    };
  }

  // 13. Fallback: comprehensive overview answering with live app figures
  return {
    title: 'CONAE DUNK · Busca Completa no App',
    answerText: `Encontrei estes dados atualizados no app CONAE para "${rawQuery.trim()}": Cotação SNEC em ${fmtMoney(ctx.shareUnitPriceBRL)}, Patrimônio de ${fmtMoney(ctx.totalEquityBRL)}, ${ctx.hotels.length} hotéis conveniados com até 65% OFF, ${ctx.courses.length} cursos (50% OFF no Plano 10%), pacotes aéreos GOL e TAM, Gestão Empresarial e Gestão Eclesiástica.`,
    highlights: [
      `SNEC: ${fmtMoney(ctx.shareUnitPriceBRL)}`,
      `${ctx.hotels.length} Hotéis · ${ctx.courses.length} Cursos`,
      `${ctx.publicAffiliates.length} Afiliados · ${ctx.benefitPartners.length} Parceiros`,
    ],
    targetTab: 'inicio',
    ctaLabel: 'Explorar App CONAE',
  };
}
