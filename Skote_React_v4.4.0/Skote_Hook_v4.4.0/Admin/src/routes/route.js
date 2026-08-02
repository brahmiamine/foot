import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const Authmiddleware = (props) => {
  const location = useLocation();
  
  if (!localStorage.getItem("authUser")) {
    return (
      <Navigate to="/login" state={{ from: location }} replace />
    );
  }
  return (<React.Fragment>
    {props.children}
  </React.Fragment>);
};

export default Authmiddleware;
