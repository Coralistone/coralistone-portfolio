import { useEffect, useMemo, useState } from 'react'
import DemoIntro from '../components/DemoIntro'
import { LiveRegion, Modal } from '../components/a11y'
import { useLang, useT, type L } from '../i18n'

type Dish = { id: string; name: L; price: number; emoji: string }
type Resto = { id: string; name: string; cuisine: L; time: number; rating: number; fee: number; hue: number; emoji: string; dishes: Dish[] }

const RESTOS: Resto[] = [
  { id: 'mama', name: 'Chez Mama Kribi', cuisine: { fr: 'Camerounaise', en: 'Cameroonian' }, time: 25, rating: 4.8, fee: 1.99, hue: 20, emoji: '🍲',
    dishes: [{ id: 'ndole', name: { fr: 'Ndolè crevettes', en: 'Shrimp ndolè' }, price: 13.5, emoji: '🥬' }, { id: 'poulet', name: { fr: 'Poulet DG', en: 'Chicken DG' }, price: 14, emoji: '🍗' }, { id: 'beignets', name: { fr: 'Beignets haricots', en: 'Bean fritters' }, price: 6, emoji: '🫘' }, { id: 'jus', name: { fr: 'Jus de foléré', en: 'Hibiscus juice' }, price: 3.5, emoji: '🧃' }] },
  { id: 'napoli', name: 'Napoli Express', cuisine: { fr: 'Italienne', en: 'Italian' }, time: 30, rating: 4.6, fee: 0.99, hue: 5, emoji: '🍕',
    dishes: [{ id: 'marg', name: { fr: 'Pizza margherita', en: 'Margherita pizza' }, price: 10, emoji: '🍕' }, { id: 'carbo', name: { fr: 'Pâtes carbonara', en: 'Carbonara pasta' }, price: 12, emoji: '🍝' }, { id: 'tira', name: { fr: 'Tiramisu', en: 'Tiramisu' }, price: 5.5, emoji: '🍰' }] },
  { id: 'sushi', name: 'Sakura Sushi', cuisine: { fr: 'Japonaise', en: 'Japanese' }, time: 35, rating: 4.7, fee: 2.49, hue: 340, emoji: '🍣',
    dishes: [{ id: 'plateau', name: { fr: 'Plateau 18 pièces', en: '18-piece platter' }, price: 19.9, emoji: '🍣' }, { id: 'ramen', name: { fr: 'Ramen shoyu', en: 'Shoyu ramen' }, price: 13, emoji: '🍜' }, { id: 'mochi', name: { fr: 'Mochis glacés', en: 'Ice cream mochi' }, price: 5, emoji: '🍡' }] },
  { id: 'green', name: 'Green Bowl', cuisine: { fr: 'Healthy', en: 'Healthy' }, time: 20, rating: 4.5, fee: 1.49, hue: 140, emoji: '🥗',
    dishes: [{ id: 'poke', name: { fr: 'Poke saumon', en: 'Salmon poke' }, price: 12.5, emoji: '🥗' }, { id: 'wrap', name: { fr: 'Wrap falafel', en: 'Falafel wrap' }, price: 9, emoji: '🌯' }, { id: 'smoothie', name: { fr: 'Smoothie mangue', en: 'Mango smoothie' }, price: 4.5, emoji: '🥭' }] },
  { id: 'burger', name: 'Le Burger Rochelais', cuisine: { fr: 'Burgers', en: 'Burgers' }, time: 25, rating: 4.4, fee: 0.49, hue: 35, emoji: '🍔',
    dishes: [{ id: 'classic', name: { fr: 'Burger classique', en: 'Classic burger' }, price: 11, emoji: '🍔' }, { id: 'frites', name: { fr: 'Frites maison', en: 'Homemade fries' }, price: 3.5, emoji: '🍟' }, { id: 'shake', name: { fr: 'Milkshake vanille', en: 'Vanilla milkshake' }, price: 4.5, emoji: '🥤' }] },
  { id: 'tacos', name: 'Taqueria Sol', cuisine: { fr: 'Mexicaine', en: 'Mexican' }, time: 30, rating: 4.3, fee: 1.29, hue: 50, emoji: '🌮',
    dishes: [{ id: 'tacos', name: { fr: 'Tacos al pastor', en: 'Tacos al pastor' }, price: 10.5, emoji: '🌮' }, { id: 'burrito', name: { fr: 'Burrito bœuf', en: 'Beef burrito' }, price: 11.5, emoji: '🌯' }, { id: 'churros', name: { fr: 'Churros', en: 'Churros' }, price: 4, emoji: '🍩' }] },
]

