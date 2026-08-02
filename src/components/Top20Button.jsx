import { motion } from 'framer-motion'
import { IconCrown, IconSparkle } from '../lib/icons.jsx'

// The "mystical" Top 20 toggle — only rendered (by the caller) when a title
// has been rated a full 5 stars. Springs in with a little flourish.
export default function Top20Button({ active, full = false, onToggle }) {
  const label = active ? 'In your Top 20' : full ? 'Swap into your Top 20?' : 'One for the Top 20?'
  return (
    <motion.button
      type="button"
      className={`top20-btn ${active ? 'on' : ''}`}
      onClick={onToggle}
      initial={{ opacity: 0, scale: 0.5, y: 8, rotate: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.5, y: 8 }}
      transition={{ type: 'spring', stiffness: 420, damping: 18 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.94 }}
    >
      <span className="top20-shine" aria-hidden />
      <IconCrown size={16} />
      {label}
      <IconSparkle size={14} />
    </motion.button>
  )
}
