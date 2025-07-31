import { MdDashboard, MdHotel, MdFlight, MdSettings } from "react-icons/md";
import { FaMapMarkedAlt, FaUsers, FaClipboardList } from "react-icons/fa";
import { AiOutlineMessage } from "react-icons/ai";
import { BiSupport } from "react-icons/bi";
import { RiAdminFill } from "react-icons/ri";
import { Link } from "react-router-dom";
import { useOpenMenu } from "../../../Context/OpenMenu";

const AdminMenuLogic = () => {
  //@ts-ignore
  const { setOpen } = useOpenMenu();

  const menuItems = [
    {
      id: 0,
      href: "/",
      name: "Dashboard",
      icon: <MdDashboard color="var(--text-color)" />,
    },
    {
      id: 1,
      href: "/users",
      name: "Users",
      icon: <FaUsers color="var(--text-color)" />,
    },
    {
      id: 2,
      href: "/providers",
      name: "Service Providers",
      icon: <RiAdminFill color="var(--text-color)" />,
    },
    {
      id: 3,
      href: "/flights",
      name: "Flights",
      icon: <MdFlight color="var(--text-color)" />,
    },
    {
      id: 4,
      href: "/hotels",
      name: "Hotels",
      icon: <MdHotel color="var(--text-color)" />,
    },
    {
      id: 5,
      href: "/trips",
      name: "Trips",
      icon: <FaMapMarkedAlt color="var(--text-color)" />,
    },
    {
      id: 6,
      href: "/bookings",
      name: "Bookings",
      icon: <FaClipboardList color="var(--text-color)" />,
    },
    {
      id: 7,
      href: "/support",
      name: "Support",
      icon: <BiSupport color="var(--text-color)" />,
    },
    {
      id: 8,
      href: "/messages",
      name: "Messages",
      icon: <AiOutlineMessage color="var(--text-color)" />,
    },
    {
      id: 9,
      href: "/settings",
      name: "Settings",
      icon: <MdSettings color="var(--text-color)" />,
    },
  ];

  const mapItems = menuItems.map((item) => {
    return (
      <li key={item.id} onClick={() => setOpen(false)}>
        {item.icon}
        <Link to={`/admin-panel${item.href}`}>{item.name}</Link>
      </li>
    );
  });

  return { mapItems };
};

export default AdminMenuLogic;
