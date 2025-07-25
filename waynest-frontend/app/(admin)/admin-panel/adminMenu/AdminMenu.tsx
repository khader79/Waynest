"use client";

import React from "react";
import "./AdminMenu.css";
import { useOpenMenu } from "@/app/Context/openMenu";
import { IoMdClose } from "react-icons/io";
import { GiHamburgerMenu } from "react-icons/gi";

const AdminMenu = ({ className }: any) => {
  //@ts-ignore
  const { open, setOpen } = useOpenMenu();

  return (
    <div className={`${className} ${open ? "show" : "hide"}`}>
      {open ? (
        <IoMdClose
          onClick={() => {
            setOpen(false);
          }}
          className="closeBtnAdminMenu"
        />
      ) : (
        ""
      )}
    </div>
  );
};

export default AdminMenu;
