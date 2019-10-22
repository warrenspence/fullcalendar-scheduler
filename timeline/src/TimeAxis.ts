import { DateProfile, DateMarker, wholeDivideDurations, isInt, Component, ComponentContext, startOfDay, greatestDurationDenominator, rangeContainsMarker, Duration, DateProfileGenerator, renderer, DateEnv } from '@fullcalendar/core'
import HeaderBodyLayout from './HeaderBodyLayout'
import TimelineHeader from './TimelineHeader'
import TimelineSlats from './TimelineSlats'
import { TimelineDateProfile } from './timeline-date-profile'
import TimelineNowIndicator from './TimelineNowIndicator'
import StickyScroller from './util/StickyScroller'
import EnhancedScroller from './util/EnhancedScroller'

export interface TimeAxisProps {
  tDateProfile: TimelineDateProfile
  dateProfile: DateProfile
  headerContainerEl: HTMLElement
  bodyContainerEl: HTMLElement
}

export default class TimeAxis extends Component<TimeAxisProps> {

  renderLayout = renderer(HeaderBodyLayout)
  renderHeader = renderer(TimelineHeader)
  renderSlats = renderer(TimelineSlats)
  renderNowIndicatorComponent = renderer(TimelineNowIndicator)
  buildHeadStickyScroller = renderer(buildHStickyScroller, clearHStickyScroller)
  buildBodyStickyScroller = renderer(buildHStickyScroller, clearHStickyScroller)

  // child components
  layout: HeaderBodyLayout
  header: TimelineHeader
  slats: TimelineSlats
  headStickyScroller: StickyScroller
  bodyStickyScroller: StickyScroller


  render(props: TimeAxisProps) {

    let layout = this.renderLayout(true, {
      headerContainerEl: props.headerContainerEl,
      bodyContainerEl: props.bodyContainerEl,
      verticalScroll: 'auto'
    })
    let headerEnhancedScroller = layout.headerScroller.enhancedScroller
    let bodyEnhancedScroller = layout.bodyScroller.enhancedScroller

    let header = this.renderHeader(headerEnhancedScroller.canvas.contentEl, {
      dateProfile: props.dateProfile,
      tDateProfile: props.tDateProfile
    })

    let slats = this.renderSlats(bodyEnhancedScroller.canvas.bgEl, {
      dateProfile: props.dateProfile,
      tDateProfile: props.tDateProfile
    })

    this.headStickyScroller = this.buildHeadStickyScroller(true, { enhancedScroller: headerEnhancedScroller })
    this.bodyStickyScroller = this.buildBodyStickyScroller(true, { enhancedScroller: bodyEnhancedScroller })
    this.layout = layout
    this.header = header
    this.slats = slats
  }


  // Now Indicator
  // ------------------------------------------------------------------------------------------


  getNowIndicatorUnit(dateProfile: DateProfile, dateProfileGenerator: DateProfileGenerator) {
    let { tDateProfile } = this.props

    if (tDateProfile.isTimeScale) {
      return greatestDurationDenominator(tDateProfile.slotDuration).unit
    }
  }


  // will only execute if isTimeScale
  renderNowIndicator(date) {
    if (rangeContainsMarker(this.props.tDateProfile.normalizedRange, date)) {

      let headerEnhancedScroller = this.layout.headerScroller.enhancedScroller
      let bodyEnhancedScroller = this.layout.bodyScroller.enhancedScroller

      let nowIndicator = this.renderNowIndicatorComponent(true, {
        headParent: headerEnhancedScroller.canvas.el,
        bodyParent: bodyEnhancedScroller.canvas.el
      })

      nowIndicator.updateCoord(
        this.dateToCoord(date)
      )

    } else {
      this.renderNowIndicatorComponent(false)
    }
  }


  unrenderNowIndicator() {
    this.renderNowIndicatorComponent(false)
  }


  // Sizing
  // ------------------------------------------------------------------------------------------


  updateSize(isResize, totalHeight, isAuto) {

    this.applySlotWidth(
      this.computeSlotWidth()
    )

    // adjusts gutters. do after slot widths set
    this.layout.setHeight(totalHeight, isAuto)

    // pretty much just queries coords. do last
    this.slats.updateSize()
  }


  updateStickyScrollers() {
    this.headStickyScroller.updateSize()
    this.bodyStickyScroller.updateSize()
  }


  computeSlotWidth() {
    let slotWidth = this.context.options.slotWidth || ''

    if (slotWidth === '') {
      slotWidth = this.computeDefaultSlotWidth(this.props.tDateProfile)
    }

    return slotWidth
  }


  computeDefaultSlotWidth(tDateProfile) {
    let maxInnerWidth = 0 // TODO: harness core's `matchCellWidths` for this

    this.header.innerEls.forEach(function(innerEl, i) {
      maxInnerWidth = Math.max(maxInnerWidth, innerEl.getBoundingClientRect().width)
    })

    let headingCellWidth = Math.ceil(maxInnerWidth) + 1 // assume no padding, and one pixel border

    // in TimelineView.defaults we ensured that labelInterval is an interval of slotDuration
    // TODO: rename labelDuration?
    let slotsPerLabel = wholeDivideDurations(tDateProfile.labelInterval, tDateProfile.slotDuration)

    let slotWidth = Math.ceil(headingCellWidth / slotsPerLabel)

    let minWidth: any = window.getComputedStyle(this.header.slatColEls[0]).minWidth
    if (minWidth) {
      minWidth = parseInt(minWidth, 10)
      if (minWidth) {
        slotWidth = Math.max(slotWidth, minWidth)
      }
    }

    return slotWidth
  }


