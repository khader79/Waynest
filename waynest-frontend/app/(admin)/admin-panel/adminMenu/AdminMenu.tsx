"use client";

import React from "react";
import "./AdminMenu.css";
import { useOpenMenu } from "@/app/Context/openMenu";
import { IoMdClose } from "react-icons/io";
import { GiHamburgerMenu } from "react-icons/gi";
import AdminMenuLogic from "./AdminMenuLogic";

const AdminMenu = ({ className }: any) => {
  //@ts-ignore
  const { open, setOpen } = useOpenMenu();
  const { mapItems } = AdminMenuLogic();

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

      <ul className="items">{mapItems}</ul>
    </div>
  );
};

export default AdminMenu;
