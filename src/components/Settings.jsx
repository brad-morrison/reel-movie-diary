import { useRef, useState } from 'react'
import { verifyKey, enrichMissing } from '../lib/tmdb.js'
import { parseNotionCsv } from '../lib/csv.js'
import {
  IconCheck, IconDownload, IconUpload, IconTrash, IconSparkle, IconPlus, IconX,
  IconCloud, IconCloudCheck, IconLogOut, IconGoogle,
  IconSun, IconMoon, IconChevron,
} from '../lib/icons.jsx'

export default function Settings({ settings, setSettings, entries, watchlists, replaceAll, restoreBackup, clearAllData, importEntries, notify, cloudEnabled, user, syncStatus, syncError, signIn, signOut, saveToCloud, updateAvatar }) {
  const [key, setKey] = useState(settings.tmdbKey || '')
  const [checking, setChecking] = useState(false)
  const [keyStatus, setKeyStatus] = useState(settings.tmdbKey ? 'saved' : '')
  const [enriching, setEnriching] = useState(null) // {done,total} | null
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileJson = useRef(null)
  const fileCsv = useRef(null)
  const fileAvatar = useRef(null)

  async function chooseAvatar(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setAvatarUploading(true)
    try {
      await updateAvatar(file)
      notify('Profile picture updated')
    } catch (error) {
      notify(error?.message || 'Could not upload profile picture')
    } finally {
      setAvatarUploading(false)
    }
  }

  const missingArt = entries.filter((e) => !e.poster).length

  async function runEnrichment(list) {
    if (!settings.tmdbKey) {
      notify('Connect a TMDB key first to fetch artwork')
      return
    }
    setEnriching({ done: 0, total: list.filter((e) => !e.poster).length })
    const { entries: enrichedList, enriched } = await enrichMissing(
      list,
      settings.tmdbKey,
      (done, total) => setEnriching({ done, total }),
    )
    replaceAll(enrichedList)
    setEnriching(null)
    if (enriched) notify(`Fetched artwork for ${enriched} title${enriched === 1 ? '' : 's'}`)
  }

  async function saveKey() {
    setChecking(true)
    const ok = await verifyKey(key.trim())
    setChecking(false)
    if (ok) {
      setSettings((s) => ({ ...s, tmdbKey: key.trim() }))
      setKeyStatus('ok')
      notify('TMDB connected — search is live')
    } else {
      setKeyStatus('bad')
    }
  }

  function exportJson() {
    const backup = {
      format: 'reel-backup', version: 2, exportedAt: new Date().toISOString(),
      entries, watchlists, settings,
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reel-complete-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    notify(`Complete backup exported — ${entries.length} diary entries and ${watchlists.length} watch lists`)
  }

  function onJsonFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        if (Array.isArray(data)) {
          replaceAll(data)
          notify(`Restored ${data.length} diary entries from a legacy backup`)
        } else {
          const restored = restoreBackup(data)
          notify(`Restored ${restored.entries} diary entries, ${restored.watchlistItems} saved titles, and ${restored.lists} lists`)
        }
      } catch {
        notify('Could not read that file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function onCsvFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const rows = parseNotionCsv(reader.result)
        if (rows.length === 0) throw new Error()
        const { entries: next, added, merged } = importEntries(rows)
        notify(`Imported ${added} new, updated ${merged} from Notion`)
        // Commit the exact imported list immediately instead of waiting for the
        // debounced sync, which could otherwise lose to an older cloud snapshot.
        if (user) {
          try {
            await saveToCloud(next)
            notify(`Saved ${next.length} diary entries to the cloud`)
          } catch (error) {
            notify(error?.message || 'Imported locally, but cloud save failed')
          }
        }
        // Automatically fetch artwork for anything still missing it.
        if (settings.tmdbKey) await runEnrichment(next)
      } catch {
        notify('Could not parse that CSV')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function removeFrom(listKey, value) {
    setSettings((s) => ({ ...s, [listKey]: (s[listKey] || []).filter((x) => x !== value) }))
  }
  function addTo(listKey, value) {
    const v = value.trim()
    if (!v) return
    setSettings((s) => ({ ...s, [listKey]: (s[listKey] || []).some((x) => x.toLowerCase() === v.toLowerCase()) ? s[listKey] : [...(s[listKey] || []), v] }))
  }

  const syncLabel = { saving: 'Syncing…', synced: 'All changes saved to the cloud', error: syncError || 'Sync error — retrying…', idle: '' }[syncStatus] || ''

  return (
    <div className="settings-section">
      <div className="setting-card appearance-card">
        <div className="appearance-copy">
          <h3>Appearance</h3>
          <p className="desc">Choose how Reel looks on this device.</p>
        </div>
        <div className="appearance-controls">
          <div className="appearance-option">
            <span className="appearance-label">Mode</span>
            <div className="theme-toggle" role="group" aria-label="Color theme">
              <button type="button" className={settings.theme !== 'light' ? 'active' : ''} aria-pressed={settings.theme !== 'light'} onClick={() => setSettings((s) => ({ ...s, theme: 'dark' }))}><IconMoon size={16} /> Dark</button>
              <button type="button" className={settings.theme === 'light' ? 'active' : ''} aria-pressed={settings.theme === 'light'} onClick={() => setSettings((s) => ({ ...s, theme: 'light' }))}><IconSun size={16} /> Light</button>
            </div>
          </div>
          <div className="appearance-option">
            <span className="appearance-label">Accent</span>
            <div className="accent-select-row">
              <span className={`accent-swatch ${(settings.accentScheme || 'reel') === 'candy' ? 'accent-swatch-candy' : 'accent-swatch-reel'}`} aria-hidden />
              <div className="select-wrap accent-select">
                <select aria-label="Accent color scheme" value={settings.accentScheme || 'reel'} onChange={(event) => setSettings((s) => ({ ...s, accentScheme: event.target.value }))}>
                  <option value="reel">Reel</option>
                  <option value="candy">Candy pink</option>
                </select>
                <IconChevron size={16} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="setting-card">
        <h3><IconCloud size={18} style={{ verticalAlign: '-3px' }} /> Cloud sync</h3>
        {!cloudEnabled ? (
          <>
            <p className="desc">
              Off. Your diary lives only in this browser. To sync across devices and back it up,
              add your Firebase config in <code>src/lib/firebaseConfig.js</code> — then this card lets you sign in.
            </p>
            <div className="status-line warn">Not configured yet</div>
          </>
        ) : user ? (
          <>
            <p className="desc">Your diary is saved to your private cloud and syncs to any device you sign in on.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <button type="button" className="avatar-upload" onClick={() => fileAvatar.current?.click()} disabled={avatarUploading} aria-label="Change profile picture">
                {user.photoURL
                  ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
                  : <span className="account-initial">{(user.displayName || user.email || '?')[0].toUpperCase()}</span>}
                <span>{avatarUploading ? '…' : <IconUpload size={14} />}</span>
              </button>
              <input ref={fileAvatar} className="visually-hidden" type="file" accept="image/*" onChange={chooseAvatar} />
              <div>
                <div style={{ fontWeight: 700 }}>{user.displayName || 'Signed in'}</div>
                <div className="dim" style={{ fontSize: 13 }}>{user.email}</div>
                <button type="button" className="avatar-change-label" onClick={() => fileAvatar.current?.click()} disabled={avatarUploading}>{avatarUploading ? 'Uploading…' : 'Change picture'}</button>
              </div>
            </div>
            <div className={`status-line ${syncStatus === 'error' ? 'warn' : 'ok'}`}>
              {syncStatus === 'error' ? <IconX size={16} /> : <IconCloudCheck size={16} />} {syncLabel}
            </div>
            <div className="inline-actions" style={{ marginTop: 14 }}>
              <button
                className="btn btn-primary"
                onClick={() => saveToCloud(entries)
                  .then(() => notify(`Saved ${entries.length} diary entries to the cloud`))
                  .catch((error) => notify(error?.message || 'Could not save to the cloud'))}
              >
                <IconUpload size={16} /> Save current diary to cloud
              </button>
              <button className="btn btn-ghost" onClick={() => signOut()}><IconLogOut size={16} /> Sign out</button>
            </div>
          </>
        ) : (
          <>
            <p className="desc">Sign in with Google to save your diary to the cloud and sync it across all your devices. Your data stays private to your account.</p>
            <button className="btn btn-ghost" onClick={() => signIn()?.catch((error) => notify(error?.message || 'Could not sign in'))} style={{ background: '#fff', color: '#1f1f1f', borderColor: 'transparent' }}>
              <IconGoogle size={18} /> Sign in with Google
            </button>
          </>
        )}
      </div>

      <div className="setting-card">
        <h3>TMDB — poster & metadata search</h3>
        <p className="desc">
          Add a free API key to search real films & TV with posters, synopses and genres.
          Grab one at <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">themoviedb.org → Settings → API</a> (the “API Read Access” v3 key). It's stored only in this browser.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            style={{ flex: 1, padding: '12px 14px' }}
            type="password"
            placeholder="Paste your TMDB API key"
            value={key}
            onChange={(e) => { setKey(e.target.value); setKeyStatus('') }}
          />
          <button className="btn btn-primary" onClick={saveKey} disabled={checking || !key.trim()}>
            {checking ? 'Checking…' : 'Connect'}
          </button>
        </div>
        {keyStatus === 'ok' && <div className="status-line ok"><IconCheck size={16} /> Connected. Search is live in “Add”.</div>}
        {keyStatus === 'saved' && <div className="status-line ok"><IconCheck size={16} /> A key is saved in this browser.</div>}
        {keyStatus === 'bad' && <div className="status-line warn">That key didn't validate. Double-check it's the v3 key.</div>}
      </div>

      <div className="setting-card">
        <h3>Your data</h3>
        <p className="desc">Your current browser keeps an offline copy. When signed in, the same diary is stored in Firebase and shared with the deployed site.</p>
        <div className="inline-actions">
          <button className="btn btn-ghost" onClick={exportJson}><IconDownload size={16} /> Export complete backup</button>
          <button className="btn btn-ghost" onClick={() => fileJson.current?.click()}><IconUpload size={16} /> Restore complete backup</button>
          <input ref={fileJson} type="file" accept="application/json" hidden onChange={onJsonFile} />
        </div>
      </div>

      <div className="setting-card">
        <h3><IconSparkle size={18} style={{ verticalAlign: '-3px' }} /> Import from Notion</h3>
        <p className="desc">
          In Notion, open your movie database → <strong>••• → Export → Markdown &amp; CSV</strong>, unzip, and load the CSV here.
          It looks for columns like <em>Name/Title, Year, Rating, Type, Date, Notes</em> and skips duplicates.
        </p>
        <div className="inline-actions">
          <button className="btn btn-ghost" onClick={() => fileCsv.current?.click()}><IconUpload size={16} /> Choose Notion CSV</button>
          <input ref={fileCsv} type="file" accept=".csv,text/csv" hidden onChange={onCsvFile} />
        </div>
        <p className="desc" style={{ marginTop: 14, marginBottom: 0 }}>
          Posters, backdrops &amp; genres are fetched automatically from TMDB after an import.
          Platform, who you watched with, and first-time watches all come across too.
        </p>
      </div>

      <div className="setting-card">
        <h3><IconSparkle size={18} style={{ verticalAlign: '-3px' }} /> Artwork</h3>
        <p className="desc">
          {missingArt > 0
            ? `${missingArt} ${missingArt === 1 ? 'title is' : 'titles are'} missing a poster.`
            : 'Every title has artwork. 🎉'}
        </p>
        <div className="inline-actions">
          <button
            className="btn btn-ghost"
            disabled={!!enriching || missingArt === 0 || !settings.tmdbKey}
            onClick={() => runEnrichment(entries)}
          >
            <IconSparkle size={16} /> Fetch missing artwork
          </button>
        </div>
        {enriching && (
          <div className="status-line warn" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <span>Fetching… {enriching.done}/{enriching.total}</span>
            <div className="bar-track" style={{ width: '100%' }}>
              <div className="bar-fill" style={{ width: `${enriching.total ? (enriching.done / enriching.total) * 100 : 0}%`, transition: 'width .3s' }} />
            </div>
          </div>
        )}
        {!settings.tmdbKey && <div className="status-line warn">Connect a TMDB key above to enable this.</div>}
      </div>

      <ListManager
        title="Platforms"
        desc="Where you watch — services, cinema, or your own labels. Used when logging a watch."
        items={settings.platforms || []}
        onAdd={(v) => addTo('platforms', v)}
        onRemove={(v) => removeFrom('platforms', v)}
        placeholder="Add a platform"
      />

      <ListManager
        title="People you watch with"
        desc="Everyone you share films & shows with. Pick them when logging a watch."
        items={settings.people || []}
        onAdd={(v) => addTo('people', v)}
        onRemove={(v) => removeFrom('people', v)}
        placeholder="Add a person"
        accent="rose"
      />
      {/* end */}

      <div className="setting-card">
        <h3 style={{ color: 'var(--rose)' }}>Danger zone</h3>
        <p className="desc">Clear this account's diary, watch lists, preferences, people, and platforms. This can't be undone — export a complete backup first.</p>
        <button
          className="btn btn-ghost"
          style={{ color: 'var(--rose)', borderColor: 'rgba(255,77,109,0.4)' }}
          onClick={() => {
            if (confirm('Delete all diary entries, watch lists, and settings from this account? This cannot be undone.')) {
              clearAllData()
              notify('All account data cleared')
            }
          }}
        >
          <IconTrash size={16} /> Clear all account data
        </button>
      </div>
    </div>
  )
}

function ListManager({ title, desc, items, onAdd, onRemove, placeholder, accent = 'gold' }) {
  const [text, setText] = useState('')
  const onStyle =
    accent === 'rose'
      ? { color: 'var(--rose)', borderColor: 'rgba(255,77,109,0.5)', background: 'rgba(255,77,109,0.12)' }
      : { color: 'var(--gold)', borderColor: 'rgba(245,185,66,0.5)', background: 'rgba(245,185,66,0.14)' }

  function submit(e) {
    e.preventDefault()
    onAdd(text)
    setText('')
  }

  return (
    <div className="setting-card">
      <h3>{title}</h3>
      <p className="desc">{desc}</p>
      <div className="chips" style={{ marginBottom: 16 }}>
        {items.length === 0 && <span className="dim" style={{ fontSize: 14 }}>None yet.</span>}
        {items.map((it) => (
          <span key={it} className="chip" style={{ ...onStyle, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {it}
            <button type="button" aria-label={`Remove ${it}`} onClick={() => onRemove(it)} style={{ display: 'grid', placeItems: 'center', opacity: 0.7 }}>
              <IconX size={13} />
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 10 }}>
        <input style={{ flex: 1, padding: '11px 14px' }} value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} />
        <button type="submit" className="btn btn-ghost" disabled={!text.trim()}><IconPlus size={16} /> Add</button>
      </form>
    </div>
  )
}
