import { NavLink } from "react-router";

function NavBar() {
  const token = localStorage.getItem("token");

  return (
    <nav>
      <NavLink to="/">Home</NavLink>
      {token ? (
        <NavLink to="/dashboard">Dashboard</NavLink>
      ) : (
        <NavLink to="/login">Login</NavLink>
      )}
    </nav>
  );
}

export default NavBar;
