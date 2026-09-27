export function detectStopGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return false

  const [
    wrist,
    thumbCmc,
    thumbMcp,
    thumbIp,
    thumbTip,
    indexMcp,
    indexPip,
    indexDip,
    indexTip,
    middleMcp,
    middlePip,
    middleDip,
    middleTip,
    ringMcp,
    ringPip,
    ringDip,
    ringTip,
    pinkyMcp,
    pinkyPip,
    pinkyDip,
    pinkyTip,
  ] = landmarks

  if (!wrist || !thumbTip || !indexTip || !middleTip || !ringTip || !pinkyTip) return false

  const fingerTips = [indexTip, middleTip, ringTip, pinkyTip]
  const fingerBases = [indexMcp, middleMcp, ringMcp, pinkyMcp]

  const extendedCount = fingerTips.filter((tip, index) => {
    const base = fingerBases[index]
    if (!tip || !base) return false

    return tip.y < base.y + 0.12
  }).length

  const tipsY = fingerTips.map((tip) => tip.y)
  const avgTipY = tipsY.reduce((sum, y) => sum + y, 0) / tipsY.length
  const tipSpread = Math.max(...tipsY) - Math.min(...tipsY)
  const baseY = fingerBases.reduce((sum, p) => sum + p.y, 0) / fingerBases.length
  const palmFlat = tipSpread < 0.18 && avgTipY < baseY - 0.04

  const thumbDistanceToPalm = Math.hypot(
    thumbTip.x - indexMcp.x,
    thumbTip.y - indexMcp.y,
  )
  const thumbNearPalm = thumbDistanceToPalm < 0.28 || Math.hypot(
    thumbTip.x - wrist.x,
    thumbTip.y - wrist.y,
  ) < 0.35

  return extendedCount >= 3 && palmFlat && thumbNearPalm
}
