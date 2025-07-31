import axios from "axios";
import { useEffect, useState } from "react";
import { MdDelete } from "react-icons/md";

const useUsersLogic = () => {
  const [users, setUsers] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogData, setDialogData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    status: "",
  });

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await axios.get("http://localhost:3001/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const addUserHandler = () => setShowDialog(true);

  const onSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const newUser = { ...dialogData };

      await axios.post("http://localhost:3001/auth/check-email", {
        email: newUser.email,
      });

      await axios.post("http://localhost:3001/users", newUser, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await fetchUsers();
      setShowDialog(false);
      setDialogData({
        name: "",
        email: "",
        password: "",
        role: "",
        status: "",
      });
    } catch (err: any) {
      if (err.response?.status === 409) alert(err.response.data.message);
      else alert("Something went wrong. Please try again.");
    }
  };

  const deleteUserHandler = async (id: number) => {
    await axios.delete(`http://localhost:3001/users/${id}`);
    fetchUsers();
  };

  const tableHeaders = ["Name", "Email", "Role", "Status", "Actions"];
  const tableHeaderMap = (
    <tr>
      {tableHeaders.map((h, i) => (
        <th key={i}>{h}</th>
      ))}
    </tr>
  );
  const usersMap = users.map((user: any) => (
    <tr key={user.userid}>
      <td>{user.name}</td>
      <td>{user.email}</td>
      <td>{user.role}</td>
      <td className={user.status}>{user.status}</td>
      <td>
        <MdDelete onClick={() => deleteUserHandler(user.userid)} />
      </td>
    </tr>
  ));

  return {
    usersMap,
    tableHeaderMap,
    addUserHandler,
    showDialog,
    setShowDialog,
    dialogData,
    setDialogData,
    onSubmit,
  };
};

export default useUsersLogic;
