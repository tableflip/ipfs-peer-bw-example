/** @jsx h */
import { h, Component } from 'preact'
import getIpfs from 'window.ipfs-fallback'
import pull from 'pull-stream'
import Abortable from 'pull-abortable'
import PeerBandwidthTable from './PeerBandwidthTable'
import { nodeBandwidth } from './lib/stats'

export default class App extends Component {
  componentWillMount () {
    getIpfs().then(ipfs => {
      this.setState({ ipfs })

      this._abortableNodeBw = Abortable()

      pull(
        nodeBandwidth(ipfs),
        this._abortableNodeBw,
        pull.drain(bw => this.setState({ bw }))
      )
    })
  }

  componentWillUnmount () {
    this._abortableNodeBw.abort()
  }

  render () {
    const { ipfs } = this.state

    return (
      <div className='pa3 mw8 center'>
        <div className='bg-white ba border-gray-muted br1 pa2' style={{ boxShadow: '0px 3px 6px 0 rgba(205,207,214,0.35)' }}>
          {ipfs ? <PeerBandwidthTable ipfs={ipfs} /> : null}
        </div>
      </div>
    )
  }
}
