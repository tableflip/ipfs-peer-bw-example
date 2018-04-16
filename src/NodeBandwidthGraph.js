/** @jsx h */
import { h, Component } from 'preact'
import pull from 'pull-stream'
import Abortable from 'pull-abortable'
import { Line } from 'preact-chartjs-2'
import bytes from 'bigbytes'
import simplify from 'simplify-js'
import { nodeBandwidth, EmptyBandwidth } from './lib/stats'

export default class NodeBandwidthGraph extends Component {
  state = { bw: EmptyBandwidth, rawData: [], chartData: [] }

  static defaultProps = {
    windowSize: 1000 * 60 * 60 * 24, // Only graph up to 1 day of data
    simplifyTolerance: 5000, // Simplify 5KB variations away
    animatedPoints: 500 // Only animate for the first 500 points
  }

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
          const now = Date.now()

          chartData.push({ x: Date.now(), y: total })

          const startIndex = chartData.findIndex(d => d.x >= now - this.props.windowSize)
          if (startIndex > 0) chartData.splice(0, startIndex)

          chartData = simplify(chartData, this.props.simplifyTolerance, true)

          return { bw: nextBw, chartData }
        })
      }, err => {
        if (err) this.setState({ err })
      })
    )
  }

  componentWillUnmount () {
    this._abortableNodeBw.abort()
  }

  render () {
    const { chartData, err } = this.state

    if (err) {
      return (
        <div className='border-red bg-red-muted pa3'>
          <p className='ma0 white'>{err.message}</p>
        </div>
      )
    }

    if (!chartData.length) {
      return <p className='sans-serif f3 ma0 pv1 ph2 tc'>Loading...</p>
    }

    const dataset = {
      label: 'Total bandwidth',
      data: chartData,
      borderColor: '#69c4cd',
      backgroundColor: '#9ad4db',
      pointRadius: 2,
      cubicInterpolationMode: 'monotone'
    }

    const options = {
      responsive: true,
      tooltips: { mode: 'nearest' },
      scales: {
        xAxes: [{ type: 'time' }],
        yAxes: [{
          ticks: {
            callback: v => bytes(v, { decimalPlaces: 0 }) + '/s'
          }
        }]
      },
      legend: {
        display: true,
        position: 'bottom',
        reverse: true
      },
      animation: {
        // Only animate the 500 points
        duration: chartData.length <= this.props.animatedPoints ? 1000 : 0
      }
    }

    return (
      <div>
        <Line data={{ datasets: [dataset] }} options={options} />
      </div>
    )
  }
}
