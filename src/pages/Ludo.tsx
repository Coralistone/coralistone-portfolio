import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import DemoIntro from '../components/DemoIntro'
import { LiveRegion } from '../components/a11y'
import { useLang, useT, type L } from '../i18n'

/* ------------------------------------------------------------------ Règles & plateau
 * Plateau 15×15. Parcours commun de 52 cases (sens horaire), puis 5 cases de couloir coloré, puis l'arrivée.
 * Progression d'un pion : -1 = maison, 0..50 = parcours, 51..55 = couloir, 56 = arrivé.
 */
type ColorKey = 'blue' | 'red' | 'green' | 'yellow'
type Player = { color: ColorKey; name: string; ai: boolean }
type Phase = 'setup' | 'rules' | 'play' | 'over'

const ORDER: ColorKey[] = ['blue', 'red', 'green', 'yellow'] // sens horaire, départ en haut à gauche
const COLOR: Record<ColorKey, { label: L; main: string; soft: string; start: number }> = {
  blue: { label: { fr: 'Bleu', en: 'Blue' }, main: '#2f6fde', soft: '#cfe0ff', start: 0 },
  red: { label: { fr: 'Rouge', en: 'Red' }, main: '#e5383b', soft: '#ffd6d6', start: 13 },
  green: { label: { fr: 'Vert', en: 'Green' }, main: '#2a9d55', soft: '#cdeed8', start: 26 },
  yellow: { label: { fr: 'Jaune', en: 'Yellow' }, main: '#e9b200', soft: '#fff1c2', start: 39 },
}

const TRACK: [number, number][] = [
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
const LANE: Record<ColorKey, [number, number][]> = {
  blue: [1, 2, 3, 4, 5].map((c) => [7, c]),
  red: [1, 2, 3, 4, 5].map((r) => [r, 7]),
  green: [13, 12, 11, 10, 9].map((c) => [7, c]),
  yellow: [13, 12, 11, 10, 9].map((r) => [r, 7]),
}
const BASE_ORIGIN: Record<ColorKey, [number, number]> = { blue: [0, 0], red: [0, 9], green: [9, 9], yellow: [9, 0] }
const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]) // cases de départ + étoiles
const FINISH = 56

const absIndex = (c: ColorKey, p: number) => (COLOR[c].start + p) % 52
function cellOf(c: ColorKey, p: number, i: number): [number, number] {
  if (p < 0) { const [r0, c0] = BASE_ORIGIN[c]; return [r0 + 1.5 + Math.floor(i / 2) * 2, c0 + 1.5 + (i % 2) * 2] }
  if (p <= 50) return TRACK[absIndex(c, p)]
  if (p < FINISH) return LANE[c][p - 51]
  const center: Record<ColorKey, [number, number]> = { blue: [7, 6.3], red: [6.3, 7], green: [7, 7.7], yellow: [7.7, 7] }
  return center[c]
}

const roll = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return (a[0] % 6) + 1 }
const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

type Pieces = Record<ColorKey, number[]>
const freshPieces = (): Pieces => ({ blue: [-1, -1, -1, -1], red: [-1, -1, -1, -1], green: [-1, -1, -1, -1], yellow: [-1, -1, -1, -1] })

