export const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 }
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: 0.25 }
  },
}

export const cardVariants = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4 }
  },
}

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08
    }
  },
}

export const buttonTap = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.97 },
}