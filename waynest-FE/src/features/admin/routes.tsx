import Layout from "../../components/layout/Layout";

const adminRoutes = [
  {
    path: "/admin-panel",

    element: <Layout role="admin" />,

    children: [],
  },
];

export default adminRoutes;