export default function Ludo() {
  const t = useT()
  const { lang } = useLang()

  // ----- configuration
  const [phase, setPhase] = useState<Phase>('setup')
  const [count, setCount] = useState(4)
  const [vsComputer, setVsComputer] = useState(true)
  const [names, setNames] = useState<Record<ColorKey, string>>({ blue: '', red: '', green: '', yellow: '' })
  const seats = (n: number): ColorKey[] => (n === 2 ? ['blue', 'green'] : ORDER.slice(0, n))

  // ----- partie
  const [players, setPlayers] = useState<Player[]>([])
  const [pieces, setPieces] = useState<Pieces>(freshPieces)
  const [turn, setTurn] = useState(0)
  const [dice, setDice] = useState<number | null>(null)
  const [rolling, setRolling] = useState(false)
  const [face, setFace] = useState(6)
  const [winner, setWinner] = useState<Player | null>(null)
  const [msg, setMsg] = useState('')
  const [log, setLog] = useState<string[]>([])
  const diceBtn = useRef<HTMLButtonElement>(null)

  const cur = players[turn]
  const say = (s: string) => { setMsg(s); setLog((l) => [s, ...l].slice(0, 6)) }
  const label = (c: ColorKey) => COLOR[c].label[lang]

  const movable = useMemo(() => {
    if (!cur || dice === null) return [] as number[]
    return pieces[cur.color].map((p, i) => ((p < 0 && dice === 6) || (p >= 0 && p + dice <= FINISH) ? i : -1)).filter((i) => i >= 0)
  }, [cur, dice, pieces])

  const start = (e: FormEvent) => {
    e.preventDefault()
    const list = seats(count).map((c, i) => ({ color: c, name: names[c].trim() || label(c), ai: vsComputer && i > 0 }))
    setPlayers(list); setPhase('rules')
  }
  const begin = () => {
    setPieces(freshPieces()); setTurn(0); setDice(null); setWinner(null); setLog([])
    setPhase('play'); say(t(`La partie commence. À ${players[0].name} de lancer le dé.`, `The game starts. ${players[0].name}, roll the dice.`))
    requestAnimationFrame(() => diceBtn.current?.focus())
  }

  const nextTurn = (again: boolean) => {
    setDice(null)
    if (again) return
    setTurn((x) => (x + 1) % players.length)
  }

  const throwDice = () => {
    if (rolling || dice !== null || winner || !cur) return
    setRolling(true)
    let n = 0
    const id = setInterval(() => {
      setFace(roll()); n++
      if (n >= 8) {
        clearInterval(id)
        const v = roll(); setFace(v); setDice(v); setRolling(false)
        const canMove = pieces[cur.color].some((p) => (p < 0 && v === 6) || (p >= 0 && p + v <= FINISH))
        if (!canMove) {
          say(t(`${cur.name} fait ${v}. Aucun pion ne peut bouger${v !== 6 ? ' : il faut un 6 pour sortir' : ''}.`, `${cur.name} rolls ${v}. No piece can move${v !== 6 ? ': a 6 is needed to leave home' : ''}.`))
          setTimeout(() => nextTurn(false), 1100)
        } else say(t(`${cur.name} fait ${v}. Choisissez un pion.`, `${cur.name} rolls ${v}. Choose a piece.`))
      }
    }, 70)
  }

  const move = (i: number) => {
    if (!cur || dice === null || !movable.includes(i)) return
    const c = cur.color
    const next: Pieces = { blue: [...pieces.blue], red: [...pieces.red], green: [...pieces.green], yellow: [...pieces.yellow] }
    const from = next[c][i]
    const to = from < 0 ? 0 : from + dice
    next[c][i] = to
    let text = from < 0 ? t(`${cur.name} sort un pion (START).`, `${cur.name} brings a piece out (START).`) : t(`${cur.name} avance de ${dice}.`, `${cur.name} moves ${dice}.`)
    let captured = false
    if (to <= 50) {
      const a = absIndex(c, to)
      if (!SAFE.has(a)) {
        for (const p of players) {
          if (p.color === c) continue
          next[p.color] = next[p.color].map((q) => {
            if (q >= 0 && q <= 50 && absIndex(p.color, q) === a) { captured = true; text += t(` Il capture un pion de ${p.name} !`, ` Captures a piece of ${p.name}!`); return -1 }
            return q
          })
        }
      }
    }
    if (to === FINISH) text += t(' Un pion arrive à la maison !', ' A piece reaches home!')
    setPieces(next)
    if (next[c].every((q) => q === FINISH)) { setWinner(cur); setPhase('over'); say(t(`${cur.name} a gagné la partie !`, `${cur.name} wins the game!`)); return }
    const again = dice === 6 || captured
    if (again) text += t(' Il rejoue.', ' Plays again.')
    say(text)
    nextTurn(again)
  }

  // ----- ordinateur : lance le dé puis choisit le meilleur coup
  useEffect(() => {
    if (phase !== 'play' || !cur?.ai || winner) return
    if (dice === null && !rolling) { const id = setTimeout(throwDice, 800); return () => clearTimeout(id) }
    if (dice !== null && movable.length) {
      const id = setTimeout(() => {
        const c = cur.color
        const score = (i: number) => {
          const p = pieces[c][i], to = p < 0 ? 0 : p + dice
          if (to === FINISH) return 100
          if (to <= 50) {
            const a = absIndex(c, to)
            const hit = !SAFE.has(a) && players.some((o) => o.color !== c && pieces[o.color].some((q) => q >= 0 && q <= 50 && absIndex(o.color, q) === a))
            if (hit) return 90
          }
          if (p < 0) return 70
          if (to > 50) return 60
          return 10 + to / 10 + (SAFE.has(absIndex(c, to)) ? 5 : 0)
        }
        move([...movable].sort((a, b) => score(b) - score(a))[0])
      }, 700)
      return () => clearTimeout(id)
    }
  })

  // ===================================================================== rendu
  const intro = (
    <DemoIntro
      kicker={t('Projet perso recréé · Jeu', 'Personal project, rebuilt · Game')}
      title="Ludo"
      lead={t('Le jeu de plateau à 4 couleurs, jouable de 2 à 4, entre amis ou contre l’ordinateur. On lance le dé d’un clic ou d’un toucher.', 'The 4-colour board game, for 2 to 4 players, with friends or against the computer. Roll the dice with a click or a tap.')}
      problem={t(<>Recréer un jeu de hasard complet : configuration des joueurs, lancer de dé animé, sortie sur un 6, captures, cases protégées, couloir d'arrivée au compte exact, tours supplémentaires et adversaires automatiques.</>, <>Rebuilding a full game of chance: player setup, animated dice, leaving home on a 6, captures, safe squares, exact count into the home lane, extra turns and computer opponents.</>)}
      tryIt={t([<>Choisissez 2, 3 ou 4 joueurs et nommez chaque couleur.</>, <>Lisez les règles, puis cliquez sur « Continuer ».</>, <>Cliquez sur le dé pour le lancer, puis sur un pion surligné.</>], [<>Pick 2, 3 or 4 players and name each colour.</>, <>Read the rules, then click “Continue”.</>, <>Click the dice to roll, then a highlighted piece.</>])}
      under={t([<>Plateau 15 × 15 calculé : parcours de 52 cases, couloirs et maisons définis par des coordonnées.</>, <>Hasard cryptographique (crypto.getRandomValues) pour le dé.</>, <>IA par score : finir, capturer, sortir, puis avancer en sécurité.</>], [<>Computed 15 × 15 board: 52-square track, lanes and bases defined by coordinates.</>, <>Cryptographic randomness (crypto.getRandomValues) for the dice.</>, <>Score-based AI: finish, capture, leave home, then advance safely.</>])}
      stack={['React', 'TypeScript', t('Logique de jeu', 'Game logic')]}
    />
  )

  if (phase === 'setup') {
    return (
      <>
        {intro}
        <div className="wrap ludo-panel">
          <form className="card ludo-setup" onSubmit={start}>
            <h2 className="demo-h">{t('Nouvelle partie', 'New game')}</h2>
            <fieldset>
              <legend>{t('Nombre de joueurs', 'Number of players')}</legend>
              <div className="seg">
                {[2, 3, 4].map((n) => (
                  <label key={n}><input type="radio" name="count" value={n} checked={count === n} onChange={() => setCount(n)} /> <span>{n}</span></label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>{t('Mode de jeu', 'Game mode')}</legend>
              <div className="seg wide">
                <label><input type="radio" name="mode" checked={vsComputer} onChange={() => setVsComputer(true)} /> <span>{t('Contre l’ordinateur', 'Against the computer')}</span></label>
                <label><input type="radio" name="mode" checked={!vsComputer} onChange={() => setVsComputer(false)} /> <span>{t('Entre amis (même appareil)', 'With friends (same device)')}</span></label>
              </div>
            </fieldset>
            <fieldset>
              <legend>{t('Nom de chaque couleur', 'Name each colour')}</legend>
              <div className="name-grid">
                {seats(count).map((c, i) => (
                  <div className="ax-field" key={c} style={{ margin: 0 }}>
                    <label htmlFor={`n-${c}`}><span className="dot" style={{ background: COLOR[c].main }} aria-hidden="true" /> {label(c)}{vsComputer && i > 0 ? t(' (ordinateur)', ' (computer)') : ''}</label>
                    <input id={`n-${c}`} value={names[c]} onChange={(e) => setNames({ ...names, [c]: e.target.value })} placeholder={vsComputer && i > 0 ? t(`Ordi ${label(c)}`, `CPU ${label(c)}`) : label(c)} maxLength={16} autoComplete="off" />
                  </div>
                ))}
              </div>
            </fieldset>
            <button type="submit" className="ax-btn">{t('Valider', 'Confirm')}</button>
          </form>
        </div>
        <div style={{ height: 56 }} />
      </>
    )
  }

  if (phase === 'rules') {
    return (
      <>
        {intro}
        <div className="wrap ludo-panel">
          <section className="card ludo-rules" aria-labelledby="r-title">
            <h2 id="r-title" className="demo-h">{t('Règles du jeu', 'Game rules')}</h2>
            <p className="players-line">{players.map((p) => <span key={p.color}><span className="dot" style={{ background: COLOR[p.color].main }} aria-hidden="true" /> {p.name}{p.ai ? ' 🤖' : ''}</span>)}</p>
            <ul>
              <li>{t(<><strong>Jeu de hasard</strong> : chacun à son tour lance le dé en cliquant dessus.</>, <><strong>Game of chance</strong>: players take turns rolling the dice by clicking it.</>)}</li>
              <li>{t(<>Il faut un <strong>6 pour sortir</strong> un pion de sa maison vers la case <strong>START</strong>.</>, <>You need a <strong>6 to bring a piece out</strong> of home onto the <strong>START</strong> square.</>)}</li>
              <li>{t(<>Les pions font le tour du plateau dans le sens des aiguilles d’une montre, puis entrent dans le <strong>couloir de leur couleur</strong>.</>, <>Pieces go round the board clockwise, then enter the <strong>lane of their colour</strong>.</>)}</li>
              <li>{t(<>Tomber sur un pion adverse le <strong>renvoie à sa maison</strong>, sauf sur les cases ★ et START, qui sont protégées.</>, <>Landing on an opponent’s piece <strong>sends it back home</strong>, except on ★ and START squares, which are safe.</>)}</li>
              <li>{t(<>Un <strong>6</strong> ou une <strong>capture</strong> donne un tour supplémentaire.</>, <>A <strong>6</strong> or a <strong>capture</strong> gives an extra turn.</>)}</li>
              <li>{t(<>Pour arriver au centre, il faut le <strong>nombre exact</strong>.</>, <>To reach the centre, you need the <strong>exact number</strong>.</>)}</li>
            </ul>
            <p className="win-line">🏆 {t('Gagne le premier joueur qui ramène ses 4 pions au centre.', 'The first player to bring all 4 pieces to the centre wins.')}</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" className="ax-btn" onClick={begin}>{t('Continuer', 'Continue')}</button>
              <button type="button" className="ax-btn secondary" onClick={() => setPhase('setup')}>{t('Modifier les joueurs', 'Edit players')}</button>
            </div>
          </section>
        </div>
        <div style={{ height: 56 }} />
      </>
    )
  }

  // ----- plateau
  const cells: JSX.Element[] = []
  for (let r = 0; r < 15; r++) for (let c = 0; c < 15; c++) {
    let cls = 'lc', style: Record<string, string> = {}, mark = ''
    const base = (Object.keys(BASE_ORIGIN) as ColorKey[]).find((k) => r >= BASE_ORIGIN[k][0] && r < BASE_ORIGIN[k][0] + 6 && c >= BASE_ORIGIN[k][1] && c < BASE_ORIGIN[k][1] + 6)
    const ti = TRACK.findIndex(([a, b]) => a === r && b === c)
    const lane = (Object.keys(LANE) as ColorKey[]).find((k) => LANE[k].some(([a, b]) => a === r && b === c))
    if (base) { cls += ' base'; style = { background: COLOR[base].main } }
    else if (r >= 6 && r <= 8 && c >= 6 && c <= 8) cls += ' center'
    else if (lane) style = { background: COLOR[lane].main }
    else if (ti >= 0) {
      const owner = (Object.keys(COLOR) as ColorKey[]).find((k) => COLOR[k].start === ti)
      if (owner) { style = { background: COLOR[owner].main }; mark = 'START'; cls += ' start' }
      else if (SAFE.has(ti)) mark = '★'
    } else cls += ' void'
    cells.push(<div key={`${r}-${c}`} className={cls} style={style} aria-hidden="true">{mark}</div>)
  }

  return (
    <>
      {intro}
      <LiveRegion message={msg} />
      <div className="wrap ludo-layout">
        <div className="ludo-board-wrap">
          <div className="ludo-board" role="group" aria-label={t('Plateau de Ludo', 'Ludo board')}>
            <div className="ludo-grid">{cells}</div>
            {(Object.keys(BASE_ORIGIN) as ColorKey[]).map((k) => (
              <div key={k} className="base-yard" aria-hidden="true" style={{ top: `${((BASE_ORIGIN[k][0] + 1) / 15) * 100}%`, left: `${((BASE_ORIGIN[k][1] + 1) / 15) * 100}%` }}>
                {players.find((p) => p.color === k)?.name}
              </div>
            ))}
            <div className="ludo-center" aria-hidden="true"
              style={{ background: `conic-gradient(from -45deg, ${COLOR.red.main} 0 90deg, ${COLOR.green.main} 90deg 180deg, ${COLOR.yellow.main} 180deg 270deg, ${COLOR.blue.main} 270deg 360deg)` }}>
              <span>HOME</span>
            </div>
            {players.flatMap((p) => pieces[p.color].map((pos, i) => {
              const [r, c] = cellOf(p.color, pos, i)
              const stack = pos >= 0 && pos < FINISH ? pieces[p.color].slice(0, i).filter((q) => q === pos).length : 0
              const can = p === cur && movable.includes(i) && !cur.ai
              const where = pos < 0 ? t('à la maison', 'at home') : pos === FINISH ? t('arrivé', 'home') : pos > 50 ? t(`dans le couloir, case ${pos - 50}`, `in the lane, square ${pos - 50}`) : t(`case ${pos + 1} sur 51`, `square ${pos + 1} of 51`)
              return (
                <button key={`${p.color}${i}`} type="button" className={`pawn${can ? ' can' : ''}`} disabled={!can} onClick={() => move(i)}
                  style={{ top: `${((r + 0.5) / 15) * 100}%`, left: `${((c + 0.5) / 15) * 100}%`, background: COLOR[p.color].main, transform: `translate(calc(-50% + ${stack * 4}px), calc(-50% - ${stack * 4}px))` }}
                  aria-label={t(`Pion ${i + 1} de ${p.name}, ${where}${can ? ', jouable' : ''}`, `${p.name} piece ${i + 1}, ${where}${can ? ', playable' : ''}`)} />
              )
            }))}
          </div>
        </div>

        <aside className="ludo-side">
          <div className="card turn-card" style={{ borderColor: cur ? COLOR[cur.color].main : undefined }}>
            {winner ? (
              <>
                <p className="kicker">{t('Partie terminée', 'Game over')}</p>
                <h2 className="demo-h">🏆 {t(`${winner.name} gagne !`, `${winner.name} wins!`)}</h2>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" className="ax-btn" onClick={begin}>{t('Rejouer', 'Play again')}</button>
                  <button type="button" className="ax-btn secondary" onClick={() => setPhase('setup')}>{t('Changer les joueurs', 'Change players')}</button>
                </div>
              </>
            ) : cur && (
              <>
                <p className="kicker">{t('À qui de jouer', 'Whose turn')}</p>
                <h2 className="demo-h"><span className="dot big" style={{ background: COLOR[cur.color].main }} aria-hidden="true" /> {cur.name}{cur.ai ? ' 🤖' : ''}</h2>
                <button ref={diceBtn} type="button" className={`dice${rolling ? ' rolling' : ''}`} onClick={throwDice}
                  disabled={cur.ai || rolling || dice !== null}
                  aria-label={dice !== null ? t(`Dé : ${dice}`, `Dice: ${dice}`) : t('Lancer le dé', 'Roll the dice')}>
                  <span aria-hidden="true">{FACES[face - 1]}</span>
                </button>
                <p className="demo-note" style={{ margin: 0 }}>
                  {cur.ai ? t('L’ordinateur joue…', 'The computer is playing…') : dice === null ? t('Touchez le dé pour le lancer.', 'Tap the dice to roll.') : movable.length ? t('Choisissez un pion surligné.', 'Choose a highlighted piece.') : t('Aucun coup possible.', 'No move possible.')}
                </p>
              </>
            )}
          </div>
          <div className="card">
            <p className="kicker">{t('Pions arrivés', 'Pieces home')}</p>
            <ul className="score-list">
              {players.map((p) => <li key={p.color}><span className="dot" style={{ background: COLOR[p.color].main }} aria-hidden="true" /> {p.name} : <strong>{pieces[p.color].filter((q) => q === FINISH).length} / 4</strong></li>)}
            </ul>
          </div>
          <div className="card">
            <p className="kicker">{t('Derniers coups', 'Last moves')}</p>
            <ol className="move-log">{log.map((l, i) => <li key={i}>{l}</li>)}</ol>
            <button type="button" className="ax-btn secondary" onClick={() => setPhase('setup')}>{t('Nouvelle partie', 'New game')}</button>
          </div>
        </aside>
      </div>
      <div style={{ height: 56 }} />
    </>
  )
}
