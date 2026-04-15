import { motion, useReducedMotion } from 'framer-motion';

export function LoadingText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.span
      className={className}
      animate={prefersReducedMotion ? undefined : { opacity: [1, 0.55, 1] }}
      transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.span>
  );
}

export function LoadingScreen({
  message,
  className,
}: {
  message: React.ReactNode;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className ?? 'flex min-h-screen items-center justify-center bg-background text-muted-foreground'}
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <LoadingText>{message}</LoadingText>
    </motion.div>
  );
}
