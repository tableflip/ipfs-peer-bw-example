/** @jsx h */
import { h, Component } from 'preact'
import getIpfs from 'window.ipfs-fallback'
import NodeBandwidthGraph from './NodeBandwidthGraph'
import PeerBandwidthTable from './PeerBandwidthTable'

export default class App extends Component {
  componentWillMount () {
    getIpfs().then(ipfs => this.setState({ ipfs }))
  }

  render () {
    const { ipfs } = this.state
    return (
      <div className='pa3 mw8 center'>
        <div className='tc'>
          <h1 className='f2 fw6 charcoal mv1'>IPFS bandwidth</h1>
          <h2 className='f3 fw5 charcoal-muted mt1 mb4'>Total and per peer bandwidth stats</h2>
        </div>
        {ipfs ? (
          <div className='mb4'>
            <div className='mb4'>
              <NodeBandwidthGraph ipfs={ipfs} />
            </div>
            <div className='bg-white ba border-gray-muted br1 pa2' style={{ boxShadow: '0px 3px 6px 0 rgba(205,207,214,0.35)' }}>
              <PeerBandwidthTable ipfs={ipfs} />
            </div>
          </div>
        ) : (
          <p className='sans-serif f3 mt0 mb4 pv1 ph2 tc'>Loading...</p>
        )}
        <div className='bt border-gray-muted pa3'>
          <div className='fr'>
            <span className='v-mid'>made for </span>
            <img src='images/ipfs-logo.svg' width='15' className='v-mid' title='IPFS' />
            <span className='v-mid'> with ❤️</span>
          </div>
          <a className='navy-muted no-underline underline-hover' href='https://github.com/tableflip/ipfs-peer-bw-example' target='_blank'>Source on Github</a>
        </div>
      </div>
    )
  }
}
