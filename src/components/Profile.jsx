import ProfileHero from './profile/ProfileHero.jsx'
import ProfileInsights from './profile/ProfileInsights.jsx'
import ProfileDiary from './profile/ProfileDiary.jsx'
import { RecentGrid, Top20Shelf } from './profile/ProfileShelves.jsx'
import { IconCheck, IconX } from '../lib/icons.jsx'

function FollowRequests({ requests, onResolve }) {
  return (
    <section className="pf-section pf-requests">
      <div className="pf-section-head">
        <div><span>Private access</span><h2>Follow requests</h2></div>
        <strong className="pf-badge">{requests.length}</strong>
      </div>
      {requests.map((request) => (
        <div className="pf-request" key={request.uid}>
          {request.photoURL
            ? <img src={request.photoURL} alt="" referrerPolicy="no-referrer" />
            : <span className="account-initial">{(request.displayName || request.username || '?')[0].toUpperCase()}</span>}
          <span className="pf-request-copy">
            <strong>{request.displayName || request.username}</strong>
            <small>@{request.username} wants to follow you</small>
          </span>
          <span className="pf-request-actions">
            <button className="btn btn-primary" type="button" onClick={() => onResolve(request, true)}><IconCheck size={14} /> Accept</button>
            <button className="btn btn-ghost" type="button" onClick={() => onResolve(request, false)}><IconX size={14} /> Decline</button>
          </span>
        </div>
      ))}
    </section>
  )
}

// One layout serves both /profile and /@username. `owner` only adds the edit
// affordances and the private sections; everything a visitor sees, the owner
// sees in exactly the same place.
export default function Profile({
  owner = false, user, username, stats, hero, top20 = [], recent = [], diaryEntries = null,
  social, followRequests = [],
  onOpen, onFollow, onFollowers, onFollowing, onResolveRequest, onSettings, onChangeCover,
  updateAvatar, updateDisplayName, updateUsername, onUsernameChanged, notify,
}) {
  return (
    <div className="pf-page">
      <ProfileHero
        owner={owner}
        user={user}
        username={username}
        stats={stats}
        hero={hero}
        social={social}
        top20={top20}
        recent={recent}
        onFollow={onFollow}
        onFollowers={onFollowers}
        onFollowing={onFollowing}
        onSettings={onSettings}
        onChangeCover={onChangeCover}
        updateAvatar={updateAvatar}
        updateDisplayName={updateDisplayName}
        updateUsername={updateUsername}
        onUsernameChanged={onUsernameChanged}
        notify={notify}
      />

      {owner && followRequests.length > 0 && <FollowRequests requests={followRequests} onResolve={onResolveRequest} />}

      <ProfileInsights stats={stats} owner={owner} />
      <Top20Shelf entries={top20} onOpen={onOpen} owner={owner} />
      <RecentGrid entries={recent} onOpen={onOpen} owner={owner} />
      <ProfileDiary entries={diaryEntries} owner={owner} onOpen={onOpen} relationshipStatus={social?.relationshipStatus} />
    </div>
  )
}
