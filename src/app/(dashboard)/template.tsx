'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

export default function DashboardTemplate({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="w-full flex-1 flex flex-col print:transform-none print:opacity-100"
    >
      {children}
    </motion.div>
  )
}
