/** @jsx h */
import { h, Component } from 'preact'
import pull from 'pull-stream'
import Abortable from 'pull-abortable'
import { Line } from 'preact-chartjs-2'
import { nodeBandwidth, EmptyBandwidth } from './lib/stats'

export default class NodeBandwidthGraph extends Component {
  state = { bw: EmptyBandwidth, chartData: [] }

  componentWillMount () {
    const { ipfs } = this.props
    this._abortableNodeBw = Abortable()

    pull(
      nodeBandwidth(ipfs),
      this._abortableNodeBw,
      pull.drain(nextBw => {
        if (!nextBw) return

        this.setState(({ bw, chartData }) => {
          const total = parseInt(nextBw.rateIn.add(nextBw.rateOut).toFixed(0))

          // If the total didn't change, don't add another data point
          if (chartData.length && total === chartData[chartData.length - 1][1]) {
            return { bw: nextBw }
          }

          return { bw: nextBw, chartData: chartData.concat({ x: new Date(), y: total }).slice(-1000) }
        })
      })
    )
  }

  componentWillUnmount () {
    this._abortableNodeBw.abort()
  }

  render () {
    const { chartData } = this.state

    if (chartData.length < 2) {
      return <p className='sans-serif f3 ma0 pv1 ph2 tc'>Loading...</p>
    }

    const dataset = {
      label: 'Total Bandwidth',
      data: chartData,
      borderColor: '#69c4cd',
      backgroundColor: '#9ad4db'
    }

    const options = {
      responsive: true,
      tooltips: { mode: 'nearest' },
      scales: {
        xAxes: [{ type: 'time' }],
        yAxes: [{ tics: { min: 0 } }]
      },
      legend: {
        display: true,
        position: 'bottom',
        reverse: true
      }
    }

    return (
      <div>
        <Line data={{ datasets: [dataset] }} options={options} />
      </div>
    )
  }
}
