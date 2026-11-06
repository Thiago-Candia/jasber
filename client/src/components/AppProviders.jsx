import * as Tooltip from "@radix-ui/react-tooltip";
import { LazyMotion, MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import { useTheme } from "../context/ThemeContext";

const loadMotionFeatures = () => import("../utils/motionFeatures").then((module) => module.default);

// Proveedores globales de interacción: animaciones (respetan prefers-reduced-motion),
// tooltips accesibles y avisos efímeros (toasts).
const AppProviders = ({ children }) => {
  const { theme } = useTheme();

  return (
    <LazyMotion features={loadMotionFeatures}>
      <MotionConfig reducedMotion="user">
        <Tooltip.Provider delayDuration={300} skipDelayDuration={150}>
          {children}
        </Tooltip.Provider>
        <Toaster theme={theme} position="bottom-right" closeButton />
      </MotionConfig>
    </LazyMotion>
  );
};

export default AppProviders;
