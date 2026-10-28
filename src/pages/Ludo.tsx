import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { DataConnection, Peer as PeerT } from 'peerjs'
import DemoIntro from '../components/DemoIntro'
import { LiveRegion } from '../components/a11y'
import { useLang, useT } from '../i18n'
import {
  BASE_ORIGIN, COLOR, FINISH, LANE, ORDER, SAFE, TRACK,
  applyMove, applyRoll, bestMove, cellOf, movable as movableOf, newGame, passTurn, rollValue,
  type ColorKey, type Game, type Player,
} from './ludoLogic'

type Mode = 'cpu' | 'local' | 'online'
type Phase = 'setup' | 'rules' | 'lobby' | 'play'
type Msg =
  | { type: 'join'; name: string; color: ColorKey | null }
  | { type: 'welcome'; role: 'player' | 'spectator'; color: ColorKey | null }
  | { type: 'state'; g: Game | null; players: Player[]; started: boolean; msLeft: number; seats: ColorKey[]; host: string }
  | { type: 'roll' }
  | { type: 'move'; i: number }

const TURN_MS = 15_000
/** Options PeerJS (serveur de signalisation public par défaut ; surchargeable pour les tests). */
const peerOpts = () => (window as unknown as { __peerOptions?: object }).__peerOptions
const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']
const norm = (s: string) => s.trim().toLowerCase()
const params = new URLSearchParams(location.search)
const ROOM = params.get('room')
const INVITED = params.get('c') as ColorKey | null

