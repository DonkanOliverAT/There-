import { describe, expect, it } from 'vitest'
import { detectStopGesture } from './handDetection'

describe('detectStopGesture', () => {
  it('detecta la señal de stop cuando la palma es plana y el pulgar está cerca de la palma', () => {
    const stopLandmarks = [
      { x: 0.5, y: 0.7 },
      { x: 0.42, y: 0.45 },
      { x: 0.35, y: 0.25 },
      { x: 0.36, y: 0.18 },
      { x: 0.38, y: 0.14 },
      { x: 0.5, y: 0.34 },
      { x: 0.48, y: 0.2 },
      { x: 0.46, y: 0.12 },
      { x: 0.44, y: 0.08 },
      { x: 0.56, y: 0.32 },
      { x: 0.58, y: 0.19 },
      { x: 0.6, y: 0.1 },
      { x: 0.62, y: 0.07 },
      { x: 0.64, y: 0.12 },
      { x: 0.7, y: 0.37 },
      { x: 0.72, y: 0.22 },
      { x: 0.74, y: 0.12 },
      { x: 0.75, y: 0.08 },
      { x: 0.81, y: 0.39 },
      { x: 0.83, y: 0.22 },
      { x: 0.85, y: 0.12 },
      { x: 0.86, y: 0.08 },
    ]

    expect(detectStopGesture(stopLandmarks)).toBe(true)
  })

  it('no detecta stop cuando la mano está cerrada o relajada', () => {
    const relaxedLandmarks = [
      { x: 0.5, y: 0.7 },
      { x: 0.5, y: 0.55 },
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: 0.46 },
      { x: 0.5, y: 0.42 },
      { x: 0.48, y: 0.6 },
      { x: 0.47, y: 0.63 },
      { x: 0.46, y: 0.68 },
      { x: 0.45, y: 0.72 },
      { x: 0.56, y: 0.6 },
      { x: 0.57, y: 0.64 },
      { x: 0.58, y: 0.68 },
      { x: 0.6, y: 0.72 },
      { x: 0.62, y: 0.74 },
      { x: 0.64, y: 0.58 },
      { x: 0.66, y: 0.61 },
      { x: 0.68, y: 0.66 },
      { x: 0.7, y: 0.7 },
      { x: 0.76, y: 0.58 },
      { x: 0.78, y: 0.6 },
      { x: 0.8, y: 0.64 },
      { x: 0.82, y: 0.68 },
    ]

    expect(detectStopGesture(relaxedLandmarks)).toBe(false)
  })
})
