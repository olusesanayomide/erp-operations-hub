import { cn } from "@/shared/lib/utils";
import { motion, useReducedMotion } from 'framer-motion';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={cn("rounded-md bg-muted", className)}
      initial={prefersReducedMotion ? false : { opacity: 0.4 }}
      animate={prefersReducedMotion ? undefined : { opacity: [0.45, 0.95, 0.45] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      {...props}
    />
  );
}

export { Skeleton };
