/** @jsx h */
import { h, Component } from 'preact'
import pull from 'pull-stream'
import Abortable from 'pull-abortable'
import Big from 'big.js'
import { swarmPeers, peerBandwidth } from './lib/stats'

const EmptyBandwidth = {
  rateIn: Big(0),
  rateOut: Big(0),
  totalIn: Big(0),
  totalOut: Big(0)
}

export default class PeerBandwidthTable extends Component {
  constructor (props) {
    super(props)
    this.state = { peers: {}, sort: { field: 'rateOut', direction: -1 }, loading: true }
    this.onFieldClick = this.onFieldClick.bind(this)
  }

  componentWillMount () {
    const { ipfs } = this.props
    const peers = {}
    const peerBw = peerBandwidth(ipfs)

    this._abortableSwarmPeers = Abortable()
    this._abortablePeerBw = Abortable()

    pull(
      swarmPeers(ipfs),
      this._abortableSwarmPeers,
      pull.drain(({ event, data }) => {
        if (event === 'add') {
          peers[data.id] = { id: data.id, bw: EmptyBandwidth }
          peerBw.watch(data.id)
        } else if (event === 'remove') {
          delete peers[data.id]
          peerBw.unwatch(data.id)
        }
      })
    )

    pull(
      peerBw,
      this._abortablePeerBw,
      pull.drain(({ id, bw }) => { peers[id] = { id, bw } })
    )

    const updatePeerState = () => this.setState({ peers: { ...peers }, loading: false })
    this._interval = setInterval(updatePeerState, this.props.refreshRate || 2000)
  }

  getSorter ({ field, direction }) {
    return (a, b) => {
      if (a.bw[field].gt(b.bw[field])) return direction
      if (a.bw[field].lt(b.bw[field])) return -direction
      return 0
    }
  }

  onFieldClick (e) {
    this.setState(({ sort }) => {
      const field = e.currentTarget.getAttribute('data-field')
      const direction = sort.field === field ? -sort.direction : -1
      return { sort: { field, direction } }
    })
  }

  componentWillUnmount () {
    clearInterval(this._interval)
    this._abortableSwarmPeers.abort()
    this._abortablePeerBw.abort()
  }

  render () {
    const { peers, sort, loading } = this.state
    const sortedPeers = Object.values(peers).sort(this.getSorter(sort))

    return loading ? (
      <p className='sans-serif f3 ma0 pv1 ph2 tc'>Loading...</p>
    ) : (
      <table className='collapse'>
        <tr className='tl'>
          <th className='pv2 ph3 w-100'><span className='v-mid'>Peer</span></th>
          <SortableTableHeader field='rateIn' label='Rate In' sort={sort} onClick={this.onFieldClick} />
          <SortableTableHeader field='rateOut' label='Rate Out' sort={sort} onClick={this.onFieldClick} />
          <SortableTableHeader field='totalIn' label='Total In' sort={sort} onClick={this.onFieldClick} />
          <SortableTableHeader field='totalOut' label='Total Out' sort={sort} onClick={this.onFieldClick} />
        </tr>
        {sortedPeers.map((p, i) => (
          <tr key={p.id} className={i % 2 ? 'bg-snow-muted' : ''}>
            <td className='pv2 ph3 monospace'>{p.id}</td>
            <td className='pv2 ph3'>{p.bw.rateIn.toFixed(0)}</td>
            <td className='pv2 ph3'>{p.bw.rateOut.toFixed(0)}</td>
            <td className='pv2 ph3'>{p.bw.totalIn.toFixed(0)}</td>
            <td className='pv2 ph3'>{p.bw.totalOut.toFixed(0)}</td>
          </tr>
        ))}
      </table>
    )
  }
}

function SortableTableHeader ({ field, label, sort, onClick }) {
  return (
    <th className='pv2 ph3 pointer underline-hover nowrap' onClick={onClick} data-field={field}>
      <span className='v-mid'>{label}</span>
      <SortArrow field={field} sortField={sort.field} direction={sort.direction} />
    </th>
  )
}

function SortArrow ({ field, sortField, direction }) {
  if (field !== sortField) return null
  const src = `https://icon.now.sh/triangle${direction === 1 ? 'Up' : 'Down'}`
  return <img src={src} className='v-mid' />
}
