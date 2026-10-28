/**
 * Moteur du Ludo : fonctions pures (aucun effet de bord), partagées par le jeu local et le jeu en ligne.
 * Progression d'un pion : -1 = maison, 0..50 = parcours, 51..55 = couloir coloré, 56 = arrivé.
 */
import type { L } from '../i18n'

export type ColorKey = 'blue' | 'red' | 'green' | 'yellow'
export type Player = { color: ColorKey; name: string; ai: boolean }
export type Pieces = Record<ColorKey, number[]>
export type Game = {
  players: Player[]
  pieces: Pieces
  turn: number
  dice: number | null
  rollId: number
  winner: number | null
  log: L[]
}

export const ORDER: ColorKey[] = ['blue', 'red', 'green', 'yellow']
export const COLOR: Record<ColorKey, { label: L; main: string; start: number }> = {
  blue: { label: { fr: 'Bleu', en: 'Blue' }, main: '#2f6fde', start: 0 },
  red: { label: { fr: 'Rouge', en: 'Red' }, main: '#e5383b', start: 13 },
  green: { label: { fr: 'Vert', en: 'Green' }, main: '#2a9d55', start: 26 },
  yellow: { label: { fr: 'Jaune', en: 'Yellow' }, main: '#e9b200', start: 39 },
}
export const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47])
export const FINISH = 56

export const TRACK: [number, number][] = [
  ...[1, 2, 3, 4, 5].map((c) => [6, c] as [number, number]),
  ...[5, 4, 3, 2, 1, 0].map((r) => [r, 6] as [number, number]),
  [0, 7],
  ...[0, 1, 2, 3, 4, 5].map((r) => [r, 8] as [number, number]),
  ...[9, 10, 11, 12, 13, 14].map((c) => [6, c] as [number, number]),
  [7, 14],
  ...[14, 13, 12, 11, 10, 9].map((c) => [8, c] as [number, number]),
  ...[9, 10, 11, 12, 13, 14].map((r) => [r, 8] as [number, number]),
  [14, 7],
  ...[14, 13, 12, 11, 10, 9].map((r) => [r, 6] as [number, number]),
  ...[5, 4, 3, 2, 1, 0].map((c) => [8, c] as [number, number]),
  [7, 0],
  [6, 0],
]
export const LANE: Record<ColorKey, [number, number][]> = {
  blue: [1, 2, 3, 4, 5].map((c) => [7, c]),
  red: [1, 2, 3, 4, 5].map((r) => [r, 7]),
  green: [13, 12, 11, 10, 9].map((c) => [7, c]),
  yellow: [13, 12, 11, 10, 9].map((r) => [r, 7]),
}
export const BASE_ORIGIN: Record<ColorKey, [number, number]> = { blue: [0, 0], red: [0, 9], green: [9, 9], yellow: [9, 0] }
export const CENTER_SPOT: Record<ColorKey, [number, number]> = { blue: [7, 6.25], red: [6.25, 7], green: [7, 7.75], yellow: [7.75, 7] }

export const absIndex = (c: ColorKey, p: number) => (COLOR[c].start + p) % 52
export function cellOf(c: ColorKey, p: number, i: number): [number, number] {
  if (p < 0) { const [r0, c0] = BASE_ORIGIN[c]; return [r0 + 1.5 + Math.floor(i / 2) * 2, c0 + 1.5 + (i % 2) * 2] }
  if (p <= 50) return TRACK[absIndex(c, p)]
  if (p < FINISH) return LANE[c][p - 51]
  return CENTER_SPOT[c]
}

export const freshPieces = (): Pieces => ({ blue: [-1, -1, -1, -1], red: [-1, -1, -1, -1], green: [-1, -1, -1, -1], yellow: [-1, -1, -1, -1] })
export const newGame = (players: Player[]): Game => ({
  players, pieces: freshPieces(), turn: 0, dice: null, rollId: 0, winner: null,
  log: [{ fr: `La partie commence. À ${players[0].name} de lancer le dé.`, en: `The game starts. ${players[0].name}, roll the dice.` }],
})
export const rollValue = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return (a[0] % 6) + 1 }

const push = (g: Game, l: L) => [l, ...g.log].slice(0, 8)

