import pull from 'pull-stream'
import many from 'pull-many'
import Abortable from 'pull-abortable'

export function swarm (ipfs, opts) {
  opts = opts || {}
  opts.interval = opts.interval || 5000

  const peers = {}
  let first = true

  const source = (end, cb) => {
    if (end) return cb(end)

    const getPeers = () => {
      ipfs.swarm.peers((err, nextPeers) => {
        if (err) {
          console.error('Failed to fetch swarm peers', err)
          return cb(null, [])
        }

        nextPeers.forEach(np => {
          np.id = np.peer.toB58String ? np.peer.toB58String() : np.peer.id.toB58String()
        })

        const added = nextPeers.filter(np => !peers[np.id])

        const removed = Object.keys(peers).filter(id => {
          return nextPeers.every(np => np.id !== id)
        })

        added.forEach(p => { peers[p.id] = p })
        removed.forEach(id => { delete peers[id] })

        const changes = added
          .map(p => ({ event: 'add', data: p }))
          .concat(removed.map(id => ({ event: 'remove', data: { id } })))

        cb(null, changes)
      })
    }

    if (first) {
      first = false
      return getPeers()
    }

    setTimeout(getPeers, opts.interval)
  }

  return pull(source, pull.flatten())
}

export function bandwidth (ipfs, opts) {
  opts = opts || {}
  opts.interval = opts.interval || 5000

  let peerIds = []
  let first = true

  const source = (end, cb) => {
    if (end) return cb(end)

    const getBandwidth = async () => {
      const ids = Array.from(peerIds)
      let results

      try {
        results = await Promise.all(ids.map(id => ipfs.stats.bw({ peer: id })))
      } catch (err) {
        return cb(err)
      }

      cb(null, results.map((bw, i) => ({ id: ids[i], bw })))
    }

    if (first) {
      first = false
      return getBandwidth()
    }

    setTimeout(getBandwidth, opts.interval)
  }

  const stream = pull(source, pull.flatten())

  stream.watch = id => peerIds.push(id)
  stream.unwatch = id => {
    peerIds = peerIds.filter(peerId => peerId !== id)
  }

  return stream
}

export function bandwidth0 (ipfs, opts) {
  const m = many()
  const abortables = {}

  function bwPullStream (peer) {
    abortables[peer] = Abortable()
    return pull(
      ipfs.stats.bwPullStream({ peer, poll: true }),
      pull.map(bw => ({ id: peer, bw })),
      abortables[peer]
    )
  }

  m.watch = peer => m.add(bwPullStream(peer))

  m.unwatch = peer => {
    if (!abortables[peer]) return
    abortables[peer].abort()
    delete abortables[peer]
  }

  return m
}
