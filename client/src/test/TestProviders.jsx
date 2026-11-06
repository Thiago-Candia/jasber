import * as Tooltip from "@radix-ui/react-tooltip";
import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import { VirtuosoMockContext } from "react-virtuoso";

// Lo mínimo que necesitan los componentes de la conversación para renderizar en jsdom:
// tooltips de Radix, Motion sin animaciones y una lista virtualizada con tamaño simulado
// (jsdom no calcula alturas y Virtuoso, sin ellas, no dibuja ningún ítem).
export const TestProviders = ({ children }) => (
  <LazyMotion features={domAnimation}>
    <MotionConfig reducedMotion="always">
      <Tooltip.Provider>
        <VirtuosoMockContext.Provider value={{ viewportHeight: 800, itemHeight: 80 }}>
          {children}
        </VirtuosoMockContext.Provider>
      </Tooltip.Provider>
    </MotionConfig>
  </LazyMotion>
);
