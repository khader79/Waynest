import React from "react";

const AddUserDialog = ({
  onClose,
  onSubmit,
  dialogData,
  setDialogData,
}: any) => {
  return (
    <dialog id="myDialog" open>
      <h2>Add New User</h2>
      <form onSubmit={onSubmit}>
        <div>
          <label>Name:</label>
          <input
            type="text"
            name="name"
            value={dialogData.name}
            onChange={(e) =>
              setDialogData((prev: any) => ({
                ...prev,
                name: e.target.value,
              }))
            }
          />
        </div>

        <div>
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={dialogData.email}
            onChange={(e) =>
              setDialogData((prev: any) => ({
                ...prev,
                email: e.target.value,
              }))
            }
          />
        </div>

        <div>
          <label>Password:</label>
          <input
            type="password"
            name="password"
            value={dialogData.password}
            onChange={(e) =>
              setDialogData((prev: any) => ({
                ...prev,
                password: e.target.value,
              }))
            }
          />
        </div>

        <div>
          <label>Role:</label>
          <input
            type="text"
            name="role"
            value={dialogData.role}
            onChange={(e) =>
              setDialogData((prev: any) => ({
                ...prev,
                role: e.target.value,
              }))
            }
          />
        </div>

        <div>
          <label>Status:</label>
          <select
            name="status"
            value={dialogData.status}
            onChange={(e) =>
              setDialogData((prev: any) => ({
                ...prev,
                status: e.target.value,
              }))
            }
          >
            <option value="">Select</option>
            <option value="Active">Active</option>
            <option value="Banned">Banned</option>
            <option value="Pending">Pending</option>
          </select>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <button type="submit">Submit</button>
          <button
            type="button"
            onClick={onClose}
            style={{ marginLeft: "1rem" }}
          >
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
};

export default AddUserDialog;
