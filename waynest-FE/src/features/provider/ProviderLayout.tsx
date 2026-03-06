import { useState } from "react";
import { Outlet } from "react-router-dom";
import Layout from "../../components/layout/Layout";
import "./ProviderLayout.css";

const ProviderLayout = () => {
  return <Layout role="provider" />;
};

export default ProviderLayout;