import useUsersLogic from "./usersLogic";
import AddUserDialog from "./AddUserDialog";
import "./users.css";
import AdminPanelMain from "../../AdminPanelMain";
import { IoIosAddCircle } from "react-icons/io";

const UsersPage = () => {
  const {
    usersMap,
    tableHeaderMap,
    addUserHandler,
    showDialog,
    setShowDialog,
    dialogData,
    setDialogData,
    onSubmit,
  } = useUsersLogic();

  return (
    <AdminPanelMain>
      <div className="usersContainer">
        <div className="usersHeader">
          <h1>Users</h1>
          <button onClick={addUserHandler}>
            <IoIosAddCircle />
            Add User
          </button>
        </div>

        <div className="tableWrapper">
          <table className="userstable">
            <thead>{tableHeaderMap}</thead>
            <tbody>{usersMap}</tbody>
          </table>
        </div>
      </div>

      {showDialog && (
        <AddUserDialog
          onClose={() => setShowDialog(false)}
          onSubmit={onSubmit}
          dialogData={dialogData}
          setDialogData={setDialogData}
        />
      )}
    </AdminPanelMain>
  );
};

export default UsersPage;
