import NavBar from "../components/NavBar";

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header>
        <NavBar />
      </header>
      <main>{children}</main>
      <footer>
        <p>&copy; 2024 Finance Tracker. All rights reserved.</p>
        <h6>
          Created by{" "}
          <a
            href="https://addisonreyes.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Addison Reyes
          </a>
        </h6>
      </footer>
    </div>
  );
}

export default MainLayout;