export default function Ludo() {
  const t = useT()
  const { lang } = useLang()
  const label = (c: ColorKey) => COLOR[c].label[lang]
  const guest = !!ROOM

  // ----- configuration (hôte / local)
  const [phase, setPhase] = useState<Phase>('setup')
  const [mode, setMode] = useState<Mode>('cpu')
  const [count, setCount] = useState(4)
  const [names, setNames] = useState<Record<ColorKey, string>>({ blue: '', red: '', green: '', yellow: '' })
  const [setupError, setSetupError] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const seats = (n: number): ColorKey[] => (n === 2 ? ['blue', 'green'] : ORDER.slice(0, n))

  // ----- partie
  const [g, setG] = useState<Game | null>(null)
  const [rolling, setRolling] = useState(false)
  const [face, setFace] = useState(6)
  const [now, setNow] = useState(Date.now())
  const [deadline, setDeadline] = useState<number | null>(null)
  const diceBtn = useRef<HTMLButtonElement>(null)

  // ----- en ligne
  const [roomId, setRoomId] = useState('')
  const [netError, setNetError] = useState('')
  const [connected, setConnected] = useState<ColorKey[]>([])
  const [role, setRole] = useState<'host' | 'player' | 'spectator' | null>(guest ? null : 'host')
  const [myColor, setMyColor] = useState<ColorKey | null>(null)
  const [started, setStarted] = useState(false)
  const [hostName, setHostName] = useState('')
  const [joinName, setJoinName] = useState('')
  const [joining, setJoining] = useState(false)
  const peer = useRef<PeerT | null>(null)
  const conns = useRef<{ conn: DataConnection; color: ColorKey | null }[]>([])
  const hostConn = useRef<DataConnection | null>(null)
  const gRef = useRef(g); gRef.current = g
  const playersRef = useRef(players); playersRef.current = players
  const deadlineRef = useRef(deadline); deadlineRef.current = deadline
  const startedRef = useRef(started); startedRef.current = started

  const cur = g ? g.players[g.turn] : null
  const movable = useMemo(() => (g ? movableOf(g) : []), [g])
  const online = mode === 'online' || guest
  const authoritative = !guest // l'hôte (ou le jeu local) applique les règles

  /** Le joueur dont c'est le tour peut-il jouer sur CET appareil ? */
  const canAct = !!(g && cur && g.winner === null && !cur.ai && !rolling &&
    (online ? (guest ? role === 'player' && myColor === cur.color : cur.color === 'blue') : true))

  // ================================================================ animation du dé (sur chaque appareil)
  const lastRoll = useRef(0)
  useEffect(() => {
    if (!g || g.rollId === lastRoll.current) return
    lastRoll.current = g.rollId
    if (g.dice === null) return
    setRolling(true)
    let n = 0
    const id = setInterval(() => {
      n++; setFace(rollValue())
      if (n >= 8) { clearInterval(id); setFace(g.dice!); setRolling(false) }
    }, 70)
    return () => clearInterval(id)
  }, [g?.rollId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ================================================================ actions
  const doRoll = () => {
    if (!g || !canAct || g.dice !== null) return
    if (guest) hostConn.current?.send({ type: 'roll' } satisfies Msg)
    else setG(applyRoll(g, rollValue()))
  }
  const doMove = (i: number) => {
    if (!g || !canAct || !movable.includes(i)) return
    if (guest) hostConn.current?.send({ type: 'move', i } satisfies Msg)
    else setG(applyMove(g, i))
  }

  // ================================================================ automatismes (hôte / local)
  useEffect(() => {
    if (!authoritative || !g || g.winner !== null || phase !== 'play') return
    const p = g.players[g.turn]
    // Aucun coup possible : on passe au suivant
    if (g.dice !== null && !movableOf(g).length) { const id = setTimeout(() => setG((x) => x && passTurn(x)), 1400); return () => clearTimeout(id) }
    if (!p.ai) return
    if (g.dice === null) { const id = setTimeout(() => setG((x) => x && applyRoll(x, rollValue())), 900); return () => clearTimeout(id) }
    const id = setTimeout(() => setG((x) => x && x.dice !== null ? applyMove(x, bestMove(x)) : x), 1300)
    return () => clearTimeout(id)
  }, [g, authoritative, phase])

  // Minuteur de 15 s par action en ligne (géré par l'hôte)
  const timerKey = g ? `${g.turn}-${g.rollId}-${g.dice === null}` : ''
  useEffect(() => {
    if (!authoritative || mode !== 'online' || phase !== 'play' || !g || g.winner !== null) { setDeadline(null); return }
    setDeadline(Date.now() + TURN_MS)
  }, [timerKey, phase, mode]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!online) return
    const id = setInterval(() => {
      setNow(Date.now())
      const d = deadlineRef.current
      if (authoritative && d && Date.now() >= d) { setDeadline(null); setG((x) => (x && x.winner === null ? passTurn(x, true) : x)) }
    }, 250)
    return () => clearInterval(id)
  }, [online, authoritative])

  // ================================================================ réseau : hôte
  const broadcast = () => {
    const msLeft = deadlineRef.current ? Math.max(0, deadlineRef.current - Date.now()) : 0
    const seatsOk = conns.current.filter((c) => c.color).map((c) => c.color!) as ColorKey[]
    const msg: Msg = { type: 'state', g: gRef.current, players: playersRef.current, started: startedRef.current, msLeft, seats: seatsOk, host: playersRef.current[0]?.name ?? '' }
    conns.current.forEach(({ conn }) => conn.open && conn.send(msg))
  }
  useEffect(() => { if (!guest && mode === 'online' && peer.current) broadcast() }, [g, deadline, started, players]) // eslint-disable-line react-hooks/exhaustive-deps

  const openRoom = async () => {
    setNetError('')
    const { default: Peer } = await import('peerjs')
    const p = peerOpts() ? new Peer(peerOpts()!) : new Peer()
    peer.current = p
    p.on('open', (id) => setRoomId(id))
    p.on('error', () => setNetError(t("Impossible de créer la partie en ligne (réseau qui bloque les connexions directes ?).", 'Could not create the online game (a network blocking direct connections?).')))
    p.on('connection', (conn) => {
      conns.current.push({ conn, color: null })
      conn.on('data', (raw) => {
        const msg = raw as Msg
        const entry = conns.current.find((c) => c.conn === conn)!
        if (msg.type === 'join') {
          const seat = msg.color && playersRef.current.find((pl) => pl.color === msg.color)
          const ok = !!seat && seat.color !== 'blue' && norm(seat.name) === norm(msg.name)
          if (ok) { conns.current.forEach((c) => { if (c.color === seat!.color && c.conn !== conn) c.color = null }); entry.color = seat!.color }
          conn.send({ type: 'welcome', role: ok ? 'player' : 'spectator', color: ok ? seat!.color : null } satisfies Msg)
          setConnected(conns.current.filter((c) => c.color && c.conn.open).map((c) => c.color!))
          broadcast()
        }
        const game = gRef.current
        if (!game || !entry.color || game.players[game.turn]?.color !== entry.color) return
        if (msg.type === 'roll') setG((x) => (x ? applyRoll(x, rollValue()) : x))
        if (msg.type === 'move') setG((x) => (x ? applyMove(x, msg.i) : x))
      })
      conn.on('close', () => {
        conns.current = conns.current.filter((c) => c.conn !== conn)
        setConnected(conns.current.filter((c) => c.color && c.conn.open).map((c) => c.color!))
      })
    })
  }
  useEffect(() => () => { peer.current?.destroy() }, [])

  // ================================================================ réseau : invité
  const join = async (e?: FormEvent) => {
    e?.preventDefault()
    if (INVITED && !joinName.trim()) { setNetError(t('Entrez votre nom.', 'Enter your name.')); return }
    setNetError(''); setJoining(true)
    const { default: Peer } = await import('peerjs')
    const p = peerOpts() ? new Peer(peerOpts()!) : new Peer()
    peer.current = p
    const fail = () => { setJoining(false); setNetError(t("Impossible de rejoindre la partie : l'hôte est peut-être hors ligne, ou votre réseau bloque les connexions directes.", 'Could not join the game: the host may be offline, or your network blocks direct connections.')) }
    p.on('error', fail)
    p.on('open', () => {
      const conn = p.connect(ROOM!, { reliable: true })
      hostConn.current = conn
      const timer = setTimeout(fail, 12000)
      conn.on('open', () => { clearTimeout(timer); conn.send({ type: 'join', name: joinName, color: INVITED } satisfies Msg) })
      conn.on('data', (raw) => {
        const msg = raw as Msg
        if (msg.type === 'welcome') { setRole(msg.role); setMyColor(msg.color); setJoining(false); setPhase('play') }
        if (msg.type === 'state') {
          setG(msg.g); setPlayers(msg.players); setStarted(msg.started); setConnected(msg.seats); setHostName(msg.host)
          setDeadline(msg.msLeft ? Date.now() + msg.msLeft : null)
        }
      })
      conn.on('close', () => setNetError(t("L'hôte a quitté la partie.", 'The host left the game.')))
    })
  }

  // ================================================================ étapes de configuration
  const submitSetup = (e: FormEvent) => {
    e.preventDefault()
    const list = seats(count).map((c, i) => ({ color: c, name: names[c].trim() || (mode === 'online' ? '' : label(c)), ai: mode === 'cpu' && i > 0 }))
    if (mode === 'online') {
      if (list.some((p) => !p.name)) { setSetupError(t('En ligne, chaque joueur doit avoir un nom : il sert à le reconnaître quand il ouvre son lien.', 'Online, every player needs a name: it is used to recognise them when they open their link.')); return }
      if (new Set(list.map((p) => norm(p.name))).size !== list.length) { setSetupError(t('Les noms doivent être différents.', 'Names must be different.')); return }
    }
    setSetupError(''); setPlayers(list); setPhase('rules')
  }
  const begin = () => {
    // Position de départ injectable pour les tests (window.__ludoPieces), partie neuve sinon
    const init = (window as unknown as { __ludoPieces?: Game['pieces'] }).__ludoPieces
    setG(init ? { ...newGame(players), pieces: init } : newGame(players))
    if (mode === 'online') { setStarted(true) }
    setPhase('play')
    requestAnimationFrame(() => diceBtn.current?.focus())
  }
  const toLobby = async () => { setPhase('lobby'); if (!peer.current) await openRoom() }
  const linkFor = (c: ColorKey | null) => `${location.origin}/ludo?room=${roomId}${c ? `&c=${c}` : ''}`

  // ================================================================ rendu
  const intro = (
    <DemoIntro
      kicker={t('Projet perso recréé · Jeu', 'Personal project, rebuilt · Game')}
      title="Ludo"
      lead={t('Le jeu de plateau à 4 couleurs, de 2 à 4 joueurs : contre l’ordinateur, entre amis sur le même appareil, ou en ligne sur des appareils différents avec un lien d’invitation.', 'The 4-colour board game for 2 to 4 players: against the computer, with friends on one device, or online on different devices with an invitation link.')}
      problem={t(<>Recréer un jeu de hasard complet et le rendre jouable à distance : règles, dé animé, captures, cases protégées, IA, et une partie en ligne synchronisée entre plusieurs appareils avec un temps de jeu limité.</>, <>Rebuilding a full game of chance and making it playable remotely: rules, animated dice, captures, safe squares, AI, and an online game synced across devices with a turn time limit.</>)}
      tryIt={t([<>Choisissez le mode et le nombre de joueurs, nommez chaque couleur.</>, <>En ligne : envoyez à chaque ami son lien ; il entre son nom pour jouer, sinon il regarde la partie.</>, <>Touchez le dé pour le lancer, puis un pion surligné. En ligne, chaque joueur a 15 s.</>], [<>Pick the mode and number of players, name each colour.</>, <>Online: send each friend their link; they enter their name to play, otherwise they watch.</>, <>Tap the dice to roll, then a highlighted piece. Online, each player has 15 s.</>])}
      under={t([<>Moteur de règles en fonctions pures, partagé par tous les modes.</>, <>En ligne : connexion pair à pair (WebRTC, PeerJS). Le navigateur de l’hôte arbitre la partie et diffuse l’état aux autres.</>, <>Minuteur de 15 s géré par l’hôte, hasard cryptographique pour le dé.</>], [<>Rules engine as pure functions, shared by all modes.</>, <>Online: peer-to-peer connection (WebRTC, PeerJS). The host’s browser referees the game and broadcasts the state.</>, <>15 s timer handled by the host, cryptographic randomness for the dice.</>])}
      stack={['React', 'TypeScript', 'WebRTC', 'PeerJS']}
    />
  )
  const shell = (content: ReactNode) => <>{intro}<div className="wrap ludo-panel">{content}</div><div style={{ height: 56 }} /></>

  // ----- invité : écran pour rejoindre
  if (guest && phase !== 'play') {
    return shell(
      <form className="card ludo-setup" onSubmit={join}>
        <h2 className="demo-h">{INVITED ? t('Vous êtes invité(e) à jouer', 'You are invited to play') : t('Regarder une partie de Ludo', 'Watch a Ludo game')}</h2>
        {INVITED && <p style={{ margin: 0 }}><span className="dot big" style={{ background: COLOR[INVITED].main }} aria-hidden="true" /> {t(`Couleur : ${label(INVITED)}`, `Colour: ${label(INVITED)}`)}</p>}
        {INVITED && (
          <div className="ax-field" style={{ margin: 0 }}>
            <label htmlFor="j-name">{t('Votre nom (celui choisi par l’hôte)', 'Your name (the one chosen by the host)')}</label>
            <input id="j-name" value={joinName} onChange={(e) => setJoinName(e.target.value)} autoComplete="nickname" maxLength={16} />
          </div>
        )}
        <p className="demo-note" style={{ margin: 0 }}>{t('Si le nom ne correspond pas, vous pourrez regarder la partie sans jouer.', 'If the name does not match, you can watch the game without playing.')}</p>
        {netError && <p role="alert" className="ax-error">{netError}</p>}
        <button type="submit" className="ax-btn" disabled={joining}>{joining ? t('Connexion…', 'Connecting…') : INVITED ? t('Rejoindre la partie', 'Join the game') : t('Regarder', 'Watch')}</button>
      </form>,
    )
  }

  // ----- hôte : configuration
  if (!guest && phase === 'setup') {
    return shell(
      <form className="card ludo-setup" onSubmit={submitSetup}>
        <h2 className="demo-h">{t('Nouvelle partie', 'New game')}</h2>
        <fieldset>
          <legend>{t('Nombre de joueurs', 'Number of players')}</legend>
          <div className="seg">{[2, 3, 4].map((n) => <label key={n}><input type="radio" name="count" checked={count === n} onChange={() => setCount(n)} /> <span>{n}</span></label>)}</div>
        </fieldset>
        <fieldset>
          <legend>{t('Mode de jeu', 'Game mode')}</legend>
          <div className="seg wide">
            <label><input type="radio" name="mode" checked={mode === 'cpu'} onChange={() => setMode('cpu')} /> <span>{t('Contre l’ordinateur', 'Against the computer')}</span></label>
            <label><input type="radio" name="mode" checked={mode === 'local'} onChange={() => setMode('local')} /> <span>{t('Entre amis · même appareil', 'Friends · same device')}</span></label>
            <label><input type="radio" name="mode" checked={mode === 'online'} onChange={() => setMode('online')} /> <span>{t('Entre amis · en ligne', 'Friends · online')}</span></label>
          </div>
          {mode === 'online' && <p className="demo-note" style={{ margin: '8px 0 0' }}>{t('Vous jouez Bleu. Chaque ami reçoit un lien et entre son nom pour jouer. 15 s par action, sinon le tour passe.', 'You play Blue. Each friend gets a link and enters their name to play. 15 s per action, otherwise the turn passes.')}</p>}
        </fieldset>
        <fieldset>
          <legend>{t('Nom de chaque couleur', 'Name each colour')}</legend>
          <div className="name-grid">
            {seats(count).map((c, i) => (
              <div className="ax-field" key={c} style={{ margin: 0 }}>
                <label htmlFor={`n-${c}`}><span className="dot" style={{ background: COLOR[c].main }} aria-hidden="true" /> {label(c)}{mode === 'cpu' && i > 0 ? t(' (ordinateur)', ' (computer)') : mode === 'online' && i === 0 ? t(' (vous)', ' (you)') : ''}</label>
                <input id={`n-${c}`} value={names[c]} onChange={(e) => setNames({ ...names, [c]: e.target.value })} placeholder={mode === 'cpu' && i > 0 ? t(`Ordi ${label(c)}`, `CPU ${label(c)}`) : label(c)} maxLength={16} autoComplete="off" required={mode === 'online'} />
              </div>
            ))}
          </div>
        </fieldset>
        {setupError && <p role="alert" className="ax-error">{setupError}</p>}
        <button type="submit" className="ax-btn">{t('Valider', 'Confirm')}</button>
      </form>,
    )
  }

  // ----- hôte : règles
  if (!guest && phase === 'rules') {
    return shell(
      <section className="card ludo-rules" aria-labelledby="r-title">
        <h2 id="r-title" className="demo-h">{t('Règles du jeu', 'Game rules')}</h2>
        <p className="players-line">{players.map((p) => <span key={p.color}><span className="dot" style={{ background: COLOR[p.color].main }} aria-hidden="true" /> {p.name}{p.ai ? ' 🤖' : ''}</span>)}</p>
        <ul>
          <li>{t(<><strong>Jeu de hasard</strong> : chacun à son tour lance le dé en le touchant.</>, <><strong>Game of chance</strong>: players take turns rolling the dice by tapping it.</>)}</li>
          <li>{t(<>Il faut un <strong>6 pour sortir</strong> un pion de sa maison vers la case <strong>START</strong>.</>, <>You need a <strong>6 to bring a piece out</strong> of home onto <strong>START</strong>.</>)}</li>
          <li>{t(<>Les pions font le tour du plateau, puis entrent dans le <strong>couloir de leur couleur</strong>.</>, <>Pieces go round the board, then enter the <strong>lane of their colour</strong>.</>)}</li>
          <li>{t(<>Tomber sur un pion adverse le <strong>renvoie à sa maison</strong>, sauf sur ★ et START.</>, <>Landing on an opponent’s piece <strong>sends it home</strong>, except on ★ and START.</>)}</li>
          <li>{t(<>Un <strong>6</strong> ou une <strong>capture</strong> fait rejouer. Il faut le <strong>nombre exact</strong> pour arriver.</>, <>A <strong>6</strong> or a <strong>capture</strong> gives another turn. You need the <strong>exact number</strong> to finish.</>)}</li>
          {mode === 'online' && <li>{t(<><strong>En ligne</strong> : 15 secondes par action. Passé ce délai, le tour passe au joueur suivant.</>, <><strong>Online</strong>: 15 seconds per action. After that, the turn passes to the next player.</>)}</li>}
        </ul>
        <p className="win-line">🏆 {t('Gagne le premier joueur qui ramène ses 4 pions au centre.', 'The first player to bring all 4 pieces to the centre wins.')}</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="ax-btn" onClick={mode === 'online' ? toLobby : begin}>{t('Continuer', 'Continue')}</button>
          <button type="button" className="ax-btn secondary" onClick={() => setPhase('setup')}>{t('Modifier les joueurs', 'Edit players')}</button>
        </div>
      </section>,
    )
  }

  // ----- invitations (hôte en ligne)
  const invites = (
    <div className="invites">
      {!roomId && !netError && <p className="demo-note">{t('Création de la salle…', 'Creating the room…')}</p>}
      {netError && <p role="alert" className="ax-error">{netError}</p>}
      {roomId && players.slice(1).map((p) => {
        const url = linkFor(p.color)
        const text = t(`Rejoins ma partie de Ludo ! Tu joues ${label(p.color)} sous le nom « ${p.name} » : ${url}`, `Join my Ludo game! You play ${label(p.color)} as “${p.name}”: ${url}`)
        const ok = connected.includes(p.color)
        return (
          <div className="invite" key={p.color}>
            <p><span className="dot" style={{ background: COLOR[p.color].main }} aria-hidden="true" /> <strong>{p.name}</strong> · {label(p.color)} <span className={ok ? 'st-on' : 'st-off'}>{ok ? t('● connecté', '● connected') : t('○ en attente', '○ waiting')}</span></p>
            <label className="sr-only" htmlFor={`l-${p.color}`}>{t(`Lien de ${p.name}`, `${p.name}'s link`)}</label>
            <input id={`l-${p.color}`} readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
            <div className="invite-btns">
              <button type="button" className="ax-btn secondary" onClick={() => navigator.clipboard?.writeText(url).catch(() => {})}>{t('Copier', 'Copy')}<span className="sr-only"> {t(`le lien de ${p.name}`, `${p.name}'s link`)}</span></button>
              <a className="ax-btn secondary" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">WhatsApp<span className="sr-only">{t(' (nouvel onglet)', ' (new tab)')}</span></a>
            </div>
          </div>
        )
      })}
      {roomId && (
        <div className="invite">
          <p>👀 <strong>{t('Lien spectateur', 'Spectator link')}</strong></p>
          <input aria-label={t('Lien spectateur', 'Spectator link')} readOnly value={linkFor(null)} onFocus={(e) => e.currentTarget.select()} />
        </div>
      )}
    </div>
  )

  if (!guest && phase === 'lobby') {
    return shell(
      <section className="card ludo-rules" aria-labelledby="lobby-h">
        <h2 id="lobby-h" className="demo-h">{t('Inviter vos amis', 'Invite your friends')}</h2>
        <p style={{ margin: 0 }}>{t('Envoyez à chacun son lien. Il l’ouvre, entre son nom, et apparaît « connecté ». Gardez cette page ouverte : votre navigateur arbitre la partie.', 'Send each friend their link. They open it, enter their name and show as “connected”. Keep this page open: your browser referees the game.')}</p>
        {invites}
        <button type="button" className="ax-btn" onClick={begin} disabled={!roomId}>{t('Lancer la partie', 'Start the game')}</button>
      </section>,
    )
  }

  // ----- invité en attente du lancement
  if (guest && (!started || !g)) {
    return shell(
      <section className="card ludo-rules">
        <h2 className="demo-h">{t(`Partie de ${hostName}`, `${hostName}'s game`)}</h2>
        <p style={{ margin: 0 }}>{role === 'player' && myColor ? t(`Vous jouez ${label(myColor)}. En attente du lancement…`, `You play ${label(myColor)}. Waiting for the host to start…`) : t('Vous regardez la partie. En attente du lancement…', 'You are watching. Waiting for the host to start…')}</p>
        <p className="players-line">{players.map((p) => <span key={p.color}><span className="dot" style={{ background: COLOR[p.color].main }} aria-hidden="true" /> {p.name}{connected.includes(p.color) || p.color === 'blue' ? ' ✓' : ''}</span>)}</p>
        {netError && <p role="alert" className="ax-error">{netError}</p>}
      </section>,
    )
  }

  if (!g) return null

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
      if (owner) { style = { background: COLOR[owner].main }; mark = 'START'; cls += ' start' } else if (SAFE.has(ti)) mark = '★'
    } else cls += ' void'
    cells.push(<div key={`${r}-${c}`} className={cls} style={style} aria-hidden="true">{mark}</div>)
  }
  const secs = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null
  const winner = g.winner !== null ? g.players[g.winner] : null
  const isMine = (c: ColorKey) => (guest ? myColor === c : mode === 'online' ? c === 'blue' : true)
  const lastLog = g.log[0]?.[lang] ?? ''

  return (
    <>
      {intro}
      <LiveRegion message={lastLog} />
      <div className="wrap ludo-layout">
        <div className="ludo-board-wrap">
          <div className="ludo-board" role="group" aria-label={t('Plateau de Ludo', 'Ludo board')}>
            <div className="ludo-grid">{cells}</div>
            {(Object.keys(BASE_ORIGIN) as ColorKey[]).map((k) => (
              <div key={k} className="base-yard" aria-hidden="true" style={{ top: `${((BASE_ORIGIN[k][0] + 1) / 15) * 100}%`, left: `${((BASE_ORIGIN[k][1] + 1) / 15) * 100}%` }}>
                {g.players.find((p) => p.color === k)?.name}
              </div>
            ))}
            <div className="ludo-center" aria-hidden="true" style={{ background: `conic-gradient(from -45deg, ${COLOR.red.main} 0 90deg, ${COLOR.green.main} 90deg 180deg, ${COLOR.yellow.main} 180deg 270deg, ${COLOR.blue.main} 270deg 360deg)` }} />

            {/* pions arrivés : un seul pion par couleur au centre, avec le nombre */}
            {g.players.map((p) => {
              const n = g.pieces[p.color].filter((q) => q === FINISH).length
              if (!n) return null
              const [r, c] = cellOf(p.color, FINISH, 0)
              return (
                <span key={`home-${p.color}`} className="pawn home" style={{ top: `${((r + 0.5) / 15) * 100}%`, left: `${((c + 0.5) / 15) * 100}%`, background: COLOR[p.color].main }}
                  role="img" aria-label={t(`${n} pion(s) de ${p.name} arrivé(s)`, `${n} of ${p.name}'s pieces home`)}>
                  <b>{n}</b>
                </span>
              )
            })}

            {g.players.flatMap((p) => g.pieces[p.color].map((pos, i) => {
              if (pos === FINISH) return null
              const [r, c] = cellOf(p.color, pos, i)
              const stack = pos >= 0 ? g.pieces[p.color].slice(0, i).filter((q) => q === pos).length : 0
              const can = canAct && p === cur && movable.includes(i) && isMine(p.color)
              const where = pos < 0 ? t('à la maison', 'at home') : pos > 50 ? t(`dans le couloir, case ${pos - 50}`, `in the lane, square ${pos - 50}`) : t(`case ${pos + 1} sur 51`, `square ${pos + 1} of 51`)
              return (
                <button key={`${p.color}${i}`} type="button" className={`pawn${can ? ' can' : ''}`} disabled={!can} onClick={() => doMove(i)}
                  style={{ top: `${((r + 0.5) / 15) * 100}%`, left: `${((c + 0.5) / 15) * 100}%`, background: COLOR[p.color].main, transform: `translate(calc(-50% + ${stack * 4}px), calc(-50% - ${stack * 4}px))` }}
                  aria-label={t(`Pion ${i + 1} de ${p.name}, ${where}${can ? ', jouable' : ''}`, `${p.name} piece ${i + 1}, ${where}${can ? ', playable' : ''}`)} />
              )
            }))}

            {winner && (
              <div className="win-overlay" role="alert">
                <div className="confetti" aria-hidden="true">{Array.from({ length: 28 }, (_, k) => <span key={k} style={{ left: `${(k * 37) % 100}%`, animationDelay: `${(k % 7) * 0.25}s`, animationDuration: `${2.4 + (k % 5) * 0.4}s` }}>{['🎉', '🏆', '🥳', '🎊', '✨', '⭐', '👑'][k % 7]}</span>)}</div>
                <p className="win-big" style={{ textShadow: `0 0 28px ${COLOR[winner.color].main}, 0 0 60px ${COLOR[winner.color].main}, 0 6px 0 ${COLOR[winner.color].main}` }}>WIN</p>
                <p className="win-name">🏆 {winner.name} <span aria-hidden="true">🥳🎉</span></p>
              </div>
            )}
          </div>
        </div>

        <aside className="ludo-side">
          <div className="card turn-card" style={{ borderColor: cur ? COLOR[cur.color].main : undefined }}>
            {winner ? (
              <>
                <p className="kicker">{t('Partie terminée', 'Game over')}</p>
                <h2 className="demo-h">🏆 {t(`${winner.name} gagne !`, `${winner.name} wins!`)}</h2>
                {!guest && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button type="button" className="ax-btn" onClick={begin}>{t('Rejouer', 'Play again')}</button>
                    <button type="button" className="ax-btn secondary" onClick={() => setPhase('setup')}>{t('Changer les joueurs', 'Change players')}</button>
                  </div>
                )}
              </>
            ) : cur && (
              <>
                <p className="kicker">{t('À qui de jouer', 'Whose turn')}</p>
                <h2 className="demo-h"><span className="dot big" style={{ background: COLOR[cur.color].main }} aria-hidden="true" /> {cur.name}{cur.ai ? ' 🤖' : ''}{online && isMine(cur.color) ? t(' (vous)', ' (you)') : ''}</h2>
                <button ref={diceBtn} type="button" className={`dice${rolling ? ' rolling' : ''}`} onClick={doRoll}
                  disabled={!canAct || g.dice !== null} aria-label={g.dice !== null && !rolling ? t(`Dé : ${g.dice}`, `Dice: ${g.dice}`) : t('Lancer le dé', 'Roll the dice')}>
                  <span aria-hidden="true">{FACES[(rolling ? face : g.dice ?? face) - 1]}</span>
                </button>
                {secs !== null && (
                  <div className={`timer${secs <= 5 ? ' low' : ''}`} role="timer" aria-label={t(`${secs} secondes restantes`, `${secs} seconds left`)}>
                    <span style={{ width: `${(secs / 15) * 100}%` }} /><b aria-hidden="true">{secs}s</b>
                  </div>
                )}
                <p className="demo-note" style={{ margin: 0 }}>
                  {cur.ai ? t('L’ordinateur joue…', 'The computer is playing…')
                    : online && !isMine(cur.color) ? t(`En attente de ${cur.name}…`, `Waiting for ${cur.name}…`)
                    : g.dice === null ? t('Touchez le dé pour le lancer.', 'Tap the dice to roll.')
                    : rolling ? '…' : movable.length ? t('Choisissez un pion surligné.', 'Choose a highlighted piece.') : t('Aucun coup possible.', 'No move possible.')}
                </p>
              </>
            )}
          </div>
          {guest && <p className="demo-note" style={{ margin: 0 }}>{role === 'player' && myColor ? t(`Connecté(e) : vous jouez ${label(myColor)}.`, `Connected: you play ${label(myColor)}.`) : t('Mode spectateur : vous regardez la partie.', 'Spectator mode: you are watching the game.')}</p>}
          {netError && <p role="alert" className="ax-error">{netError}</p>}
          <div className="card">
            <p className="kicker">{t('Pions arrivés', 'Pieces home')}</p>
            <ul className="score-list">
              {g.players.map((p) => <li key={p.color}><span className="dot" style={{ background: COLOR[p.color].main }} aria-hidden="true" /> {p.name}{online && p.color !== 'blue' ? (connected.includes(p.color) ? ' ●' : ' ○') : ''} : <strong>{g.pieces[p.color].filter((q) => q === FINISH).length} / 4</strong></li>)}
            </ul>
          </div>
          <div className="card">
            <p className="kicker">{t('Derniers coups', 'Last moves')}</p>
            <ol className="move-log">{g.log.slice(0, 6).map((l, i) => <li key={i}>{l[lang]}</li>)}</ol>
            {!guest && <button type="button" className="ax-btn secondary" onClick={() => setPhase('setup')}>{t('Nouvelle partie', 'New game')}</button>}
          </div>
          {!guest && mode === 'online' && <details className="card"><summary><strong>{t('Liens d’invitation', 'Invitation links')}</strong></summary>{invites}</details>}
        </aside>
      </div>
      <div style={{ height: 56 }} />
    </>
  )
}
