import { useOpenMenu } from "../../../../Context/OpenMenu";
import { GiHamburgerMenu } from "react-icons/gi";
import "./Navbar.css";

const Navbar = ({ className }: any) => {
  //@ts-ignore
  const { open, setOpen } = useOpenMenu();

  return (
    <nav className={` ${className} ${open ? "borderNone" : ""}`}>
      <div className="navBarLeft">
        <GiHamburgerMenu
          onClick={() => {
            const newState = !open;
            setOpen(newState);
            localStorage.setItem("openMenu", String(newState));
          }}
          className="hamburgerMenu"
        />
        <h1>Waynest</h1>
      </div>
    </nav>
  );
};

export default Navbar;
