/**
 * The single source of truth for color in the app.
 *
 * No other file may declare a hex value. Color is used to carry meaning —
 * action, destructive, success, caution — never decoration.
 */
export const colors = {
    /** Screen background, one step down from surfaces so cards read as raised. */
    background: "#F7F8FA",
    /** Cards, inputs, sheets. */
    surface: "#FFFFFF",
    /** Pressed states and skeleton placeholders. */
    surfaceMuted: "#F1F3F5",

    /** Hairline dividers and resting input borders. */
    border: "#E3E6EA",
    /** Focused input border; also used for emphasis on a resting border. */
    borderStrong: "#CDD3DA",

    /** Headings and body copy. */
    textPrimary: "#1A1D21",
    /** Labels, captions, supporting copy. */
    textSecondary: "#5C6670",
    /** Placeholders and disabled text. */
    textTertiary: "#8A939C",
    /** Text placed on a filled primary/danger surface. */
    textInverse: "#FFFFFF",

    /** Primary action, links, active navigation. */
    primary: "#1F5EFF",
    primaryPressed: "#1A4FD6",
    /** Selected chips and subtle primary emphasis. */
    primarySoft: "#EBF1FF",

    /** Enrolled, completed, confirmed. */
    success: "#12805C",
    successSoft: "#E6F4EF",

    /** Destructive actions and error text. */
    danger: "#C2321F",
    dangerPressed: "#A32918",
    dangerSoft: "#FCEDEA",

    /** Lockouts, verification prompts, rate limits. */
    warning: "#8A6100",
    warningSoft: "#FDF3E0",

    /** Informational notices. */
    info: "#1F5EFF",
    infoSoft: "#EBF1FF",
} as const;

export type ColorToken = keyof typeof colors;
