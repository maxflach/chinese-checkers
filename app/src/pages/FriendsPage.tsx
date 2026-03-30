import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFriends, getFriendUid } from '@/hooks/useFriends';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { useSendFriendRequest, useRespondToFriendRequest, useRemoveFriend } from '@/hooks/useFriendMutations';
import { useSearchUsers } from '@/hooks/useSearchUsers';
import { useUser } from '@/hooks/useUser';
import { Layout } from '@/components/Layout';

export function FriendsPage() {
  const { data: user } = useAuth();
  const { data: friends = [] } = useFriends(user?.uid);
  const { data: requests = [] } = useFriendRequests(user?.uid);

  // Only show incoming requests (not ones I sent)
  const incomingRequests = requests.filter((r) => r.requestedBy !== user?.uid);

  return (
    <Layout>
      <div className="p-4 space-y-6 max-w-lg mx-auto w-full">
        <SearchSection />

        {incomingRequests.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-amber-200 mb-3">Friend Requests</h2>
            <div className="space-y-2">
              {incomingRequests.map((req) => (
                <FriendRequestCard key={req.id} friendship={req} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold text-amber-200 mb-3">
            Friends {friends.length > 0 && `(${friends.length})`}
          </h2>
          {friends.length === 0 ? (
            <p className="text-amber-400 text-sm text-center py-8">
              No friends yet. Search for users to add!
            </p>
          ) : (
            <div className="space-y-2">
              {friends.map((f) => (
                <FriendCard key={f.id} friendshipId={f.id} friendUid={getFriendUid(f, user!.uid)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

function SearchSection() {
  const [query, setQuery] = useState('');
  const search = useSearchUsers();
  const sendRequest = useSendFriendRequest();

  const handleSearch = () => {
    if (query.trim().length > 0) {
      search.mutate(query.trim());
    }
  };

  return (
    <section>
      <h2 className="text-lg font-semibold text-amber-200 mb-3">Find Friends</h2>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search by email or name..."
          className="flex-1 bg-amber-900/60 text-amber-100 placeholder-amber-500 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-600"
        />
        <button
          onClick={handleSearch}
          disabled={search.isPending || query.trim().length === 0}
          className="bg-amber-700 text-amber-100 px-4 rounded-xl text-sm font-medium hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-50"
        >
          Search
        </button>
      </div>

      {search.data && (
        <div className="mt-3 space-y-2">
          {search.data.data.users.length === 0 ? (
            <p className="text-amber-400 text-sm">No users found</p>
          ) : (
            search.data.data.users.map((u) => (
              <div key={u.uid} className="bg-amber-900/60 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {u.photoURL ? (
                    <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center text-xs font-bold text-amber-100">
                      {u.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-amber-100 text-sm font-medium">{u.displayName}</p>
                    <p className="text-amber-400 text-xs">{u.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => sendRequest.mutate(u.uid)}
                  disabled={sendRequest.isPending}
                  className="text-sm bg-amber-700 text-amber-100 px-3 py-1.5 rounded-lg hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}

function FriendRequestCard({ friendship }: { friendship: { id: string; requestedBy: string } }) {
  const senderUid = friendship.requestedBy;
  const respond = useRespondToFriendRequest();

  return (
    <div className="bg-amber-900/60 rounded-xl p-3">
      <FriendRequestInner senderUid={senderUid} friendshipId={friendship.id} respond={respond} />
    </div>
  );
}

function FriendRequestInner({ senderUid, friendshipId, respond }: { senderUid: string; friendshipId: string; respond: ReturnType<typeof useRespondToFriendRequest> }) {
  const { data: sender } = useUser(senderUid);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {sender?.photoURL ? (
          <img src={sender.photoURL} alt="" className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center text-xs font-bold text-amber-100">
            {sender?.displayName?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
        <p className="text-amber-100 text-sm font-medium">{sender?.displayName || 'Loading...'}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => respond.mutate({ friendshipId, accept: true })}
          disabled={respond.isPending}
          className="text-sm bg-green-700 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 active:scale-95 transition-all disabled:opacity-50"
        >
          Accept
        </button>
        <button
          onClick={() => respond.mutate({ friendshipId, accept: false })}
          disabled={respond.isPending}
          className="text-sm bg-amber-800 text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-700 active:scale-95 transition-all disabled:opacity-50"
        >
          Decline
        </button>
      </div>
    </div>
  );
}

function FriendCard({ friendshipId, friendUid }: { friendshipId: string; friendUid: string }) {
  const { data: friend } = useUser(friendUid);
  const removeFriend = useRemoveFriend();

  return (
    <div className="bg-amber-900/60 rounded-xl p-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {friend?.photoURL ? (
          <img src={friend.photoURL} alt="" className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center text-xs font-bold text-amber-100">
            {friend?.displayName?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
        <div>
          <p className="text-amber-100 text-sm font-medium">{friend?.displayName || 'Loading...'}</p>
          <p className="text-amber-400 text-xs">{friend?.email || ''}</p>
        </div>
      </div>
      <button
        onClick={() => {
          if (confirm('Remove this friend?')) {
            removeFriend.mutate(friendshipId);
          }
        }}
        className="text-amber-500 text-xs hover:text-red-400 transition-colors"
      >
        Remove
      </button>
    </div>
  );
}