  applySlotWidth(slotWidth: number | string) {
    let { layout } = this
    let { tDateProfile } = this.props
    let containerWidth: number | string = ''
    let containerMinWidth: number | string = ''
    let nonLastSlotWidth: number | string = ''

    if (slotWidth !== '') {
      slotWidth = Math.round(slotWidth as number)

      containerWidth = slotWidth * tDateProfile.slotDates.length
      containerMinWidth = ''
      nonLastSlotWidth = slotWidth

      let availableWidth = layout.bodyScroller.enhancedScroller.scroller.controller.getClientWidth()

      if (availableWidth > containerWidth) {
        containerMinWidth = availableWidth
        containerWidth = ''
        nonLastSlotWidth = Math.floor(availableWidth / tDateProfile.slotDates.length)
      }
    }

    layout.headerScroller.enhancedScroller.canvas.setWidth(containerWidth)
    layout.headerScroller.enhancedScroller.canvas.setMinWidth(containerMinWidth)
    layout.bodyScroller.enhancedScroller.canvas.setWidth(containerWidth)
    layout.bodyScroller.enhancedScroller.canvas.setMinWidth(containerMinWidth)

    if (nonLastSlotWidth !== '') {
      this.header.slatColEls.slice(0, -1).concat(
        this.slats.slatColEls.slice(0, -1)
      ).forEach(function(el) {
        el.style.width = nonLastSlotWidth + 'px'
      })
    }
  }


  // returned value is between 0 and the number of snaps
  computeDateSnapCoverage(date: DateMarker): number {
    return computeDateSnapCoverage(date, this.props.tDateProfile, this.context.dateEnv)
  }


  // for LTR, results range from 0 to width of area
  // for RTL, results range from negative width of area to 0
  dateToCoord(date) {
    let { tDateProfile } = this.props
    let snapCoverage = this.computeDateSnapCoverage(date)
    let slotCoverage = snapCoverage / tDateProfile.snapsPerSlot
    let slotIndex = Math.floor(slotCoverage)
    slotIndex = Math.min(slotIndex, tDateProfile.slotCnt - 1)
    let partial = slotCoverage - slotIndex
    let { innerCoordCache, outerCoordCache } = this.slats

    if (this.context.isRtl) {
      return (
        outerCoordCache.rights[slotIndex] -
        (innerCoordCache.getWidth(slotIndex) * partial)
      ) - outerCoordCache.originClientRect.width
    } else {
      return (
        outerCoordCache.lefts[slotIndex] +
        (innerCoordCache.getWidth(slotIndex) * partial)
      )
    }
  }


  rangeToCoords(range) {
    if (this.context.isRtl) {
      return { right: this.dateToCoord(range.start), left: this.dateToCoord(range.end) }
    } else {
      return { left: this.dateToCoord(range.start), right: this.dateToCoord(range.end) }
    }
  }


  // Scrolling
  // ------------------------------------------------------------------------------------------


  computeDateScroll(duration: Duration) {
    let { dateEnv, isRtl } = this.context
    let { dateProfile } = this.props
    let left = 0

    if (dateProfile) {
      left = this.dateToCoord(
        dateEnv.add(
          startOfDay(dateProfile.activeRange.start), // startOfDay needed?
          duration
        )
      )

      // hack to overcome the left borders of non-first slat
      if (!isRtl && left) {
        left += 1
      }
    }

    return { left }
  }


  queryDateScroll() {
    let { enhancedScroller } = this.layout.bodyScroller

    return {
      left: enhancedScroller.getScrollLeft()
    }
  }


  applyDateScroll(scroll) {
    // TODO: lame we have to update both. use the scrolljoiner instead maybe
    this.layout.bodyScroller.enhancedScroller.setScrollLeft(scroll.left || 0)
    this.layout.headerScroller.enhancedScroller.setScrollLeft(scroll.left || 0)
  }

}


function buildHStickyScroller(props: { enhancedScroller: EnhancedScroller }, context: ComponentContext) {
  return new StickyScroller(props.enhancedScroller, context.isRtl, false) // isVertical=false
}


function clearHStickyScroller(stickyScroller: StickyScroller) {
  stickyScroller.destroy()
}


// returned value is between 0 and the number of snaps
export function computeDateSnapCoverage(date: DateMarker, tDateProfile: TimelineDateProfile, dateEnv: DateEnv): number {
  let snapDiff = dateEnv.countDurationsBetween(
    tDateProfile.normalizedRange.start,
    date,
    tDateProfile.snapDuration
  )

  if (snapDiff < 0) {
    return 0
  } else if (snapDiff >= tDateProfile.snapDiffToIndex.length) {
    return tDateProfile.snapCnt
  } else {
    let snapDiffInt = Math.floor(snapDiff)
    let snapCoverage = tDateProfile.snapDiffToIndex[snapDiffInt]

    if (isInt(snapCoverage)) { // not an in-between value
      snapCoverage += snapDiff - snapDiffInt // add the remainder
    } else {
      // a fractional value, meaning the date is not visible
      // always round up in this case. works for start AND end dates in a range.
      snapCoverage = Math.ceil(snapCoverage)
    }

    return snapCoverage
  }
}
