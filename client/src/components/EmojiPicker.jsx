import { Picker } from "emoji-mart";
import data from "@emoji-mart/data";
import i18n from "@emoji-mart/data/i18n/es.json";
import { useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";

// Selector de emojis (emoji-mart). Se carga con React.lazy porque pesa bastante.
// `@emoji-mart/react` todavía no soporta React 19, así que se monta el Picker a mano.
const EmojiPicker = ({ onSelect }) => {
  const { theme } = useTheme();
  const containerRef = useRef(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  useEffect(() => {
    const container = containerRef.current;

    new Picker({
      data,
      i18n,
      locale: "es",
      theme,
      parent: container,
      previewPosition: "none",
      skinTonePosition: "none",
      navPosition: "bottom",
      maxFrequentRows: 1,
      autoFocus: true,
      onEmojiSelect: (emoji) => onSelectRef.current(emoji.native)
    });

    return () => container.replaceChildren();
  }, [theme]);

  return <div ref={containerRef} className="emoji-picker" />;
};

export default EmojiPicker;
