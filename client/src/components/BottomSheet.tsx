import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import { GripHorizontal } from "lucide-react";

export type BottomSheetState = "minimized" | "medium" | "expanded";

interface BottomSheetProps {
  children: React.ReactNode;
  state: BottomSheetState;
  onStateChange: (state: BottomSheetState) => void;
}

const getSheetHeights = () => {
  if (typeof window === 'undefined') {
    return {
      minimized: 80,
      medium: 400,
      expanded: 600,
    };
  }
  return {
    minimized: 80,
    medium: window.innerHeight * 0.5,
    expanded: window.innerHeight - 60,
  };
};

export function BottomSheet({ children, state, onStateChange }: BottomSheetProps) {
  const sheetHeights = useMemo(() => getSheetHeights(), []);
  const [sheetHeight, setSheetHeight] = useState(() => sheetHeights[state]);
  const y = useMotionValue(0);

  useEffect(() => {
    const handleResize = () => {
      const newHeights = getSheetHeights();
      setSheetHeight(newHeights[state]);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [state]);

  useEffect(() => {
    const newHeights = getSheetHeights();
    setSheetHeight(newHeights[state]);
  }, [state]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    const threshold = 50;

    if (state === "expanded") {
      if (offset > threshold || velocity > 500) {
        onStateChange("medium");
      }
    } else if (state === "medium") {
      if (offset < -threshold || velocity < -500) {
        onStateChange("expanded");
      } else if (offset > threshold || velocity > 500) {
        onStateChange("minimized");
      }
    } else if (state === "minimized") {
      if (offset < -threshold || velocity < -500) {
        onStateChange("medium");
      }
    }
  };

  const backgroundColor = useTransform(
    y,
    [0, 100],
    ["hsl(var(--card))", "hsl(var(--card) / 0.9)"]
  );

  return (
    <motion.div
      data-testid="bottom-sheet"
      className="fixed bottom-0 left-0 right-0 z-[1000] flex flex-col rounded-t-2xl shadow-2xl border-t border-border overflow-hidden"
      style={{
        height: sheetHeight,
        backgroundColor,
        y,
      }}
      animate={{
        height: sheetHeight,
      }}
      transition={{
        type: "spring",
        damping: 30,
        stiffness: 300,
      }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.1}
      onDragEnd={handleDragEnd}
    >
      <div 
        className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing"
        data-testid="bottom-sheet-handle"
      >
        <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
      </div>

      <div className="flex-1 overflow-auto px-4 pb-4">
        {children}
      </div>
    </motion.div>
  );
}
