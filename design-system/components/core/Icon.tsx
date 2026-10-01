import type { CSSProperties, SVGProps } from 'react';
import { ICONS, type IconName } from './iconData';

/** Lucide outline glyph from the bundled set (assets/icons). */
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'stroke' | 'color'> {
  /** Lucide icon name, e.g. "layout-grid", "hard-hat", "bell" */
  name: IconName;
  /** px, default 20 */
  size?: number;
  /** stroke width, default 1.5 */
  stroke?: number;
  color?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 20, stroke = 1.5, color = 'currentColor', style, ...rest }: IconProps) {
  const body = ICONS[name] ?? '';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'block', ...style }}
      aria-hidden="true" dangerouslySetInnerHTML={{ __html: body }} {...rest} />
  );
}

export const ICON_NAMES = Object.keys(ICONS) as IconName[];
