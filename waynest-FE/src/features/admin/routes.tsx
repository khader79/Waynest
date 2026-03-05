import Layout from "../../components/layout/Layout";

const adminRoutes = [
  {
    path: "/admin-panel",

    element: <Layout role="user" />,

    children: [],
  },
];

export default adminRoutes;