const STEPS: L[] = [
  { fr: 'Commande confirmée', en: 'Order confirmed' }, { fr: 'En préparation', en: 'Being prepared' },
  { fr: 'Le livreur est en route', en: 'Courier on the way' }, { fr: 'Livrée, bon appétit !', en: 'Delivered, enjoy!' },
]

export default function Food() {
  const t = useT()
  const { lang } = useLang()
  const money = (n: number) => n.toLocaleString(lang === 'en' ? 'en-GB' : 'fr-FR', { style: 'currency', currency: 'EUR' })
  const [cuisine, setCuisine] = useState('all')
  const [fast, setFast] = useState(false)
  const [open, setOpen] = useState<Resto | null>(null)
  const [cart, setCart] = useState<Record<string, number>>({})
  const [cartResto, setCartResto] = useState<Resto | null>(null)
  const [step, setStep] = useState<number | null>(null)
  const [msg, setMsg] = useState('')

  const list = useMemo(() => RESTOS.filter((r) => (cuisine === 'all' || r.cuisine.fr === cuisine) && (!fast || r.time <= 25)), [cuisine, fast])
  const lines = cartResto ? cartResto.dishes.filter((d) => cart[d.id]) : []
  const subtotal = lines.reduce((s, d) => s + d.price * cart[d.id], 0)
  const items = lines.reduce((s, d) => s + cart[d.id], 0)

  const add = (r: Resto, d: Dish, delta: number) => {
    if (cartResto && cartResto.id !== r.id && delta > 0) { setCart({}); setMsg(t(`Panier vidé : un panier ne contient qu'un restaurant.`, 'Cart emptied: a cart holds one restaurant only.')) }
    setCartResto(r)
    setCart((c) => {
      const base = cartResto && cartResto.id !== r.id ? {} : c
      const q = Math.max(0, (base[d.id] ?? 0) + delta)
      return { ...base, [d.id]: q }
    })
    setMsg(delta > 0 ? t(`${d.name.fr} ajouté au panier.`, `${d.name.en} added to cart.`) : t(`${d.name.fr} retiré.`, `${d.name.en} removed.`))
  }

  const order = () => { setStep(0); setOpen(null); setMsg(t('Commande confirmée.', 'Order confirmed.')) }
  useEffect(() => {
    if (step === null || step >= STEPS.length - 1) return
    const id = setTimeout(() => { setStep(step + 1); setMsg(STEPS[step + 1][lang]) }, 2500)
    return () => clearTimeout(id)
  }, [step, lang])

  return (
    <>
      <DemoIntro
        kicker={t('Projet perso recréé · Application web', 'Personal project, rebuilt · Web app')}
        title={t('Clone Uber Eats', 'Uber Eats clone')}
        lead={t(
          'Parcours complet de commande de repas : liste des restaurants, filtres, menu, panier, commande et suivi de livraison en temps réel.',
          'A complete food-ordering flow: restaurant list, filters, menu, cart, checkout and live delivery tracking.',
        )}
        problem={t(
          <>Reproduire le parcours d'une application de livraison : un catalogue filtrable, un panier cohérent (un seul restaurant par panier, calcul des frais), puis un suivi de commande étape par étape.</>,
          <>Reproducing a delivery app flow: a filterable catalogue, a consistent cart (one restaurant per cart, fees computed), then step-by-step order tracking.</>,
        )}
        tryIt={t(
          [<>Filtrez par cuisine ou « livraison rapide ».</>, <>Ouvrez un restaurant, ajoutez des plats au panier.</>, <>Commandez : le suivi de livraison avance tout seul.</>],
          [<>Filter by cuisine or “fast delivery”.</>, <>Open a restaurant and add dishes to the cart.</>, <>Order: delivery tracking progresses on its own.</>],
        )}
        under={t(
          [<>État du panier dérivé (sous-total, frais, total) sans duplication de données.</>, <>Menu en fenêtre modale accessible, quantités annoncées au lecteur d'écran.</>, <>Suivi de commande en étapes avec barre de progression.</>],
          [<>Derived cart state (subtotal, fees, total) with no duplicated data.</>, <>Menu in an accessible dialog, quantities announced to screen readers.</>, <>Step-based order tracking with a progress bar.</>],
        )}
        stack={['React', 'TypeScript', 'UX']}
      />
      <LiveRegion message={msg} />

      <div className="wrap food-layout">
        <section aria-labelledby="f-list">
          <h2 id="f-list" className="demo-h">{t('Restaurants près de chez vous', 'Restaurants near you')}</h2>
          <div className="food-filters">
            <div className="ax-field" style={{ margin: 0 }}>
              <label htmlFor="f-cuisine">{t('Cuisine', 'Cuisine')}</label>
              <select id="f-cuisine" value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
                <option value="all">{t('Toutes', 'All')}</option>
                {RESTOS.map((r) => <option key={r.id} value={r.cuisine.fr}>{r.cuisine[lang]}</option>)}
              </select>
            </div>
            <label className="check" style={{ margin: 0 }}><input type="checkbox" checked={fast} onChange={(e) => setFast(e.target.checked)} /> {t('Livraison rapide (≤ 25 min)', 'Fast delivery (≤ 25 min)')}</label>
            <p className="demo-note" style={{ margin: 0 }} aria-live="polite">{t(`${list.length} restaurant(s)`, `${list.length} restaurant(s)`)}</p>
          </div>
          <ul className="resto-grid">
            {list.map((r) => (
              <li key={r.id}>
                <button type="button" className="resto" onClick={() => setOpen(r)}>
                  <span className="resto-img" style={{ ['--h' as string]: r.hue }} aria-hidden="true">{r.emoji}</span>
                  <span className="resto-name">{r.name}</span>
                  <span className="resto-meta">{r.cuisine[lang]} · ★ {r.rating.toLocaleString(lang)} · {r.time} min · {t('livraison', 'delivery')} {money(r.fee)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <aside className="card cart" aria-labelledby="f-cart">
          <h2 id="f-cart" className="demo-h" style={{ fontSize: 20 }}>{t('Panier', 'Cart')}{items > 0 && ` (${items})`}</h2>
          {step !== null ? (
            <div>
              <p style={{ marginTop: 0 }}><strong>{cartResto?.name}</strong></p>
              <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={STEPS.length - 1} aria-valuenow={step} aria-valuetext={STEPS[step][lang]} aria-label={t('Suivi de commande', 'Order tracking')}>
                <span style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
              </div>
              <ol className="track">
                {STEPS.map((s, i) => <li key={i} className={i <= step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}>{i < step ? '✓ ' : i === step ? '● ' : '○ '}{s[lang]}</li>)}
              </ol>
              {step === STEPS.length - 1 && <button type="button" className="ax-btn secondary" onClick={() => { setStep(null); setCart({}); setCartResto(null) }}>{t('Nouvelle commande', 'New order')}</button>}
            </div>
          ) : lines.length === 0 ? (
            <p className="demo-note">{t('Votre panier est vide. Choisissez un restaurant pour commencer.', 'Your cart is empty. Pick a restaurant to start.')}</p>
          ) : (
            <>
              <p style={{ marginTop: 0 }}><strong>{cartResto?.name}</strong></p>
              <ul className="cart-lines">
                {lines.map((d) => (
                  <li key={d.id}><span>{cart[d.id]} × {d.name[lang]}</span><span>{money(d.price * cart[d.id])}</span></li>
                ))}
              </ul>
              <dl className="totals">
                <div><dt>{t('Sous-total', 'Subtotal')}</dt><dd>{money(subtotal)}</dd></div>
                <div><dt>{t('Livraison', 'Delivery')}</dt><dd>{money(cartResto!.fee)}</dd></div>
                <div className="total"><dt>Total</dt><dd>{money(subtotal + cartResto!.fee)}</dd></div>
              </dl>
              <button type="button" className="ax-btn" style={{ width: '100%' }} onClick={order}>{t('Commander', 'Place order')}</button>
            </>
          )}
        </aside>
      </div>

      <Modal open={open !== null} onClose={() => setOpen(null)} title={open?.name ?? ''}>
        {open && (
          <>
            <p className="demo-note" style={{ marginTop: 0 }}>{open.cuisine[lang]} · {open.time} min · ★ {open.rating.toLocaleString(lang)}</p>
            <ul className="menu-list">
              {open.dishes.map((d) => {
                const q = cartResto?.id === open.id ? cart[d.id] ?? 0 : 0
                return (
                  <li key={d.id}>
                    <span className="dish-emoji" aria-hidden="true">{d.emoji}</span>
                    <span className="dish-name">{d.name[lang]}<br /><small>{money(d.price)}</small></span>
                    <span className="qty">
                      <button type="button" className="ax-icon-btn" onClick={() => add(open, d, -1)} disabled={q === 0} aria-label={t(`Retirer un ${d.name.fr}`, `Remove one ${d.name.en}`)}>−</button>
                      <span aria-live="polite" aria-label={t(`Quantité : ${q}`, `Quantity: ${q}`)}>{q}</span>
                      <button type="button" className="ax-icon-btn" onClick={() => add(open, d, 1)} aria-label={t(`Ajouter un ${d.name.fr}`, `Add one ${d.name.en}`)}>+</button>
                    </span>
                  </li>
                )
              })}
            </ul>
            <button type="button" className="ax-btn" style={{ width: '100%' }} onClick={() => setOpen(null)}>{t('Voir le panier', 'View cart')}{items > 0 && ` (${items})`}</button>
          </>
        )}
      </Modal>
      <div style={{ height: 56 }} />
    </>
  )
}
