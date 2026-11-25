import React, { useState } from 'react';
import { Check, Code2, Copy, Download, ExternalLink, Eye, EyeOff, Globe } from 'lucide-react';
import type { DukeWebSource } from '../types';

interface DukeRichMessageProps {
  content: string;
  sources?: DukeWebSource[];
}

interface Segment {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

function parseSegments(raw: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: raw.slice(lastIndex, match.index) });
    }
    segments.push({
      type: 'code',
      language: (match[1] || 'codigo').trim().toLowerCase(),
      content: match[2].replace(/\n$/, ''),
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < raw.length) {
    segments.push({ type: 'text', content: raw.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: 'text', content: raw }];
}

function renderInlineMarkdown(line: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > last) {
      parts.push(line.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`${keyPrefix}_b_${idx}`} className="font-bold text-amber-100">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={`${keyPrefix}_c_${idx}`}
          className="px-1.5 py-0.5 rounded bg-black/55 border border-amber-400/25 font-mono text-[12px] text-amber-200"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    last = tokenRegex.lastIndex;
    idx += 1;
  }

  if (last < line.length) {
    parts.push(line.slice(last));
  }
  return parts;
}

const CodeBlockCard: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const isHtmlPreviewable =
    language === 'html' ||
    language === 'htm' ||
    language === 'svg' ||
    code.trim().startsWith('<!DOCTYPE html') ||
    code.trim().startsWith('<html') ||
    code.trim().startsWith('<svg');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  const handleDownloadCode = () => {
    const ext =
      language === 'html' || language === 'htm'
        ? 'html'
        : language === 'css'
          ? 'css'
          : language === 'javascript' || language === 'js'
            ? 'js'
            : language === 'typescript' || language === 'ts'
              ? 'ts'
              : language === 'tsx'
                ? 'tsx'
                : language === 'python' || language === 'py'
                  ? 'py'
                  : language === 'svg'
                    ? 'svg'
                    : 'txt';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `robo-duque-codigo.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-amber-400/35 bg-[#030a07] shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#071811] border-b border-amber-400/20">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-amber-300">
          <Code2 className="w-3.5 h-3.5" />
          {language || 'código'}
        </span>
        <div className="flex items-center gap-1.5">
          {isHtmlPreviewable && (
            <button
              type="button"
              onClick={() => setShowPreview((p) => !p)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-700/80 hover:bg-emerald-600 text-[11px] font-semibold text-white cursor-pointer transition-colors"
            >
              {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{showPreview ? 'Ocultar Prévia' : 'Visualizar Ao Vivo'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleDownloadCode}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/50 hover:bg-black/80 border border-amber-400/30 text-[11px] font-semibold text-emerald-100 cursor-pointer transition-colors"
          >
            <Download className="w-3 h-3 text-amber-300" />
            <span>Baixar</span>
          </button>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/15 hover:bg-amber-400/30 border border-amber-400/40 text-[11px] font-semibold text-amber-200 cursor-pointer transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
        </div>
      </div>

      {showPreview && isHtmlPreviewable && (
        <div className="border-b border-amber-400/25 bg-white">
          <iframe
            title="Prévia Ao Vivo do Código"
            sandbox="allow-scripts"
            srcDoc={code}
            className="w-full h-72 border-0 block"
          />
        </div>
      )}

      <pre className="p-3 overflow-x-auto text-xs font-mono leading-relaxed text-emerald-100 conae-scroll max-h-80">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export const DukeRichMessage: React.FC<DukeRichMessageProps> = ({ content, sources }) => {
  const segments = parseSegments(content);

  return (
    <div className="space-y-1.5 break-words">
      {segments.map((seg, sIdx) => {
        if (seg.type === 'code') {
          return <CodeBlockCard key={`seg_${sIdx}`} language={seg.language || 'código'} code={seg.content} />;
        }

        const lines = seg.content.split('\n');
        return (
          <div key={`seg_${sIdx}`} className="space-y-1">
            {lines.map((rawLine, lIdx) => {
              const trimmed = rawLine.trim();
              if (!trimmed) {
                return <div key={`ln_${sIdx}_${lIdx}`} className="h-1.5" />;
              }
              if (trimmed.startsWith('### ')) {
                return (
                  <h4 key={`ln_${sIdx}_${lIdx}`} className="text-sm font-bold text-amber-200 pt-1">
                    {renderInlineMarkdown(trimmed.slice(4), `h3_${sIdx}_${lIdx}`)}
                  </h4>
                );
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <h3 key={`ln_${sIdx}_${lIdx}`} className="text-base font-bold text-amber-200 pt-1">
                    {renderInlineMarkdown(trimmed.slice(3), `h2_${sIdx}_${lIdx}`)}
                  </h3>
                );
              }
              if (/^[-*•]\s+/.test(trimmed)) {
                return (
                  <div key={`ln_${sIdx}_${lIdx}`} className="flex items-start gap-2 pl-1">
                    <span className="text-amber-400 font-bold leading-relaxed">•</span>
                    <p className="flex-1 leading-relaxed">
                      {renderInlineMarkdown(trimmed.replace(/^[-*•]\s+/, ''), `li_${sIdx}_${lIdx}`)}
                    </p>
                  </div>
                );
              }
              return (
                <p key={`ln_${sIdx}_${lIdx}`} className="leading-relaxed">
                  {renderInlineMarkdown(rawLine, `p_${sIdx}_${lIdx}`)}
                </p>
              );
            })}
          </div>
        );
      })}

      {sources && sources.length > 0 && (
        <div className="pt-2 mt-2 border-t border-amber-400/20 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
            <Globe className="w-3 h-3" />
            <span>Fontes encontradas na Web</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sources.map((src, idx) => (
              <a
                key={`${src.uri}_${idx}`}
                href={src.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-black/50 hover:bg-amber-400/15 border border-amber-400/30 text-[11px] text-emerald-100 hover:text-amber-200 max-w-full"
              >
                <span className="truncate max-w-[180px]">{src.title}</span>
                <ExternalLink className="w-2.5 h-2.5 shrink-0 text-amber-300" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
