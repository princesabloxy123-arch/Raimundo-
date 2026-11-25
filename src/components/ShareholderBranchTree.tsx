import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronUp,
  Crown,
  GitBranch,
  Landmark,
  Percent,
  Scale,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { CONAE_ASSETS, EXECUTIVES_TEAM } from '../data/conaeSeed';
import { useLanguage } from '../i18n/LanguageContext';
import type { ShareholderTreeNode, TreasuryProbabilityTier } from '../types';

interface ShareholderBranchTreeProps {
  nodes: ShareholderTreeNode[];
  isAdmin: boolean;
  onGoToHotels: () => void;
  onGoToCourses: () => void;
  onGoToBank: () => void;
  onGoToShareholders?: () => void;
  onGoToAdmin?: () => void;
}

type TreeFilterMode = 'all' | 'exec_helio' | 'exec_samuel' | 'exec_cleonice' | 'high_treasury';

const TIER_STYLES: Record<
  TreasuryProbabilityTier,
  { badge: string; bar: string; labelPt: string; labelEn: string }
> = {
  Maxima: {
    badge: 'bg-amber-500/20 text-amber-200 border border-amber-400/50',
    bar: 'from-amber-400 via-yellow-300 to-emerald-400',
    labelPt: 'Máxima',
    labelEn: 'Max',
  },
  Alta: {
    badge: 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/45',
    bar: 'from-emerald-400 to-teal-300',
    labelPt: 'Alta',
    labelEn: 'High',
  },
  Padrao: {
    badge: 'bg-white/10 text-emerald-100/80 border border-white/20',
    bar: 'from-emerald-600 to-emerald-400',
    labelPt: 'Padrão',
    labelEn: 'Std',
  },
};

