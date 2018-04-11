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
    this.state = { peers: [], sort: { field: 'rateOut', direction: -1 }, loading: true }
    this.onFieldClick = this.onFieldClick.bind(this)
  }

  async componentWillMount () {
    const ipfs = this._ipfs = await getIpfs()
    const bw = bandwidth(ipfs)
    const abortableSwarm = this._abortableSwarm = Abortable()
    const abortableBw = this._abortableBw = Abortable()
    const peers = {}

    pull(
      swarm(ipfs),
      abortableSwarm,
      pull.drain(({ event, data }) => {
        if (event === 'add') {
          peers[data.id] = { id: data.id, bw: EmptyBandwidth }
          bw.watch(data.id)
        } else if (event === 'remove') {
          delete peers[data.id]
          bw.unwatch(data.id)
        }
      })
    )

    pull(
      bw,
      abortableBw,
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
    this._abortableSwarm.abort()
    this._abortableBw.abort()
  }

  render () {
    const { peers, sort, loading } = this.state
    const sortedPeers = Object.values(peers).sort(this.getSorter(sort))

    if (loading) {
      return <p className='sans-serif f2 ma0 pv1 ph2'>Loading...</p>
    }

    return (
      <table className='sans-serif'>
        <tr className='tl'>
          <th className='pv1 ph2'><span className='v-mid'>ID</span></th>
          <SortableTableHeader field='rateIn' label='Rate In' sort={sort} onClick={this.onFieldClick} />
          <SortableTableHeader field='rateOut' label='Rate Out' sort={sort} onClick={this.onFieldClick} />
          <SortableTableHeader field='totalIn' label='Total In' sort={sort} onClick={this.onFieldClick} />
          <SortableTableHeader field='totalOut' label='Total Out' sort={sort} onClick={this.onFieldClick} />
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
  const src = `https://icon.now.sh/triangle${direction === 1 ? 'Up' : 'Down'}`
  return <img src={src} className='v-mid' />
}

render(<App />, document.body)
