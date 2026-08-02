import { useEffect } from 'react'
import { animate, useMotionValue, useTransform, motion } from 'framer-motion'

// Springy count-up number. Respects decimals.
export default function AnimatedNumber({ value = 0, decimals = 0, duration = 1.1, trim = false }) {
  const mv = useMotionValue(0)
  const rounded = useTransform(mv, (v) =>
    decimals
      ? (trim ? v.toFixed(decimals).replace(/\.0+$/, '') : v.toFixed(decimals))
      : Math.round(v).toLocaleString(),
  )

  useEffect(() => {
    const controls = animate(mv, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    })
    return controls.stop
  }, [value, duration, mv])

  return <motion.span>{rounded}</motion.span>
}
