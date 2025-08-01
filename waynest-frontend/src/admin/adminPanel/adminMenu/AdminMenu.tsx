import "./AdminMenu.css";
import { useOpenMenu } from "../../../Context/OpenMenu";
import { IoMdClose } from "react-icons/io";

import AdminMenuLogic from "./AdminMenuLogic";

const AdminMenu = ({ className }: any) => {
  //@ts-ignore
  const { open, setOpen } = useOpenMenu();
  const { mapItems } = AdminMenuLogic();

  return (
    <>
      <div className={`${className} ${open ? "show" : "hide"}`}>
        {open && (
          <>
            <IoMdClose
              onClick={() => {
                setOpen(false);
                localStorage.setItem("openMenu", "false");
              }}
              className="closeBtnAdminMenu"
            />
          </>
        )}

        <ul className="items">{mapItems}</ul>
      </div>

      <div
        className={`adminMenuOverlay ${open ? "show" : "hide"}`}
        onClick={() => {
          setOpen(false);
          localStorage.setItem("openMenu", "false");
        }}
      />
    </>
  );
};

export default AdminMenu;
