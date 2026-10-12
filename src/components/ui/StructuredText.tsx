import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { renderTextWithLinks } from './RichText';

// Description libre (saisie par un organisateur) → rendu structuré :
//  • titre      : bloc d'une seule ligne en MAJUSCULES (« 🔥 COMPÉTITION A VS B 🔥 »)
//  • infos      : lignes « 📅 Date : À venir » → rangées icône / libellé / valeur
//  • liste      : lignes commençant par - • – *
//  • paragraphe : tout le reste, retours à la ligne conservés
// Les liens et *gras* restent gérés par renderTextWithLinks.

const EMOJI = '\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*';
const INFO_RE   = new RegExp(`^\s*(${EMOJI})\s*([^:\n]{1,32}?)\s*:\s*(.+)$`, 'u');
const BULLET_RE = /^\s*[-•–·]\s+(.+)$/;
const EMOJI_RE  = new RegExp(EMOJI, 'gu');
// « 📜 Règlement : » seul sur sa ligne, suivi du contenu → titre de section
const HEAD_COLON_RE = new RegExp(`^\s*(?:${EMOJI}\s*)?([^:\n]{2,40}?)\s*:\s*$`, 'u');

type Block =
  | { kind: 'title'; text: string }
  | { kind: 'infos'; rows: { icon: string; label: string; value: string }[] }
  | { kind: 'list'; items: string[] }
  | { kind: 'text'; text: string };

function isTitle(line: string): boolean {
  const letters = line.replace(EMOJI_RE, '').replace(/[^\p{L}]/gu, '');
  if (letters.length < 3 || line.length > 90 || line.includes(':')) return false;
  return letters === letters.toUpperCase();
}

function parse(src: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of src.replace(/\r\n/g, '\n').trim().split(/\n\s*\n/)) {
    const lines = chunk.split('\n').map(l => l.trimEnd()).filter(l => l.trim());
    if (!lines.length) continue;

    if (lines.length > 1 && HEAD_COLON_RE.test(lines[0])) {
      blocks.push({ kind: 'title', text: lines[0].replace(/\s*:\s*$/, '').trim() });
      lines.shift();
    }
    if (lines.length === 1 && isTitle(lines[0])) {
      blocks.push({ kind: 'title', text: lines[0].trim() });
      continue;
    }
    if (!lines.length) continue;
    if (lines.every(l => INFO_RE.test(l))) {
      blocks.push({ kind: 'infos', rows: lines.map(l => {
        const m = l.match(INFO_RE)!;
        return { icon: m[1], label: m[2].trim(), value: m[3].trim() };
      }) });
      continue;
    }
    if (lines.every(l => BULLET_RE.test(l))) {
      blocks.push({ kind: 'list', items: lines.map(l => l.match(BULLET_RE)![1].trim()) });
      continue;
    }
    // Bloc mixte : on isole les lignes « infos » consécutives du texte autour
    let buf: string[] = [];
    let rows: { icon: string; label: string; value: string }[] = [];
    const flushText = () => { if (buf.length) blocks.push({ kind: 'text', text: buf.join('\n') }); buf = []; };
    const flushRows = () => { if (rows.length) blocks.push({ kind: 'infos', rows }); rows = []; };
    for (const l of lines) {
      const m = l.match(INFO_RE);
      if (m) { flushText(); rows.push({ icon: m[1], label: m[2].trim(), value: m[3].trim() }); }
      else   { flushRows(); buf.push(l); }
    }
    flushRows(); flushText();
  }
  return blocks;
}

const LONG_INTRO_CHARS = 380;
const COLLAPSED_BY_DEFAULT = /r[èe]gle|conditions|termes|mentions|cgu|conditions g[ée]n/i;

interface Section { title?: string; blocks: Block[] }

