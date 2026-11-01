import type {CSSProperties} from "react";

/** Passes CSS custom properties through a style prop: style={cssVars({ "--i": 2 })} */
export const cssVars = (vars: Record<string, string | number>): CSSProperties => vars as CSSProperties;
