"use client";

import React from "react";
import usersLogic from "./usersLogic";
import "./users.css";
import AddUserDialog from "./AddUserDialog";

const Page = () => {
  const {
    usersMap,
    tableHeaderMap,
    addUserHandler,
    showDialog,
    setShowDialog,
    onSubmit,
    dialogData,
    setDialogData,
  } = usersLogic();

  return (
    <>
      <div className="usersContainer">
        <h1>Users</h1>
        <button onClick={addUserHandler}>Add User</button>
        <table className="userstable">
          <thead>{tableHeaderMap}</thead>

          <tbody>{usersMap}</tbody>
        </table>
      </div>

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

export default Page;
