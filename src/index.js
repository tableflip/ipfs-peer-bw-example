/** @jsx h */
import { h, render, Component } from 'preact'
import getIpfs from 'window.ipfs-fallback'
import pull from 'pull-stream'
import Abortable from 'pull-abortable'
import Big from 'big.js'
import { swarm, bandwidth } from './swarm'

const EmptyBandwidth = {
  rateIn: Big(0),
  rateOut: Big(0),
  totalIn: Big(0),
  totalOut: Big(0)
}

class App extends Component {
  constructor (props) {
    super(props)
    this.state = { peers: [], sort: { field: 'RateOut', direction: 'Desc' }, loading: true }
    this.onFieldClick = this.onFieldClick.bind(this)
  }

  async componentWillMount () {
    const ipfs = this._ipfs = await getIpfs()
    const bw = bandwidth(ipfs)
    const abortableSwarm = this._abortableSwarm = Abortable()
    const abortableBw = this._abortableBw = Abortable()

    pull(
      swarm(ipfs),
      abortableSwarm,
      pull.drain(({ event, data }) => {
        if (event === 'add') {
          // Add peer to our peers list
          this.setState(({ peers }) => ({
            peers: {
              ...peers,
              [data.id]: { id: data.id, bw: EmptyBandwidth }
            },
            loading: false
          }))
          // Start watching the peer for bandwidth changes
          bw.watch(data.id)
        } else if (event === 'remove') {
          // Remove peer from our peers list
          this.setState(({ peers }) => {
            peers = { ...peers }
            delete peers[data.id]
            return { peers }
          })
          // Stop watching the peer for bandwidth changes
          bw.unwatch(data.id)
        }
      })
    )

    pull(
      bw,
      abortableBw,
      pull.drain((res) => {
        const { id, bw } = res
        // Update the bandwidth data for this peer
        this.setState(({ peers }) => {
          peers = { ...peers }
          peers[id] = { ...peers[id], id, bw }
          return { peers }
        })
      })
    )
  }

  sortByRateInAsc (a, b) {
    if (a.bw.rateIn.gt(b.bw.rateIn)) return 1
    if (a.bw.rateIn.lt(b.bw.rateIn)) return -1
    return 0
  }

  sortByRateInDesc (a, b) {
    if (a.bw.rateIn.gt(b.bw.rateIn)) return -1
    if (a.bw.rateIn.lt(b.bw.rateIn)) return 1
    return 0
  }

  sortByRateOutAsc (a, b) {
    if (a.bw.rateOut.gt(b.bw.rateOut)) return 1
    if (a.bw.rateOut.lt(b.bw.rateOut)) return -1
    return 0
  }

  sortByRateOutDesc (a, b) {
    if (a.bw.rateOut.gt(b.bw.rateOut)) return -1
    if (a.bw.rateOut.lt(b.bw.rateOut)) return 1
    return 0
  }

  sortByTotalInAsc (a, b) {
    if (a.bw.totalIn.gt(b.bw.totalIn)) return 1
    if (a.bw.totalIn.lt(b.bw.totalIn)) return -1
    return 0
  }

  sortByTotalInDesc (a, b) {
    if (a.bw.totalIn.gt(b.bw.totalIn)) return -1
    if (a.bw.totalIn.lt(b.bw.totalIn)) return 1
    return 0
  }

  sortByTotalOutAsc (a, b) {
    if (a.bw.totalOut.gt(b.bw.totalOut)) return 1
    if (a.bw.totalOut.lt(b.bw.totalOut)) return -1
    return 0
  }

  sortByTotalOutDesc (a, b) {
    if (a.bw.totalOut.gt(b.bw.totalOut)) return -1
    if (a.bw.totalOut.lt(b.bw.totalOut)) return 1
    return 0
  }

  onFieldClick (e) {
    this.setState(({ sort }) => {
      const field = e.currentTarget.getAttribute('data-field')
      const direction = sort.field === field
        ? (sort.direction === 'Desc' ? 'Asc' : 'Desc')
        : 'Desc'
      return { sort: { field, direction } }
    })
  }

  componentWillUnmount () {
    this._abortableSwarm.abort()
    this._abortableBw.abort()
  }

  render () {
    const { peers, sort, loading } = this.state
    const sortFn = this[`sortBy${sort.field}${sort.direction}`]
    const sortedPeers = Object.values(peers).sort(sortFn)

    if (loading) {
      return <p className='sans-serif f2 ma0 pv1 ph2'>Loading...</p>
    }

    return (
      <table className='sans-serif'>
        <tr className='tl'>
          <th className='pv1 ph2'><span className='v-mid'>ID</span></th>
          <SortableTableHeader field='RateIn' label='Rate In' sort={sort} onClick={this.onFieldClick} />
          <SortableTableHeader field='RateOut' label='Rate Out' sort={sort} onClick={this.onFieldClick} />
          <SortableTableHeader field='TotalIn' label='Total In' sort={sort} onClick={this.onFieldClick} />
          <SortableTableHeader field='TotalOut' label='Total Out' sort={sort} onClick={this.onFieldClick} />
        </tr>
        {sortedPeers.map(p => (
          <tr key={p.id}>
            <td className='pv1 ph2 code'>{p.id}</td>
            <td className='pv1 ph2'>{p.bw.rateIn.toFixed(0)}</td>
            <td className='pv1 ph2'>{p.bw.rateOut.toFixed(0)}</td>
            <td className='pv1 ph2'>{p.bw.totalIn.toFixed(0)}</td>
            <td className='pv1 ph2'>{p.bw.totalOut.toFixed(0)}</td>
          </tr>
        ))}
      </table>
    )
  }
}

function SortableTableHeader ({ field, label, sort, onClick }) {
  return (
    <th className='pv1 ph2 pointer underline-hover' onClick={onClick} data-field={field}>
      <span className='v-mid'>{label}</span>
      <SortArrow field={field} sortField={sort.field} direction={sort.direction} />
    </th>
  )
}

function SortArrow ({ field, sortField, direction }) {
  if (field !== sortField) return null
  const src = `https://icon.now.sh/triangle${direction === 'Asc' ? 'Up' : 'Down'}`
  return <img src={src} className='v-mid' />
}

render(<App />, document.body)
