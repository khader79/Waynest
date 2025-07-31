const AddUserDialog = ({
  onClose,
  onSubmit,
  dialogData,
  setDialogData,
}: any) => (
  <dialog id="myDialog" open>
    <h2>Add New User</h2>
    <form onSubmit={onSubmit}>
      {["name", "email", "password", "role"].map((field) => (
        <div key={field}>
          <label>{field.charAt(0).toUpperCase() + field.slice(1)}:</label>
          <input
            type={field === "password" ? "password" : "text"}
            name={field}
            value={dialogData[field]}
            onChange={(e) =>
              setDialogData((prev: any) => ({
                ...prev,
                [field]: e.target.value,
              }))
            }
          />
        </div>
      ))}

      <div>
        <label>Status:</label>
        <select
          name="status"
          value={dialogData.status}
          onChange={(e) =>
            setDialogData((prev: any) => ({ ...prev, status: e.target.value }))
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
        <button type="button" onClick={onClose} style={{ marginLeft: "1rem" }}>
          Cancel
        </button>
      </div>
    </form>
  </dialog>
);

export default AddUserDialog;
