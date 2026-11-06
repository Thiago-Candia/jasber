import { assetUrl } from "../utils/assets";
import { initials } from "../utils/format";

const Avatar = ({ name, src, size = "md", shape = "round", decorative = true }) => {
  const url = src?.startsWith("blob:") ? src : assetUrl(src);
  const className = `avatar avatar--${size} avatar--${shape}`;

  if (url) {
    return <img className={className} src={url} alt={decorative ? "" : name} />;
  }

  return (
    <span className={`${className} avatar--initials`} aria-hidden={decorative || undefined} role={decorative ? undefined : "img"} aria-label={decorative ? undefined : name}>
      {initials(name)}
    </span>
  );
};

export default Avatar;
