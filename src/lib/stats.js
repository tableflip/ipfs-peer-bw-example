import pull from 'pull-stream'
import queue from 'async.queue'
import Big from 'big.js'

export function swarmPeers (ipfs, opts) {
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

export function nodeBandwidth (ipfs, opts) {
  opts = opts || {}
  opts.interval = opts.interval || 5000

  let first = true

  const source = (end, cb) => {
    if (end) return cb(end)

    const getBandwidth = () => ipfs.stats.bw(cb)

    if (first) {
      first = false
      return getBandwidth()
    }

    setTimeout(getBandwidth, opts.interval)
  }

  return source
}

export function peerBandwidth (ipfs, opts) {
  opts = opts || {}
  opts.interval = opts.interval || 5000
  opts.concurrency = opts.concurrency || 5

  let watches = {}
  let bwData = []
  let onData

  let q = queue((id, cb) => {
    ipfs.stats.bw({ peer: id }, (err, bw) => {
      if (err) return cb(err)

      // Peer was unwatched while in queue?
      if (!watches[id]) return cb()

      bwData.push({ id, bw })

      if (onData) {
        const onDataCallback = onData
        onData = null
        onDataCallback()
      }

      // Deprioritise peers not transferring data
      const interval = bw.rateIn.eq(0) && bw.rateOut.eq(0)
        ? opts.interval * 2
        : opts.interval

      watches[id] = setTimeout(() => q.push(id), interval)
      cb()
    })
  }, opts.concurrency)

  const source = (end, cb) => {
    if (end) {
      q.kill()
      Object.keys(watches).forEach(source.unwatch)
      return cb(end)
    }

    if (bwData.length) return cb(null, bwData.shift())
    onData = () => cb(null, bwData.shift())
  }

  source.watch = id => {
    if (watches[id]) return console.warn('Already watching', id)
    watches[id] = setTimeout(() => q.push(id))
  }

  source.unwatch = id => {
    if (!watches[id]) return
    clearTimeout(watches[id])
    delete watches[id]
  }

  return source
}

export const EmptyBandwidth = Object.freeze({
  rateIn: Big(0),
  rateOut: Big(0),
  totalIn: Big(0),
  totalOut: Big(0)
})