function toSections(blocks: Block[]): { intro: Section; sections: Section[] } {
  const intro: Section = { blocks: [] };
  const sections: Section[] = [];
  let cur: Section = intro;
  blocks.forEach((b, i) => {
    if (b.kind === 'title' && i > 0) { cur = { title: b.text, blocks: [] }; sections.push(cur); }
    else cur.blocks.push(b);
  });
  return { intro, sections };
}

const LINK = 'underline font-semibold';

function renderBlock(b: Block, i: number) {
  switch (b.kind) {
    case 'title':
      return (
        <h3 key={i} className="text-base sm:text-lg font-black leading-snug tracking-tight"
          style={{ color: 'var(--text-primary)' }}>{b.text}</h3>
      );
    case 'infos':
      return (
        <ul key={i} className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
          {b.rows.map((r, j) => (
            <li key={j} className="flex items-center gap-3 px-3.5 py-2.5"
              style={j > 0 ? { borderTop: '1px solid var(--border)' } : undefined}>
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0"
                style={{ background: 'var(--surface)' }}>{r.icon}</span>
              <span className="text-xs font-semibold shrink-0 w-24 sm:w-32" style={{ color: 'var(--text-tertiary)' }}>{r.label}</span>
              <span className="text-sm font-semibold min-w-0 break-words" style={{ color: 'var(--text-primary)' }}>
                {renderTextWithLinks(r.value, LINK)}
              </span>
            </li>
          ))}
        </ul>
      );
    case 'list':
      return (
        <ul key={i} className="flex flex-col gap-1.5">
          {b.items.map((it, j) => (
            <li key={j} className="flex gap-2.5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <span className="mt-2 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--primary)' }} />
              <span className="min-w-0 break-words">{renderTextWithLinks(it, LINK)}</span>
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <p key={i} className="text-sm leading-relaxed whitespace-pre-line break-words"
          style={{ color: 'var(--text-secondary)' }}>{renderTextWithLinks(b.text, LINK)}</p>
      );
  }
}

function blockLength(b: Block): number {
  switch (b.kind) {
    case 'title': case 'text': return b.text.length;
    case 'list':  return b.items.join('').length;
    default:      return b.rows.length * 40;
  }
}

/** Introduction : repliée avec « Voir plus » quand elle est longue. */
function Intro({ blocks }: { blocks: Block[] }) {
  const [open, setOpen] = useState(false);
  if (!blocks.length) return null;
  const long = blocks.reduce((n, b) => n + blockLength(b), 0) > LONG_INTRO_CHARS;
  const collapsed = long && !open;

  return (
    <div>
      <div className="relative flex flex-col gap-4 overflow-hidden"
        style={collapsed ? { maxHeight: '11rem' } : undefined}>
        {blocks.map(renderBlock)}
        {collapsed && (
          <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
            style={{ background: 'linear-gradient(to top, var(--surface), transparent)' }} />
        )}
      </div>
      {long && (
        <button type="button" onClick={() => setOpen(o => !o)}
          className="mt-2 text-sm font-bold" style={{ color: 'var(--primary)' }}>
          {open ? 'Voir moins' : 'Voir plus'}
        </button>
      )}
    </div>
  );
}

/** Section à part (Règlement, Récompenses…) : carte dépliable. */
function SectionCard({ section }: { section: Section }) {
  const [open, setOpen] = useState(!COLLAPSED_BY_DEFAULT.test(section.title ?? ''));
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>{section.title}</span>
        <ChevronDown size={18} className="shrink-0 transition-transform duration-200"
          style={{ color: 'var(--text-tertiary)', transform: open ? 'rotate(180deg)' : undefined }} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 flex flex-col gap-3" style={{ borderTop: '1px solid var(--border)' }}>
          {section.blocks.map(renderBlock)}
        </div>
      )}
    </div>
  );
}

export function StructuredText({ text }: { text: string }) {
  const { intro, sections } = toSections(parse(text));
  return (
    <div className="flex flex-col gap-4">
      <Intro blocks={intro.blocks} />
      {sections.map((sec, i) => <SectionCard key={i} section={sec} />)}
    </div>
  );
}
