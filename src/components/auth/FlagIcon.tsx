interface Props {
  code: string; // code ISO 2 lettres, ex: "SN"
  size?: number;
}

/** Drapeau en image (flagcdn.com) — les emoji drapeaux (🇸🇳) ne s'affichent
 *  pas de façon fiable sur toutes les plateformes (notamment Windows, où
 *  ils apparaissent souvent vides ou en 2 lettres faute de police emoji
 *  couleur complète). Une image PNG est garantie identique partout. */
export function FlagIcon({ code, size = 20 }: Props) {
  const w = size;
  const h = Math.round(size * 0.75);
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w80/${code.toLowerCase()}.png 2x`}
      alt=""
      width={w}
      height={h}
      style={{ display: 'inline-block', borderRadius: 2, objectFit: 'cover', flexShrink: 0 }}
      loading="lazy"
    />
  );
}
