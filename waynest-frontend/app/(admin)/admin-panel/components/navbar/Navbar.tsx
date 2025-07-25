"use client";

import React from "react";
import { useOpenMenu } from "../../../../Context/openMenu";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoMdClose } from "react-icons/io";
import "./Navbar.css";

const Navbar = ({ className }: any) => {
  //@ts-ignore
  const { open, setOpen } = useOpenMenu();

  return (
    <nav className={className}>
      {open ? (
        <IoMdClose
          onClick={() => {
            setOpen(false);
          }}
          className="closeBtnNavbar"
        />
      ) : (
        <GiHamburgerMenu
          onClick={() => {
            setOpen(true);
          }}
          className="hamburgerMenu"
        />
      )}
    </nav>
  );
};

export default Navbar;
