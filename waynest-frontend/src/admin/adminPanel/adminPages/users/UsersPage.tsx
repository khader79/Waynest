import useUsersLogic from "./usersLogic";
import AddUserDialog from "./AddUserDialog";
import "./users.css";
import { IoIosAddCircle } from "react-icons/io";
import { Table } from "../../components/table/Table";
import PagesCon from "../../components/pagesContainer/PagesCon";

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
    <>
      <PagesCon header="users">
        <button onClick={addUserHandler} className="usersAddButton">
          <IoIosAddCircle />
          Add User
        </button>
        <Table headers={tableHeaderMap} data={usersMap} />
      </PagesCon>
      {showDialog && (
        <AddUserDialog
          onClose={() => setShowDialog(false)}
          onSubmit={onSubmit}
          dialogData={dialogData}
          setDialogData={setDialogData}
        />
      )}
    </>
  );
};

export default UsersPage;