export const ShareholderBranchTree: React.FC<ShareholderBranchTreeProps> = ({
  nodes,
  isAdmin,
  onGoToHotels,
  onGoToCourses,
  onGoToBank,
  onGoToShareholders,
  onGoToAdmin,
}) => {
  const { isEn, tr, translateDynamic } = useLanguage();
  const numLocale = isEn ? 'en-US' : 'pt-BR';
  const [filterMode, setFilterMode] = useState<TreeFilterMode>('all');
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);

  const activeNodes = useMemo(
    () =>
      nodes
        .filter((n) => n.active !== false)
        .sort(
          (a, b) =>
            b.treasuryProbabilityPercent - a.treasuryProbabilityPercent || b.sharePercent - a.sharePercent
        ),
    [nodes]
  );

  const masterExec = EXECUTIVES_TEAM[0];
  const cleoniceExec = EXECUTIVES_TEAM[1];
  const samuelExec = EXECUTIVES_TEAM[2];

  const parentLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    map.set('exec_helio', masterExec.name);
    map.set('exec_cleonice', cleoniceExec.name);
    map.set('exec_samuel', samuelExec.name);
    activeNodes.forEach((n) => map.set(n.id, n.fullName));
    return map;
  }, [activeNodes, masterExec.name, cleoniceExec.name, samuelExec.name]);

  const getRootBranchId = useMemo(() => {
    const byId = new Map(activeNodes.map((n) => [n.id, n]));
    return (node: ShareholderTreeNode): string => {
      let current: ShareholderTreeNode | undefined = node;
      let depth = 0;
      while (current && depth < 6) {
        if (
          current.parentNodeId === 'exec_helio' ||
          current.parentNodeId === 'exec_samuel' ||
          current.parentNodeId === 'exec_cleonice'
        ) {
          return current.parentNodeId;
        }
        current = byId.get(current.parentNodeId);
        depth += 1;
      }
      return 'exec_helio';
    };
  }, [activeNodes]);

  const filteredNodes = useMemo(() => {
    if (filterMode === 'all') return activeNodes;
    if (filterMode === 'high_treasury') {
      return activeNodes.filter(
        (n) =>
          n.treasuryTitlesEligible &&
          (n.treasuryProbabilityPercent >= 75 || n.treasuryProbabilityTier === 'Maxima')
      );
    }
    return activeNodes.filter(
      (n) => n.parentNodeId === filterMode || getRootBranchId(n) === filterMode
    );
  }, [activeNodes, filterMode, getRootBranchId]);

  const totalBranchPercent = useMemo(
    () => activeNodes.reduce((acc, n) => acc + (Number(n.sharePercent) || 0), 0),
    [activeNodes]
  );

  const topTreasuryNodes = useMemo(
    () =>
      activeNodes
        .filter((n) => n.treasuryTitlesEligible)
        .sort((a, b) => b.treasuryProbabilityPercent - a.treasuryProbabilityPercent)
        .slice(0, 2),
    [activeNodes]
  );

  const directMasterNodes = useMemo(
    () => filteredNodes.filter((n) => n.parentNodeId === 'exec_helio'),
    [filteredNodes]
  );
  const cleoniceNodes = useMemo(
    () =>
      filteredNodes.filter(
        (n) =>
          n.parentNodeId === 'exec_cleonice' ||
          (getRootBranchId(n) === 'exec_cleonice' && n.parentNodeId !== 'exec_cleonice')
      ),
    [filteredNodes, getRootBranchId]
  );
  const samuelNodes = useMemo(
    () =>
      filteredNodes.filter(
        (n) =>
          n.parentNodeId === 'exec_samuel' ||
          (getRootBranchId(n) === 'exec_samuel' && n.parentNodeId !== 'exec_samuel')
      ),
    [filteredNodes, getRootBranchId]
  );
  const subBranchFromMasterNodes = useMemo(
    () =>
      filteredNodes.filter(
        (n) =>
          n.parentNodeId !== 'exec_helio' &&
          n.parentNodeId !== 'exec_cleonice' &&
          n.parentNodeId !== 'exec_samuel' &&
          getRootBranchId(n) === 'exec_helio'
      ),
    [filteredNodes, getRootBranchId]
  );

  const renderTreeLeaf = (node: ShareholderTreeNode, isSubBranch = false) => {
    const tierStyle = TIER_STYLES[node.treasuryProbabilityTier] || TIER_STYLES.Padrao;
    const parentName = parentLabelMap.get(node.parentNodeId) || masterExec.name;
    const probClamped = Math.min(100, Math.max(0, Number(node.treasuryProbabilityPercent) || 0));
    const isExpanded = expandedNodeId === node.id;

    return (
      <div key={node.id} className={`relative ${isSubBranch ? 'ml-3 pl-2.5 border-l border-emerald-400/60' : ''}`}>
        {/* Horizontal branch twig linking spine to leaf */}
        <span
          aria-hidden="true"
          className={`absolute top-4 h-0.5 ${
            isSubBranch ? '-left-2.5 w-2.5 bg-emerald-400/70' : '-left-3 w-3 bg-amber-400/70'
          }`}
        />
        <span
          aria-hidden="true"
          className={`absolute top-[13px] w-1.5 h-1.5 rounded-full ${
            isSubBranch ? '-left-[3px] bg-emerald-300' : '-left-[3px] bg-amber-300'
          }`}
        />

        <article
          className={`rounded-lg p-2 space-y-1.5 transition-colors ${
            isSubBranch
              ? 'bg-emerald-950/75 border border-emerald-400/35'
              : 'conae-panel-soft border border-amber-400/30'
          }`}
        >
          {/* Compact Leaf Top Row */}
          <div className="flex items-center gap-2">
            <div className="relative shrink-0">
              <img
                src={node.photoUrl || CONAE_ASSETS.emblemHeart}
                alt={node.fullName}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover border border-amber-400/85 bg-black/50"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h4 className="text-[11px] font-bold text-white truncate">{node.fullName}</h4>
                <span className="font-mono tabular-nums text-[10px] font-extrabold text-amber-300 shrink-0">
                  {node.sharePercent.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 text-[9px] text-emerald-200/75">
                <span className="truncate">
                  {node.state} · {tr('De:', 'Of:')} {parentName.split(' ').slice(0, 2).join(' ')}
                </span>
                <span className={`px-1 py-0.2 rounded font-mono font-bold shrink-0 ${tierStyle.badge}`}>
                  {probClamped}% {isEn ? tierStyle.labelEn : tierStyle.labelPt}
                </span>
              </div>
            </div>
          </div>

          {/* Micro Utility Row + Expand Powers Toggle */}
          <div className="flex items-center justify-between gap-1 text-[9px]">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onGoToHotels}
                title={tr('Hotéis com Desconto VIP', 'VIP Discount Hotels')}
                className={`px-1 py-0.5 rounded border inline-flex items-center gap-0.5 cursor-pointer ${
                  node.hotelDiscountAccess
                    ? 'bg-emerald-900/50 border-emerald-400/35 text-emerald-100'
                    : 'bg-black/30 border-white/10 text-white/35'
                }`}
              >
                <Building2 className="w-2.5 h-2.5 text-amber-300" />
                {tr('Hotéis', 'Hotels')}
              </button>
              <button
                type="button"
                onClick={onGoToCourses}
                title={tr('Acesso aos Cursos CONAE', 'CONAE Courses Access')}
                className={`px-1 py-0.5 rounded border inline-flex items-center gap-0.5 cursor-pointer ${
                  node.coursesAccess
                    ? 'bg-emerald-900/50 border-emerald-400/35 text-emerald-100'
                    : 'bg-black/30 border-white/10 text-white/35'
                }`}
              >
                <BookOpen className="w-2.5 h-2.5 text-amber-300" />
                {tr('Cursos', 'Courses')}
              </button>
              <button
                type="button"
                onClick={onGoToBank}
                title={tr('Títulos do Tesouro CONAE', 'CONAE Treasury Titles')}
                className={`px-1 py-0.5 rounded border inline-flex items-center gap-0.5 cursor-pointer ${
                  node.treasuryTitlesEligible
                    ? 'bg-amber-500/15 border-amber-400/45 text-amber-200'
                    : 'bg-black/30 border-white/10 text-white/35'
                }`}
              >
                <Landmark className="w-2.5 h-2.5 text-amber-300" />
                {tr('Tesouro', 'Treasury')}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setExpandedNodeId(isExpanded ? null : node.id)}
              className="inline-flex items-center gap-0.5 text-amber-300 hover:text-amber-200 font-semibold cursor-pointer shrink-0"
            >
              <Scale className="w-2.5 h-2.5" />
              <span>{tr('Poderes', 'Powers')}</span>
              {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            </button>
          </div>

          {isExpanded && (
            <div className="rounded bg-black/50 border border-amber-400/25 p-1.5 text-[10px] text-emerald-100/85 space-y-1">
              <p className="font-semibold text-amber-300">{translateDynamic(node.branchTitle)}</p>
              <p className="leading-snug">{node.executionPowers}</p>
              <p className="font-mono text-[9px] text-emerald-200/75">
                {node.sharesCount.toLocaleString(numLocale)} {tr('ações', 'shares')}
                {node.notaryCode ? ` · ${node.notaryCode}` : ''}
              </p>
            </div>
          )}

          {/* Slim Treasury Odds Line */}
          <div className="h-1 w-full rounded-full bg-black/70 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${tierStyle.bar}`}
              style={{ width: `${probClamped}%` }}
            />
          </div>
        </article>
      </div>
    );
  };

  return (
    <section className="conae-panel rounded-xl p-3 sm:p-3.5 space-y-2.5">
      {/* Compact Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-400/20 pb-2">
        <div className="space-y-0.5 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="inline-flex items-center gap-1 font-bold uppercase tracking-wider text-amber-300">
              <GitBranch className="w-3 h-3" />
              {tr('Árvore Ramificada de Acionistas', 'Branching Shareholder Tree')}
            </span>
            <span className="font-mono text-emerald-200/85 bg-black/45 border border-amber-400/25 rounded px-1.5 py-0.5">
              {activeNodes.length} {tr('nós', 'nodes')} · {totalBranchPercent.toFixed(1)}%
            </span>
            {topTreasuryNodes.length > 0 && (
              <span className="text-amber-200/90 inline-flex items-center gap-1">
                <Award className="w-3 h-3 text-amber-400" />
                {topTreasuryNodes.map((n) => `${n.fullName.split(' ')[0]} ${n.treasuryProbabilityPercent}%`).join(' · ')}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {isAdmin && onGoToAdmin && (
            <button
              type="button"
              onClick={onGoToAdmin}
              className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-3 h-3" />
              {tr('Fotos & Ramos', 'Photos & Nodes')}
            </button>
          )}
          {onGoToShareholders && (
            <button
              type="button"
              onClick={onGoToShareholders}
              className="px-2 py-1 rounded conae-panel-soft hover:bg-emerald-900/50 text-amber-200 border border-amber-400/35 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Percent className="w-2.5 h-2.5" />
              {tr('Lotes 100k', '100k Lots')}
            </button>
          )}
        </div>
      </div>

      {/* Micro Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px]">
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              { id: 'all', labelPt: 'Árvore Completa', labelEn: 'Full Tree' },
              { id: 'exec_helio', labelPt: 'Master Hélio', labelEn: 'Master Hélio' },
              { id: 'exec_samuel', labelPt: 'Samuel', labelEn: 'Samuel' },
              { id: 'exec_cleonice', labelPt: 'Cleonice', labelEn: 'Cleonice' },
              { id: 'high_treasury', labelPt: 'Tesouro ≥75%', labelEn: 'Treasury ≥75%' },
            ] as { id: TreeFilterMode; labelPt: string; labelEn: string }[]
          ).map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setFilterMode(btn.id)}
              className={`px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                filterMode === btn.id
                  ? 'bg-amber-500 text-neutral-950'
                  : 'conae-panel-soft text-emerald-100/80 hover:text-white'
              }`}
            >
              {isEn ? btn.labelEn : btn.labelPt}
            </button>
          ))}
        </div>
        <span className="font-mono text-[9px] text-amber-200/75">
          {tr('Barra rolante ↕ · Clique "Poderes"', 'Scrollable ↕ · Click "Powers"')}
        </span>
      </div>

      {/* COMPACT SCROLLABLE VISUAL TREE STRUCTURE */}
      <div className="max-h-[300px] overflow-y-auto conae-scroll rounded-lg bg-black/35 border border-amber-400/20 p-2.5">
        {/* LEVEL 0: MASTER HÉLIO ROOT + TRUNK & CROSSBAR */}
        <div className="flex flex-col items-center">
          <div className="rounded-lg bg-gradient-to-r from-emerald-950/90 via-black/80 to-amber-950/50 border border-amber-400/80 px-3 py-1.5 flex items-center gap-2.5 shadow">
            <div className="relative shrink-0">
              <img
                src={masterExec.photo}
                alt={masterExec.name}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover border border-amber-400"
              />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center">
                <Crown className="w-2.5 h-2.5" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[8px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5" />
                {tr('MASTER RAIZ · OUTORGA PODERES', 'MASTER ROOT · AUTHORITY')}
              </p>
              <p className="text-xs font-extrabold text-white truncate">{masterExec.name}</p>
            </div>
          </div>

          {/* Vertical Trunk + Horizontal Crossbar Branch Connector */}
          <div className="w-0.5 h-3 bg-amber-400/80" aria-hidden="true" />
          <div className="hidden lg:flex items-center justify-between w-[72%] h-0.5 bg-amber-400/70 relative" aria-hidden="true">
            <span className="w-2 h-2 rounded-full bg-amber-400 -ml-1" />
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="w-2 h-2 rounded-full bg-amber-400 -mr-1" />
          </div>
        </div>

        {/* LEVEL 1 & LEVEL 2: THREE BRANCH COLUMNS WITH TREE STEMS & TWIGS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start pt-0 lg:pt-0">
          {/* BRANCH 1: CLEONICE */}
          <div className="flex flex-col">
            <div className="hidden lg:flex justify-center">
              <div className="w-0.5 h-3 bg-amber-400/70" aria-hidden="true" />
            </div>
            <div className="rounded-lg bg-black/60 border border-amber-400/45 px-2.5 py-1.5 flex items-center gap-2">
              <img
                src={cleoniceExec.photo}
                alt={cleoniceExec.name}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover border border-amber-400/80 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-[8px] font-bold uppercase text-amber-300">{tr('Ramo 01 · Executiva', 'Branch 01 · Exec.')}</p>
                <p className="text-[11px] font-bold text-white truncate">{cleoniceExec.name}</p>
              </div>
            </div>

            {cleoniceNodes.length > 0 && (
              <div className="ml-4 pl-3 pt-2 border-l-2 border-amber-400/55 space-y-2">
                {cleoniceNodes.map((n) => renderTreeLeaf(n, n.parentNodeId !== 'exec_cleonice'))}
              </div>
            )}
          </div>

          {/* BRANCH 2: DIRECT MASTER HÉLIO */}
          <div className="flex flex-col">
            <div className="hidden lg:flex justify-center">
              <div className="w-0.5 h-3 bg-amber-400/80" aria-hidden="true" />
            </div>
            <div className="rounded-lg bg-gradient-to-r from-amber-500/15 to-emerald-900/35 border border-amber-400/55 px-2.5 py-1.5 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] font-bold uppercase text-amber-300">{tr('Tronco Direto Master', 'Direct Master Trunk')}</p>
                <p className="text-[11px] font-bold text-white truncate">{tr('Acionistas Diretos', 'Direct Shareholders')}</p>
              </div>
            </div>

            {[...directMasterNodes, ...subBranchFromMasterNodes].length > 0 && (
              <div className="ml-4 pl-3 pt-2 border-l-2 border-amber-400/65 space-y-2">
                {directMasterNodes.map((n) => renderTreeLeaf(n, false))}
                {subBranchFromMasterNodes.map((n) => renderTreeLeaf(n, true))}
              </div>
            )}
          </div>

          {/* BRANCH 3: EXECUTIVO SAMUEL */}
          <div className="flex flex-col">
            <div className="hidden lg:flex justify-center">
              <div className="w-0.5 h-3 bg-amber-400/70" aria-hidden="true" />
            </div>
            <div className="rounded-lg bg-black/60 border border-amber-400/45 px-2.5 py-1.5 flex items-center gap-2">
              <img
                src={samuelExec.photo}
                alt={samuelExec.name}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover border border-amber-400/80 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-[8px] font-bold uppercase text-amber-300">{tr('Ramo 02 · Executivo', 'Branch 02 · Exec.')}</p>
                <p className="text-[11px] font-bold text-white truncate">{samuelExec.name}</p>
              </div>
            </div>

            {samuelNodes.length > 0 && (
              <div className="ml-4 pl-3 pt-2 border-l-2 border-amber-400/55 space-y-2">
                {samuelNodes.map((n) => renderTreeLeaf(n, n.parentNodeId !== 'exec_samuel'))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