export function movable(g: Game): number[] {
  const p = g.players[g.turn]
  if (!p || g.dice === null || g.winner !== null) return []
  const d = g.dice
  return g.pieces[p.color].map((q, i) => ((q < 0 && d === 6) || (q >= 0 && q + d <= FINISH) ? i : -1)).filter((i) => i >= 0)
}

export function applyRoll(g: Game, v: number): Game {
  if (g.dice !== null || g.winner !== null) return g
  const p = g.players[g.turn]
  const next = { ...g, dice: v, rollId: g.rollId + 1 }
  const can = movable(next).length > 0
  next.log = push(g, can
    ? { fr: `${p.name} fait ${v}.`, en: `${p.name} rolls ${v}.` }
    : { fr: `${p.name} fait ${v}. Aucun pion ne peut bouger${v !== 6 ? ' (il faut un 6 pour sortir)' : ''}.`, en: `${p.name} rolls ${v}. No piece can move${v !== 6 ? ' (a 6 is needed to leave home)' : ''}.` })
  return next
}

/** Passe au joueur suivant (aucun coup possible, ou temps écoulé). */
export function passTurn(g: Game, timeout = false): Game {
  const p = g.players[g.turn]
  const turn = (g.turn + 1) % g.players.length
  return {
    ...g, dice: null, turn,
    log: timeout ? push(g, { fr: `⏱ Temps écoulé pour ${p.name}. Au tour de ${g.players[turn].name}.`, en: `⏱ Time is up for ${p.name}. ${g.players[turn].name}'s turn.` }) : g.log,
  }
}

export function applyMove(g: Game, i: number): Game {
  if (!movable(g).includes(i)) return g
  const p = g.players[g.turn]
  const c = p.color
  const d = g.dice!
  const pieces: Pieces = { blue: [...g.pieces.blue], red: [...g.pieces.red], green: [...g.pieces.green], yellow: [...g.pieces.yellow] }
  const from = pieces[c][i]
  const to = from < 0 ? 0 : from + d
  pieces[c][i] = to
  let fr = from < 0 ? `${p.name} sort un pion sur START.` : `${p.name} avance de ${d}.`
  let en = from < 0 ? `${p.name} brings a piece out onto START.` : `${p.name} moves ${d}.`
  let captured = false
  if (to <= 50) {
    const a = absIndex(c, to)
    if (!SAFE.has(a)) {
      for (const o of g.players) {
        if (o.color === c) continue
        pieces[o.color] = pieces[o.color].map((q) => {
          if (q >= 0 && q <= 50 && absIndex(o.color, q) === a) { captured = true; fr += ` Il capture un pion de ${o.name} !`; en += ` Captures a piece of ${o.name}!`; return -1 }
          return q
        })
      }
    }
  }
  if (to === FINISH) { fr += ' Un pion arrive à la maison !'; en += ' A piece reaches home!' }
  if (pieces[c].every((q) => q === FINISH)) {
    return { ...g, pieces, dice: null, winner: g.turn, log: push(g, { fr: `🏆 ${p.name} a gagné la partie !`, en: `🏆 ${p.name} wins the game!` }) }
  }
  const again = d === 6 || captured
  if (again) { fr += ' Il rejoue.'; en += ' Plays again.' }
  return { ...g, pieces, dice: null, turn: again ? g.turn : (g.turn + 1) % g.players.length, log: push(g, { fr, en }) }
}

/** IA par score : finir, capturer, sortir, entrer dans le couloir, puis avancer en sécurité. */
export function bestMove(g: Game): number {
  const opts = movable(g)
  const c = g.players[g.turn].color
  const d = g.dice!
  const score = (i: number) => {
    const p = g.pieces[c][i], to = p < 0 ? 0 : p + d
    if (to === FINISH) return 100
    if (to <= 50) {
      const a = absIndex(c, to)
      if (!SAFE.has(a) && g.players.some((o) => o.color !== c && g.pieces[o.color].some((q) => q >= 0 && q <= 50 && absIndex(o.color, q) === a))) return 90
    }
    if (p < 0) return 70
    if (to > 50) return 60
    return 10 + to / 10 + (SAFE.has(absIndex(c, to)) ? 5 : 0)
  }
  return [...opts].sort((a, b) => score(b) - score(a))[0]
}
