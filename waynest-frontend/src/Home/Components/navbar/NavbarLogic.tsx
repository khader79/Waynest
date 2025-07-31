import { useState } from "react";

const NavbarLogic = () => {
  const [open, setOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const toggleOpen = () => {
    setHasInteracted(true);
    setOpen((prev) => !prev);
  };
  return { open, setOpen, hasInteracted, toggleOpen };
};

export default NavbarLogic;
